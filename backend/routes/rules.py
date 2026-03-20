import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Rule, Step
from schemas import RuleCreate, RuleUpdate

router = APIRouter(tags=["Rules"])


def _serialize_rule(r: Rule) -> dict:
    return {
        "id":           r.id,
        "step_id":      r.step_id,
        "condition":    r.condition,
        "next_step_id": r.next_step_id,
        "priority":     r.priority,
        "created_at":   r.created_at.isoformat() if r.created_at else None,
        "updated_at":   r.updated_at.isoformat() if r.updated_at else None,
    }


@router.post("/steps/{step_id}/rules", status_code=201)
def create_rule(step_id: str, body: RuleCreate, db: Session = Depends(get_db)):
    if not db.query(Step).filter_by(id=step_id).first():
        raise HTTPException(404, "Step not found")

    rule = Rule(
        id           = str(uuid.uuid4()),
        step_id      = step_id,
        condition    = body.condition,
        next_step_id = body.next_step_id,
        priority     = body.priority if body.priority is not None else 99,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return _serialize_rule(rule)


@router.get("/steps/{step_id}/rules")
def list_rules(step_id: str, db: Session = Depends(get_db)):
    if not db.query(Step).filter_by(id=step_id).first():
        raise HTTPException(404, "Step not found")
    rules = db.query(Rule).filter_by(step_id=step_id).order_by(Rule.priority).all()
    return [_serialize_rule(r) for r in rules]


@router.put("/rules/{rule_id}")
def update_rule(rule_id: str, body: RuleUpdate, db: Session = Depends(get_db)):
    rule = db.query(Rule).filter_by(id=rule_id).first()
    if not rule:
        raise HTTPException(404, "Rule not found")

    if body.condition is not None:
        rule.condition = body.condition
    if body.next_step_id is not None:
        rule.next_step_id = body.next_step_id
    if body.priority is not None:
        rule.priority = body.priority

    rule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rule)
    return _serialize_rule(rule)


@router.delete("/rules/{rule_id}", status_code=204)
def delete_rule(rule_id: str, db: Session = Depends(get_db)):
    rule = db.query(Rule).filter_by(id=rule_id).first()
    if not rule:
        raise HTTPException(404, "Rule not found")
    db.delete(rule)
    db.commit()
