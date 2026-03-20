"""
Seed script — creates two sample workflows with steps and rules.
Run: python seed.py

Workflow 1: Expense Approval
  Steps: Manager Approval → Finance Notification → CEO Approval → Task Rejection
  Rules: based on amount, country, priority

Workflow 2: Employee Onboarding
  Steps: HR Review → IT Setup → Welcome Notification
"""

import json
import uuid
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine
from models import Base, Workflow, Step, Rule

Base.metadata.create_all(bind=engine)
db = SessionLocal()


def make_id():
    return str(uuid.uuid4())


def seed():
    # ── Workflow 1: Expense Approval ─────────────────────────────────────────
    wf1_id        = make_id()
    step_manager  = make_id()
    step_finance  = make_id()
    step_ceo      = make_id()
    step_rejected = make_id()

    wf1 = Workflow(
        id           = wf1_id,
        name         = "Expense Approval",
        description  = "Multi-level expense approval based on amount, country, and priority",
        version      = 1,
        is_active    = True,
        input_schema = json.dumps({
            "amount":     {"type": "number",  "required": True},
            "country":    {"type": "string",  "required": True},
            "department": {"type": "string",  "required": False},
            "priority":   {"type": "string",  "required": True, "allowed_values": ["High", "Medium", "Low"]},
        }),
        start_step_id = step_manager,
    )
    db.add(wf1)

    db.add(Step(id=step_manager,  workflow_id=wf1_id, name="Manager Approval",     step_type="approval",     order=1, metadata_json=json.dumps({"assignee_email": "manager@example.com"})))
    db.add(Step(id=step_finance,  workflow_id=wf1_id, name="Finance Notification", step_type="notification", order=2, metadata_json=json.dumps({"channel": "email", "template": "finance_alert"})))
    db.add(Step(id=step_ceo,      workflow_id=wf1_id, name="CEO Approval",         step_type="approval",     order=3, metadata_json=json.dumps({"assignee_email": "ceo@example.com"})))
    db.add(Step(id=step_rejected, workflow_id=wf1_id, name="Task Rejection",       step_type="task",         order=4, metadata_json=json.dumps({"action": "reject_and_notify"})))

    # Rules for Manager Approval step
    db.add(Rule(id=make_id(), step_id=step_manager, priority=1, condition="amount > 100 and country == 'US' and priority == 'High'", next_step_id=step_finance))
    db.add(Rule(id=make_id(), step_id=step_manager, priority=2, condition="amount <= 100 or department == 'HR'",                     next_step_id=step_ceo))
    db.add(Rule(id=make_id(), step_id=step_manager, priority=3, condition="priority == 'Low' and country != 'US'",                   next_step_id=step_rejected))
    db.add(Rule(id=make_id(), step_id=step_manager, priority=4, condition="DEFAULT",                                                 next_step_id=step_rejected))

    # Rules for Finance Notification step
    db.add(Rule(id=make_id(), step_id=step_finance, priority=1, condition="amount > 500", next_step_id=step_ceo))
    db.add(Rule(id=make_id(), step_id=step_finance, priority=2, condition="DEFAULT",      next_step_id=None))  # end workflow

    # Rules for CEO Approval step
    db.add(Rule(id=make_id(), step_id=step_ceo, priority=1, condition="DEFAULT", next_step_id=None))

    # Rules for Task Rejection step
    db.add(Rule(id=make_id(), step_id=step_rejected, priority=1, condition="DEFAULT", next_step_id=None))

    # ── Workflow 2: Employee Onboarding ──────────────────────────────────────
    wf2_id       = make_id()
    step_hr      = make_id()
    step_it      = make_id()
    step_welcome = make_id()

    wf2 = Workflow(
        id           = wf2_id,
        name         = "Employee Onboarding",
        description  = "New employee onboarding process: HR review, IT setup, welcome notification",
        version      = 1,
        is_active    = True,
        input_schema = json.dumps({
            "employee_name": {"type": "string", "required": True},
            "department":    {"type": "string", "required": True},
            "role":          {"type": "string", "required": True},
            "start_date":    {"type": "string", "required": False},
        }),
        start_step_id = step_hr,
    )
    db.add(wf2)

    db.add(Step(id=step_hr,      workflow_id=wf2_id, name="HR Review",             step_type="approval",     order=1, metadata_json=json.dumps({"assignee_email": "hr@example.com"})))
    db.add(Step(id=step_it,      workflow_id=wf2_id, name="IT Setup",              step_type="task",         order=2, metadata_json=json.dumps({"action": "provision_accounts"})))
    db.add(Step(id=step_welcome, workflow_id=wf2_id, name="Welcome Notification",  step_type="notification", order=3, metadata_json=json.dumps({"channel": "slack", "template": "welcome_message"})))

    # Rules for HR Review
    db.add(Rule(id=make_id(), step_id=step_hr, priority=1, condition="department == 'Engineering'", next_step_id=step_it))
    db.add(Rule(id=make_id(), step_id=step_hr, priority=2, condition="DEFAULT",                     next_step_id=step_it))

    # Rules for IT Setup
    db.add(Rule(id=make_id(), step_id=step_it, priority=1, condition="DEFAULT", next_step_id=step_welcome))

    # Rules for Welcome Notification
    db.add(Rule(id=make_id(), step_id=step_welcome, priority=1, condition="DEFAULT", next_step_id=None))

    db.commit()
    print("✓ Seeded: Expense Approval workflow")
    print("✓ Seeded: Employee Onboarding workflow")
    print("\nSample execution inputs:")
    print("  Expense Approval → {amount: 250, country: 'US', department: 'Finance', priority: 'High'}")
    print("  Employee Onboarding → {employee_name: 'Alice', department: 'Engineering', role: 'Developer'}")


if __name__ == "__main__":
    seed()
    db.close()
