import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Step, Workflow
from schemas import StepCreate, StepUpdate
from utils.json_field import parse_json_field, dump_json_field

router = APIRouter(tags=["Steps"])


def _serialize_step(s: Step) -> dict:
    return {
        "id":             s.id,
        "workflow_id":    s.workflow_id,
        "name":           s.name,
        "step_type":      s.step_type,
        "order":          s.order,
        "metadata":       parse_json_field(s.metadata_json),
        "max_iterations": s.max_iterations,
        "created_at":     s.created_at.isoformat() if s.created_at else None,
        "updated_at":     s.updated_at.isoformat() if s.updated_at else None,
    }


@router.post("/workflows/{workflow_id}/steps", status_code=201)
def create_step(workflow_id: str, body: StepCreate, db: Session = Depends(get_db)):
    if not db.query(Workflow).filter_by(id=workflow_id).first():
        raise HTTPException(404, "Workflow not found")

    valid_types = ("task", "approval", "notification")
    if body.step_type not in valid_types:
        raise HTTPException(400, f"step_type must be one of {valid_types}")

    step = Step(
        id             = str(uuid.uuid4()),
        workflow_id    = workflow_id,
        name           = body.name,
        step_type      = body.step_type,
        order          = body.order or 0,
        metadata_json  = dump_json_field(body.metadata or {}),
        max_iterations = body.max_iterations or 10,
    )
    db.add(step)
    db.commit()
    db.refresh(step)
    return _serialize_step(step)


@router.get("/workflows/{workflow_id}/steps")
def list_steps(workflow_id: str, db: Session = Depends(get_db)):
    if not db.query(Workflow).filter_by(id=workflow_id).first():
        raise HTTPException(404, "Workflow not found")
    steps = db.query(Step).filter_by(workflow_id=workflow_id).order_by(Step.order).all()
    return [_serialize_step(s) for s in steps]


@router.put("/steps/{step_id}")
def update_step(step_id: str, body: StepUpdate, db: Session = Depends(get_db)):
    step = db.query(Step).filter_by(id=step_id).first()
    if not step:
        raise HTTPException(404, "Step not found")

    if body.name is not None:
        step.name = body.name
    if body.step_type is not None:
        step.step_type = body.step_type
    if body.order is not None:
        step.order = body.order
    if body.metadata is not None:
        step.metadata_json = dump_json_field(body.metadata)
    if body.max_iterations is not None:
        step.max_iterations = body.max_iterations

    step.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(step)
    return _serialize_step(step)


@router.delete("/steps/{step_id}", status_code=204)
def delete_step(step_id: str, db: Session = Depends(get_db)):
    step = db.query(Step).filter_by(id=step_id).first()
    if not step:
        raise HTTPException(404, "Step not found")
    db.delete(step)
    db.commit()
