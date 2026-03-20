import json
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Execution, StepLog, Workflow
from schemas import ExecutionCreate, SimulateRequest
from services.execution_engine import run_execution, retry_execution, resume_execution
from services.rule_engine import evaluate_rules
from utils.json_field import parse_json_field, dump_json_field

router = APIRouter(tags=["Executions"])


def _serialize_log(log: StepLog) -> dict:
    return {
        "id":                 log.id,
        "execution_id":       log.execution_id,
        "step_id":            log.step_id,
        "step_name":          log.step_name,
        "step_type":          log.step_type,
        "evaluated_rules":    parse_json_field(log.evaluated_rules) if log.evaluated_rules else [],
        "selected_next_step": log.selected_next_step,
        "status":             log.status,
        "error_message":      log.error_message,
        "started_at":         log.started_at.isoformat() if log.started_at else None,
        "ended_at":           log.ended_at.isoformat() if log.ended_at else None,
    }


def _serialize_execution(ex: Execution, include_logs: bool = False) -> dict:
    result = {
        "id":               ex.id,
        "workflow_id":      ex.workflow_id,
        "workflow_version": ex.workflow_version,
        "status":           ex.status,
        "data":             parse_json_field(ex.data),
        "current_step_id":  ex.current_step_id,
        "retries":          ex.retries,
        "triggered_by":     ex.triggered_by,
        "started_at":       ex.started_at.isoformat() if ex.started_at else None,
        "ended_at":         ex.ended_at.isoformat() if ex.ended_at else None,
    }
    if include_logs:
        result["step_logs"] = [_serialize_log(l) for l in ex.step_logs]
    return result


# ── Start execution ───────────────────────────────────────────────────────────

@router.post("/workflows/{workflow_id}/execute", status_code=201)
def start_execution(
    workflow_id: str,
    body: ExecutionCreate,
    db: Session = Depends(get_db),
):
    wf = db.query(Workflow).filter_by(id=workflow_id, is_active=True).first()
    if not wf:
        raise HTTPException(404, "Workflow not found or inactive")

    if not wf.start_step_id:
        raise HTTPException(400, "Workflow has no start step defined")

    # validate input against input_schema
    schema = parse_json_field(wf.input_schema)
    errors = _validate_input(body.data, schema)
    if errors:
        raise HTTPException(422, {"message": "Input validation failed", "errors": errors})

    execution = Execution(
        id               = str(uuid.uuid4()),
        workflow_id      = workflow_id,
        workflow_version = wf.version,
        status           = "pending",
        data             = dump_json_field(body.data),
        current_step_id  = wf.start_step_id,
        triggered_by     = body.triggered_by or "user",
        started_at       = datetime.utcnow(),
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    # run the execution (synchronous for simplicity — add background tasks for production)
    run_execution(execution.id, db)
    db.refresh(execution)

    return _serialize_execution(execution, include_logs=True)


# ── Get execution status ──────────────────────────────────────────────────────

@router.get("/executions/{execution_id}")
def get_execution(execution_id: str, db: Session = Depends(get_db)):
    ex = db.query(Execution).filter_by(id=execution_id).first()
    if not ex:
        raise HTTPException(404, "Execution not found")
    return _serialize_execution(ex, include_logs=True)


# ── List all executions (audit log) ──────────────────────────────────────────

@router.get("/executions")
def list_executions(
    workflow_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Execution)
    if workflow_id:
        q = q.filter(Execution.workflow_id == workflow_id)
    if status:
        q = q.filter(Execution.status == status)
    total = q.count()
    items = q.order_by(Execution.started_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "page":  page,
        "items": [_serialize_execution(e) for e in items],
    }


# ── Cancel execution ──────────────────────────────────────────────────────────

@router.post("/executions/{execution_id}/cancel")
def cancel_execution(execution_id: str, db: Session = Depends(get_db)):
    ex = db.query(Execution).filter_by(id=execution_id).first()
    if not ex:
        raise HTTPException(404, "Execution not found")
    if ex.status not in ("pending", "in_progress"):
        raise HTTPException(400, f"Cannot cancel execution in '{ex.status}' status")

    ex.status   = "canceled"
    ex.ended_at = datetime.utcnow()
    db.commit()
    return _serialize_execution(ex)


# ── Retry failed execution ────────────────────────────────────────────────────

@router.post("/executions/{execution_id}/retry")
def retry_failed(execution_id: str, db: Session = Depends(get_db)):
    ex = db.query(Execution).filter_by(id=execution_id).first()
    if not ex:
        raise HTTPException(404, "Execution not found")
    if ex.status != "failed":
        raise HTTPException(400, "Only failed executions can be retried")

    retry_execution(execution_id, db)
    db.refresh(ex)
    return _serialize_execution(ex, include_logs=True)


# ── Approve an approval step ──────────────────────────────────────────────────

@router.post("/executions/{execution_id}/approve")
def approve_step(execution_id: str, db: Session = Depends(get_db)):
    ex = db.query(Execution).filter_by(id=execution_id).first()
    if not ex:
        raise HTTPException(404, "Execution not found")
    if ex.status != "pending":
        raise HTTPException(400, "Execution is not waiting for approval")

    resume_execution(execution_id, db)
    db.refresh(ex)
    return _serialize_execution(ex, include_logs=True)


# ── Rule sandbox (simulate without creating an execution) ─────────────────────

@router.post("/simulate")
def simulate_rules(body: SimulateRequest):
    """
    Test rules against sample input data without creating any execution.
    Calls the rule engine directly — no DB needed.
    """
    # Convert dict rules to simple objects the engine can handle
    class RuleObj:
        def __init__(self, d):
            self.condition    = d.get("condition", "")
            self.next_step_id = d.get("next_step_id")
            self.priority     = d.get("priority", 99)

    rule_objs = [RuleObj(r) for r in body.rules]
    result    = evaluate_rules(rule_objs, body.input_data)

    matched = result["matched_rule"]
    return {
        "has_match":      result["has_match"],
        "matched_rule":   {"condition": matched.condition, "next_step_id": matched.next_step_id,
                           "priority": matched.priority} if matched else None,
        "next_step_id":   result["next_step_id"],
        "evaluation_log": result["evaluation_log"],
    }


# ── Input validation helper ───────────────────────────────────────────────────

def _validate_input(data: dict, schema: dict) -> list:
    """Validate input data against workflow input_schema. Returns list of error strings."""
    errors = []
    for field, rules in schema.items():
        if not isinstance(rules, dict):
            continue

        required = rules.get("required", False)
        if required and field not in data:
            errors.append(f"Required field '{field}' is missing")
            continue

        if field not in data:
            continue

        val = data[field]

        # type check
        expected_type = rules.get("type")
        if expected_type:
            type_map = {"string": str, "number": (int, float), "boolean": bool}
            if expected_type in type_map and not isinstance(val, type_map[expected_type]):
                errors.append(f"Field '{field}' must be of type {expected_type}")

        # allowed values check
        allowed = rules.get("allowed_values")
        if allowed and val not in allowed:
            errors.append(f"Field '{field}' must be one of {allowed}, got '{val}'")

    return errors
