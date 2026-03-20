import json
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Workflow, Step, Rule
from schemas import WorkflowCreate, WorkflowUpdate, WorkflowResponse
from utils.json_field import parse_json_field, dump_json_field

router = APIRouter(prefix="/workflows", tags=["Workflows"])


def _serialize_workflow(wf: Workflow) -> dict:
    return {
        "id":            wf.id,
        "name":          wf.name,
        "description":   wf.description,
        "version":       wf.version,
        "is_active":     wf.is_active,
        "input_schema":  parse_json_field(wf.input_schema),
        "start_step_id": wf.start_step_id,
        "created_at":    wf.created_at.isoformat() if wf.created_at else None,
        "updated_at":    wf.updated_at.isoformat() if wf.updated_at else None,
    }


@router.post("", status_code=201)
def create_workflow(body: WorkflowCreate, db: Session = Depends(get_db)):
    wf = Workflow(
        id           = str(uuid.uuid4()),
        name         = body.name,
        description  = body.description,
        input_schema = dump_json_field(body.input_schema or {}),
        version      = 1,
        is_active    = True,
        start_step_id = body.start_step_id,
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return _serialize_workflow(wf)


@router.get("")
def list_workflows(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Workflow)
    if search:
        q = q.filter(Workflow.name.contains(search))
    total = q.count()
    items = q.order_by(Workflow.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "page":  page,
        "limit": limit,
        "items": [_serialize_workflow(w) for w in items],
    }


@router.get("/{workflow_id}")
def get_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter_by(id=workflow_id).first()
    if not wf:
        raise HTTPException(404, "Workflow not found")

    steps = db.query(Step).filter_by(workflow_id=workflow_id).order_by(Step.order).all()
    steps_data = []
    for s in steps:
        rules = db.query(Rule).filter_by(step_id=s.id).order_by(Rule.priority).all()
        steps_data.append({
            "id":             s.id,
            "workflow_id":    s.workflow_id,
            "name":           s.name,
            "step_type":      s.step_type,
            "order":          s.order,
            "metadata":       parse_json_field(s.metadata_json),
            "max_iterations": s.max_iterations,
            "rules": [
                {
                    "id":           r.id,
                    "step_id":      r.step_id,
                    "condition":    r.condition,
                    "next_step_id": r.next_step_id,
                    "priority":     r.priority,
                    "created_at":   r.created_at.isoformat() if r.created_at else None,
                    "updated_at":   r.updated_at.isoformat() if r.updated_at else None,
                }
                for r in rules
            ],
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        })

    result = _serialize_workflow(wf)
    result["steps"] = steps_data
    return result


@router.put("/{workflow_id}")
def update_workflow(workflow_id: str, body: WorkflowUpdate, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter_by(id=workflow_id).first()
    if not wf:
        raise HTTPException(404, "Workflow not found")

    if body.name is not None:
        wf.name = body.name
    if body.description is not None:
        wf.description = body.description
    if body.input_schema is not None:
        wf.input_schema = dump_json_field(body.input_schema)
    if body.start_step_id is not None:
        wf.start_step_id = body.start_step_id

    wf.version    += 1
    wf.updated_at  = datetime.utcnow()
    db.commit()
    db.refresh(wf)
    return _serialize_workflow(wf)


@router.delete("/{workflow_id}", status_code=204)
def delete_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter_by(id=workflow_id).first()
    if not wf:
        raise HTTPException(404, "Workflow not found")
    db.delete(wf)
    db.commit()
