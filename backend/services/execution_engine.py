"""
Execution Engine — manages the lifecycle of a single workflow execution.

State machine transitions:
  pending → in_progress → completed
                        → failed
                        → canceled (external signal between steps)
  in_progress → pending  (when an approval step is reached — waits for human action)

Key design decisions:
  - Approval steps PAUSE execution and return. Resume via POST /executions/:id/approve
  - Loop guard: tracks how many times each step is visited; fails if max_iterations exceeded
  - Cancellation is checked between every step (not mid-step)
  - All step outcomes are written to step_logs before advancing
"""

import json
import uuid
from datetime import datetime

from models import Execution, Step, Rule, StepLog
from services.rule_engine import evaluate_rules


def run_execution(execution_id: str, db) -> None:
    """
    Main execution loop. Called after creating the execution record.
    Runs synchronously — for production you'd offload to a background task.
    """
    execution = db.query(Execution).filter_by(id=execution_id).first()
    if not execution:
        return

    input_data = json.loads(execution.data or "{}")

    execution.status = "in_progress"
    db.commit()

    current_step_id = execution.current_step_id
    visited: dict[str, int] = {}   # step_id → visit count, for loop guard

    while current_step_id:
        # ── loop guard ────────────────────────────────────────────────────────
        visited[current_step_id] = visited.get(current_step_id, 0) + 1
        step = db.query(Step).filter_by(id=current_step_id).first()

        if not step:
            _fail_execution(execution, current_step_id,
                            f"Step '{current_step_id}' not found", db)
            return

        max_iter = step.max_iterations or 10
        if visited[current_step_id] > max_iter:
            _fail_execution(execution, current_step_id,
                            f"Max iterations ({max_iter}) reached on step '{step.name}'", db)
            return

        # ── cancellation check between steps ─────────────────────────────────
        db.refresh(execution)
        if execution.status == "canceled":
            return

        # ── load and evaluate rules ───────────────────────────────────────────
        rules = db.query(Rule).filter_by(step_id=current_step_id).all()

        step_started = datetime.utcnow()
        result = evaluate_rules(rules, input_data)

        # ── write step log ────────────────────────────────────────────────────
        log = StepLog(
            id                 = str(uuid.uuid4()),
            execution_id       = execution.id,
            step_id            = current_step_id,
            step_name          = step.name,
            step_type          = step.step_type,
            evaluated_rules    = json.dumps(result["evaluation_log"]),
            selected_next_step = result["next_step_id"],
            status             = "completed" if result["has_match"] else "failed",
            error_message      = None if result["has_match"] else "No rule matched",
            started_at         = step_started,
            ended_at           = datetime.utcnow(),
        )
        db.add(log)

        if not result["has_match"]:
            _fail_execution(execution, current_step_id, "No matching rule found", db)
            return

        # advance execution pointer
        execution.current_step_id = result["next_step_id"]
        db.commit()

        # ── approval step pauses execution ────────────────────────────────────
        if step.step_type == "approval":
            execution.status = "pending"
            db.commit()
            return   # caller must POST /executions/:id/approve to resume

        current_step_id = result["next_step_id"]

    # ── reached null next_step_id — workflow complete ─────────────────────────
    execution.status   = "completed"
    execution.ended_at = datetime.utcnow()
    db.commit()


def resume_execution(execution_id: str, db) -> None:
    """
    Resume a paused execution after an approval step was approved.
    Picks up from current_step_id (already advanced past the approval step).
    """
    execution = db.query(Execution).filter_by(id=execution_id).first()
    if not execution or execution.status not in ("pending",):
        return
    run_execution(execution_id, db)


def retry_execution(execution_id: str, db) -> None:
    """
    Retry a failed execution. Re-runs only from current_step_id (the failed step).
    Does not restart the entire workflow.
    """
    execution = db.query(Execution).filter_by(id=execution_id).first()
    if not execution or execution.status != "failed":
        return

    execution.status  = "in_progress"
    execution.retries = (execution.retries or 0) + 1
    db.commit()

    run_execution(execution_id, db)


# ── helpers ───────────────────────────────────────────────────────────────────

def _fail_execution(execution: Execution, step_id: str, reason: str, db) -> None:
    execution.status          = "failed"
    execution.ended_at        = datetime.utcnow()
    # Keep current_step_id pointing to the FAILED step so the UI
    # can offer "Fix Rules on Failed Step" correctly
    execution.current_step_id = step_id
    db.commit()
