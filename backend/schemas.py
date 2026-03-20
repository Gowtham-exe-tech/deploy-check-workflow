from pydantic import BaseModel, Field
from typing import Optional, Any, List, Dict
from datetime import datetime


# ─── Workflow ────────────────────────────────────────────────────────────────

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    input_schema: Optional[Dict[str, Any]] = {}
    start_step_id: Optional[str] = None


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    input_schema: Optional[Dict[str, Any]] = None
    start_step_id: Optional[str] = None


class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    version: int
    is_active: bool
    input_schema: Optional[Dict[str, Any]]
    start_step_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Step ────────────────────────────────────────────────────────────────────

class StepCreate(BaseModel):
    name: str
    step_type: str  # task | approval | notification
    order: Optional[int] = 0
    metadata: Optional[Dict[str, Any]] = {}
    max_iterations: Optional[int] = 10


class StepUpdate(BaseModel):
    name: Optional[str] = None
    step_type: Optional[str] = None
    order: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None
    max_iterations: Optional[int] = None


class StepResponse(BaseModel):
    id: str
    workflow_id: str
    name: str
    step_type: str
    order: int
    metadata: Optional[Dict[str, Any]]
    max_iterations: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Rule ────────────────────────────────────────────────────────────────────

class RuleCreate(BaseModel):
    condition: str
    next_step_id: Optional[str] = None
    priority: Optional[int] = 99


class RuleUpdate(BaseModel):
    condition: Optional[str] = None
    next_step_id: Optional[str] = None
    priority: Optional[int] = None


class RuleResponse(BaseModel):
    id: str
    step_id: str
    condition: str
    next_step_id: Optional[str]
    priority: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Execution ───────────────────────────────────────────────────────────────

class ExecutionCreate(BaseModel):
    data: Dict[str, Any] = {}
    triggered_by: Optional[str] = "user"


class StepLogResponse(BaseModel):
    id: str
    execution_id: str
    step_id: str
    step_name: str
    step_type: str
    evaluated_rules: Optional[List[Dict[str, Any]]]
    selected_next_step: Optional[str]
    status: str
    error_message: Optional[str]
    started_at: datetime
    ended_at: Optional[datetime]

    class Config:
        from_attributes = True


class ExecutionResponse(BaseModel):
    id: str
    workflow_id: str
    workflow_version: int
    status: str
    data: Optional[Dict[str, Any]]
    current_step_id: Optional[str]
    retries: int
    triggered_by: Optional[str]
    started_at: datetime
    ended_at: Optional[datetime]
    step_logs: Optional[List[StepLogResponse]] = []

    class Config:
        from_attributes = True


# ─── Simulate (Rule Sandbox) ─────────────────────────────────────────────────

class SimulateRequest(BaseModel):
    rules: List[Dict[str, Any]]   # [{condition, next_step_id, priority}]
    input_data: Dict[str, Any]


class SimulateResponse(BaseModel):
    has_match: bool
    matched_rule: Optional[Dict[str, Any]]
    next_step_id: Optional[str]
    evaluation_log: List[Dict[str, Any]]
