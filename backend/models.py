from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import uuid


def new_id():
    return str(uuid.uuid4())


class Workflow(Base):
    __tablename__ = "workflows"

    id            = Column(String, primary_key=True, default=new_id)
    name          = Column(String, nullable=False)
    description   = Column(Text, nullable=True)
    version       = Column(Integer, default=1)
    is_active     = Column(Boolean, default=True)
    input_schema  = Column(Text, default="{}")   # JSON string
    start_step_id = Column(String, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    steps      = relationship("Step", back_populates="workflow", cascade="all, delete-orphan",
                               foreign_keys="Step.workflow_id")
    executions = relationship("Execution", back_populates="workflow")


class Step(Base):
    __tablename__ = "steps"

    id             = Column(String, primary_key=True, default=new_id)
    workflow_id    = Column(String, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    name           = Column(String, nullable=False)
    step_type      = Column(String, nullable=False)   # task | approval | notification
    order          = Column(Integer, default=0)
    metadata_json  = Column("metadata", Text, default="{}")  # JSON string
    max_iterations = Column(Integer, default=10)              # loop guard
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workflow = relationship("Workflow", back_populates="steps", foreign_keys=[workflow_id])
    rules    = relationship("Rule", back_populates="step", cascade="all, delete-orphan")


class Rule(Base):
    __tablename__ = "rules"

    id           = Column(String, primary_key=True, default=new_id)
    step_id      = Column(String, ForeignKey("steps.id", ondelete="CASCADE"), nullable=False)
    condition    = Column(Text, nullable=False)   # expression string or "DEFAULT"
    next_step_id = Column(String, nullable=True)  # null = end workflow
    priority     = Column(Integer, default=99)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    step = relationship("Step", back_populates="rules")


class Execution(Base):
    __tablename__ = "executions"

    id               = Column(String, primary_key=True, default=new_id)
    workflow_id      = Column(String, ForeignKey("workflows.id"), nullable=False)
    workflow_version = Column(Integer, nullable=False)
    status           = Column(String, default="pending")  # pending|in_progress|completed|failed|canceled
    data             = Column(Text, default="{}")          # JSON input values
    current_step_id  = Column(String, nullable=True)
    retries          = Column(Integer, default=0)
    triggered_by     = Column(String, nullable=True, default="user")
    started_at       = Column(DateTime, default=datetime.utcnow)
    ended_at         = Column(DateTime, nullable=True)

    workflow  = relationship("Workflow", back_populates="executions")
    step_logs = relationship("StepLog", back_populates="execution", cascade="all, delete-orphan")


class StepLog(Base):
    __tablename__ = "step_logs"

    id                 = Column(String, primary_key=True, default=new_id)
    execution_id       = Column(String, ForeignKey("executions.id", ondelete="CASCADE"), nullable=False)
    step_id            = Column(String, nullable=False)
    step_name          = Column(String, nullable=False)
    step_type          = Column(String, nullable=False)
    evaluated_rules    = Column(Text, default="[]")  # JSON array
    selected_next_step = Column(String, nullable=True)
    status             = Column(String, nullable=False)  # completed | failed
    error_message      = Column(Text, nullable=True)
    started_at         = Column(DateTime, default=datetime.utcnow)
    ended_at           = Column(DateTime, nullable=True)

    execution = relationship("Execution", back_populates="step_logs")
