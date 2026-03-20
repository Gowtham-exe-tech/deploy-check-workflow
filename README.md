<div align="center">

# Halleyx Workflow Engine

**A full-stack workflow automation system with dynamic rule-based execution**

Built for the Halleyx Full Stack Engineer Challenge 2026

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![SQLite](https://img.shields.io/badge/SQLite-ready-003B57?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-ready-4169E1?style=flat&logo=postgresql&logoColor=white)](https://postgresql.org)

</div>

---

## Overview

Halleyx Workflow Engine is a production-grade workflow automation platform that lets teams design multi-step processes, define conditional routing rules, execute workflows with real input data, and audit every decision made along the way.

Think of it as a lightweight version of tools like Zapier or ServiceNow — but fully custom, fully explainable, and built from scratch.

**Core idea:** A workflow is a graph of steps. Rules on each step decide which step runs next, evaluated against the input data provided at execution time. Every evaluation — true or false — is logged. Nothing is a black box.

---

## Live Demo

> Demo video attached in the [Releases](../../releases) section.

---

## Features

### Core (Required by Challenge)

| Feature | Description |
|---------|-------------|
| **Workflow Designer** | Create named workflows with auto-versioning and JSON input schema |
| **Step Management** | Three step types: `task` (automated), `approval` (human gate), `notification` (alert) |
| **Rule Engine** | Write conditions like `amount > 100 && priority == 'High'` — evaluated at runtime |
| **Execution Engine** | State machine that traverses steps, pauses for approvals, logs every decision |
| **Audit Log** | Complete history of every execution with per-step rule evaluation records |
| **Retry & Cancel** | Retry only the failed step (not the whole workflow), or cancel mid-execution |

### Unique Additions

| Feature | Description |
|---------|-------------|
| **★ Rule Sandbox** | Test rules against sample JSON input before saving — no execution created, zero risk |
| **★ Graph View** | React Flow node diagram of the workflow with live execution state highlighting |
| **★ Input Schema Validation** | Required fields, type checking, and allowed values enforced before execution starts |
| **★ Loop Guard** | Configurable `max_iterations` per step prevents infinite loops in branching workflows |
| **★ Dark / Light Theme** | Full theme toggle with green accent, preference saved to localStorage |
| **★ Export Logs** | Download complete execution logs as JSON from the audit log |
| **★ iequals() Function** | Case-insensitive string comparison in rules — `iequals(priority, 'high')` |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Backend | Python 3.10+ · FastAPI | REST API with automatic OpenAPI docs |
| ORM | SQLAlchemy 2.0 | Database-agnostic models and queries |
| Database | SQLite (dev) → PostgreSQL (prod) | One connection string change to switch |
| Frontend | React 18 · React Router v6 | Component-based SPA |
| Graph | React Flow | Interactive workflow node diagram |
| Styling | Plain CSS with CSS custom properties | Full dark/light theme, no framework dependency |
| Validation | Pydantic v2 | Request/response schema validation |

---

## Project Structure

```
halleyx-workflow-engine/
│
├── backend/
│   ├── main.py                      ← FastAPI app entry point, CORS, route registration
│   ├── config.py                    ← DATABASE_URL and app settings (single change point)
│   ├── database.py                  ← SQLAlchemy engine, SessionLocal, get_db() dependency
│   ├── models.py                    ← All 5 database table definitions
│   ├── schemas.py                   ← Pydantic request/response models
│   ├── seed.py                      ← Creates 2 sample workflows with steps and rules
│   ├── test_all.py                  ← End-to-end API test suite (75+ tests)
│   ├── requirements.txt
│   │
│   ├── routes/
│   │   ├── workflows.py             ← CRUD + list/search/pagination
│   │   ├── steps.py                 ← CRUD
│   │   ├── rules.py                 ← CRUD
│   │   └── executions.py            ← execute, cancel, retry, approve, simulate
│   │
│   ├── services/
│   │   ├── rule_engine.py           ← Pure function: evaluates conditions, zero DB access
│   │   └── execution_engine.py      ← State machine: run, pause, resume, retry, fail
│   │
│   └── utils/
│       └── json_field.py            ← JSON text column serialize/deserialize helpers
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx                  ← Router, sidebar layout, theme toggle logic
        ├── main.jsx                 ← React entry point
        ├── index.css                ← Design system: CSS variables, components, themes
        │
        ├── api/
        │   └── client.js            ← All fetch() calls in one place
        │
        └── components/
            ├── WorkflowList/        ← Table with search, pagination, action buttons
            ├── WorkflowEditor/
            │   ├── index.jsx        ← Tabs: details, input schema, steps
            │   ├── SchemaEditor.jsx ← Field builder (fixed: no focus loss on typing)
            │   └── StepModal.jsx    ← Add/edit step with type-specific metadata fields
            ├── RuleBuilder/         ← Inline-editable rules with case sensitivity warning
            ├── RuleSandbox/         ← Live rule testing — calls /simulate, no execution
            ├── ExecutionView/       ← Input form, live progress, graph, logs
            ├── GraphView/           ← React Flow graph, live node state highlighting
            ├── AuditLog/
            │   ├── index.jsx        ← Execution history with status filter
            │   └── ExecutionDetail.jsx ← Full logs + approve/retry/fix-rules actions
            └── common/
                ├── Toast.jsx        ← Global notification context
                └── ConfirmDialog.jsx ← Reusable delete confirmation modal
```

---

## Getting Started

### Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Python | 3.10+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

Download: [python.org](https://python.org/downloads) · [nodejs.org](https://nodejs.org)

---

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/halleyx-workflow-engine.git
cd halleyx-workflow-engine
```

**2. Backend setup**

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Load sample workflows
python seed.py

# Start the backend
uvicorn main:app --reload --port 8001
```

**3. Frontend setup** *(open a second terminal)*

```bash
cd frontend
npm install
npm run dev
```

**4. Open the app**

| Service | URL |
|---------|-----|
| Application | http://localhost:5173 |
| Backend health | http://localhost:8001/health |
| Interactive API docs | http://localhost:8001/docs |

---

### Running Again After First Setup

You only need to run `pip install` and `npm install` once.

```bash
# Terminal 1 — Backend
cd backend
source venv/bin/activate        # Windows: venv\Scripts\activate
uvicorn main:app --reload --port 8001

# Terminal 2 — Frontend
cd frontend
npm run dev
```

---

## System Architecture

### How Execution Works

```
User submits input data
         │
         ▼
POST /workflows/:id/execute
         │
         ▼
Validate input against workflow's input_schema
(required fields · type checks · allowed values)
         │
         ▼
Create Execution record  (status: pending)
         │
         ▼
┌─────────────────────────────────────────────┐
│           EXECUTION ENGINE LOOP             │
│                                             │
│  1. Load current step                       │
│  2. Check loop guard (max_iterations)       │
│  3. Check if canceled                       │
│  4. Load step's rules                       │
│  5. Rule engine evaluates all conditions    │
│  6. Write step log (every result recorded)  │
│                                             │
│  ┌─── Rule matched? ───┐                    │
│  │ YES              NO │                    │
│  │                  └──┼── status: failed   │
│  ▼                     │                    │
│  Approval step?        │                    │
│  YES → status: pending │                    │
│        wait for human  │                    │
│  NO  → advance to      │                    │
│        next_step_id    │                    │
│                        │                    │
│  next_step_id = null?  │                    │
│  YES → status: completed                    │
└─────────────────────────────────────────────┘
```

### The Rule Engine

The most critical module. Lives in `services/rule_engine.py`.

**Design principle:** It is a **pure function** — no database access, no side effects. The route handler loads rules from DB, passes them in, gets a result back. This makes it independently testable and callable from `/simulate` without touching any execution records.

```python
evaluate_rules(rules, input_data) → {
    has_match:      bool,
    matched_rule:   Rule | None,
    next_step_id:   str | None,
    evaluation_log: list   # every rule's result — used for audit trail
}
```

**Evaluation logic:**
1. Sort rules by `priority` ascending (1 = first evaluated)
2. Evaluate each condition using Python `eval()` with a restricted scope
3. First rule returning `True` wins — stops evaluating
4. `DEFAULT` always returns `True` — the required catch-all
5. Every result (true / false / error) is logged regardless

**Security:** `eval()` runs with `__builtins__: {}` — no Python builtins accessible. Only input data fields and the built-in helper functions are in scope.

### Execution State Machine

```
pending → in_progress → completed
                      → failed
                      → canceled
in_progress → pending     (approval step pauses execution)
pending     → in_progress (POST /executions/:id/approve resumes it)
failed      → in_progress (POST /executions/:id/retry re-runs failed step only)
```

---

## API Reference

### Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/workflows` | Create workflow |
| `GET` | `/workflows?search=&page=&limit=` | List with search and pagination |
| `GET` | `/workflows/:id` | Get workflow with all steps and rules |
| `PUT` | `/workflows/:id` | Update (increments version number) |
| `DELETE` | `/workflows/:id` | Delete workflow |

### Steps

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/workflows/:workflow_id/steps` | Add step to workflow |
| `GET` | `/workflows/:workflow_id/steps` | List steps ordered by `order` field |
| `PUT` | `/steps/:id` | Update step |
| `DELETE` | `/steps/:id` | Delete step |

### Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/steps/:step_id/rules` | Add rule to step |
| `GET` | `/steps/:step_id/rules` | List rules ordered by priority |
| `PUT` | `/rules/:id` | Update rule |
| `DELETE` | `/rules/:id` | Delete rule |

### Executions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/workflows/:id/execute` | Start execution with input data |
| `GET` | `/executions?status=&page=` | List all executions with optional filter |
| `GET` | `/executions/:id` | Get execution with full step logs |
| `POST` | `/executions/:id/cancel` | Cancel a running or pending execution |
| `POST` | `/executions/:id/retry` | Retry from the failed step only |
| `POST` | `/executions/:id/approve` | Resume after an approval step |
| `POST` | `/simulate` | Test rules without creating an execution |

> Full interactive API documentation available at **http://localhost:8001/docs**

---

## Rule Engine Syntax

### Comparison Operators

```
==    equals (case sensitive — use iequals() for case-insensitive)
!=    not equals
>     greater than
<     less than
>=    greater than or equal
<=    less than or equal
```

### Logical Operators

```
&&    AND  (also accepts Python's: and)
||    OR   (also accepts Python's: or)
```

### Built-in Functions

```
contains(field, "value")     → true if field contains value (case insensitive)
startsWith(field, "prefix")  → true if field starts with prefix
endsWith(field, "suffix")    → true if field ends with suffix
iequals(field, "value")      → true if field equals value (case INSENSITIVE)
                                use this instead of == when case doesn't matter
```

### Special Keyword

```
DEFAULT    → always evaluates to true
            must be the last rule on every step (catches unmatched cases)
```

### Rule Examples

```javascript
// Numeric comparison
amount > 100

// Multiple conditions
amount > 100 && country == 'US' && priority == 'High'

// OR logic
amount <= 100 || department == 'HR'

// String functions
contains(email, '@company.com')
startsWith(role, 'Senior')
endsWith(code, '_APPROVED')

// Case-insensitive match (BUG-006 fix)
iequals(priority, 'high')      // matches: High, HIGH, high, hIgH

// Fallback — always add this as your last rule
DEFAULT
```

> ⚠ **Important:** `==` is case sensitive. `priority == 'High'` will NOT match `'high'`.
> Use `iequals(priority, 'high')` when case should not matter.

---

## Running Tests

Make sure the backend is running on port 8001, then:

```bash
cd backend
pip install requests     # one-time only
python test_all.py
```

Expected output:

```
────────────────────────────────────────────────────────
  1. Health check
────────────────────────────────────────────────────────
  ✓  GET /health returns 200
  ✓  Response has status=ok

  ... (75+ tests)

════════════════════════════════════════════════════════
  Results: 75 passed, 0 failed
════════════════════════════════════════════════════════
```

**Test coverage:**
- Health check
- Workflow CRUD (create, read, update, delete, search, pagination)
- Step CRUD with type validation
- Rule CRUD with priority ordering
- Rule engine — all operators, functions, DEFAULT, missing fields, syntax errors
- Execution flow — full traversal, approval pause/resume
- Input validation — required fields, type checks, allowed values
- Cancel and retry
- Audit log filtering
- Cleanup

> **Note:** Update `BASE = "http://localhost:8001"` on line 1 of `test_all.py` if your backend runs on a different port.

---

## Sample Workflows

Two workflows are pre-loaded by `seed.py`.

### 1 — Expense Approval

Multi-level financial approval based on amount, country, and priority.

**Input fields:** `amount` (number, required) · `country` (string, required) · `priority` (High/Medium/Low, required) · `department` (string, optional)

**Steps:** Manager Approval → Finance Notification → CEO Approval → Task Rejection

**Routing rules on Manager Approval:**

| Priority | Condition | Routes To |
|----------|-----------|-----------|
| 1 | `amount > 100 and country == 'US' and priority == 'High'` | Finance Notification |
| 2 | `amount <= 100 or department == 'HR'` | CEO Approval |
| 3 | `priority == 'Low' and country != 'US'` | Task Rejection |
| 4 | `DEFAULT` | Task Rejection |

**Sample executions:**

| Input | Route |
|-------|-------|
| amount=250, country=US, priority=High | Manager Approval → Finance Notification → end |
| amount=30, country=US, priority=High | Manager Approval → CEO Approval → end |
| amount=250, country=IN, priority=Low | Manager Approval → Task Rejection → end |

---

### 2 — Employee Onboarding

Linear onboarding flow with an HR approval gate.

**Input fields:** `employee_name` (string, required) · `department` (string, required) · `role` (string, required)

**Steps:** HR Review → IT Setup → Welcome Notification

**Sample execution:**

```json
{
  "employee_name": "Alice Johnson",
  "department": "Engineering",
  "role": "Senior Developer"
}
```

Route: HR Review (approve) → IT Setup → Welcome Notification → end

---

## Bugs Found and Fixed

The following bugs were discovered during manual QA testing after initial development and were resolved before submission.

| ID | Severity | Title | Fix |
|----|----------|-------|-----|
| BUG-001 | High | Input field loses focus after every keystroke in Schema Editor | Rewrote SchemaEditor with stable row IDs — `onChange` fires only on blur, not each keystroke |
| BUG-002 | Medium | Comma cannot be typed in Allowed Values field | Raw string stored during typing — split into array only on blur or Add click |
| BUG-003 | Low | Order field in Add Step shows `02` after backspace | Changed to text input with digit-only filter — parsed to integer only on save |
| BUG-004 | High | Notification step has no recipient field | Added dynamic recipient field to StepModal — label adapts to channel (email/slack/webhook) |
| BUG-005 | Low | Back button from Rule Editor lands on Details tab instead of Steps tab | Back navigation passes `?tab=steps` query param — WorkflowEditor reads it on mount |
| BUG-006 | High | Rule conditions are case sensitive causing silent wrong routing | Added `iequals()` helper function to rule engine — added visible warning banner in Rule Editor UI |

---

## Switching to PostgreSQL

The entire application is database-agnostic. Switching requires three changes:

**Step 1 — Update `backend/config.py`:**

```python
# SQLite (current)
DATABASE_URL = "sqlite:///./workflow_engine.db"

# PostgreSQL (production)
DATABASE_URL = "postgresql://username:password@localhost/halleyx_workflow"
```

**Step 2 — Install the PostgreSQL driver:**

```bash
pip install psycopg2-binary
```

**Step 3 — Remove the SQLite-only argument in `backend/database.py`:**

```python
# Remove this line (marked with a comment in the file):
connect_args={"check_same_thread": False}
```

**Step 4 — Create the database:**

```sql
CREATE DATABASE halleyx_workflow;
```

Restart the backend — SQLAlchemy creates all tables automatically on startup. All models, queries, and services remain unchanged.

---

## Design Decisions

**Rule engine is a pure function**
`evaluate_rules(rules, input_data)` has zero database imports. This means it can be unit tested without any database setup, called from `/simulate` without touching executions, and runs with no I/O overhead inside the evaluation loop.

**SQLAlchemy for database abstraction**
One `DATABASE_URL` string controls everything. SQLite for local development (zero config, single file), PostgreSQL for production. Same models, same queries, same services.

**Approval steps pause and wait**
When the execution engine reaches an approval step, it writes the step log, advances `current_step_id`, sets status to `pending`, and returns. The workflow resumes when `POST /executions/:id/approve` is called. A human decision never blocks the server thread.

**Versioning is non-destructive**
`PUT /workflows/:id` increments the `version` field in place. Every execution records the `workflow_version` it ran on. Historical logs are always accurate even after a workflow is later modified.

**Retry is step-level not workflow-level**
`POST /executions/:id/retry` re-runs only from the failed step. All previously completed steps remain in the log. This preserves the execution history and avoids re-running steps that already succeeded.

**`current_step_id` always points to the failed step**
When an execution fails, `current_step_id` is explicitly set to the step that caused the failure — not the next step the engine was trying to advance to. This ensures the "Fix Rules on Failed Step" button always navigates to the correct step.

---

## UI Design

- **Dark mode** (default) — deep forest green backgrounds with bright green accent (`#34d27a`)
- **Light mode** — clean off-white with darker green accent (`#1e9e56`) for contrast
- **Theme toggle** in the sidebar — preference persisted to `localStorage`
- **Step cards** — colored left border per step type (blue = task, amber = approval, green = notification)
- **Graph view** — completed nodes turn green, failed red, active node pulses with animation
- **No external CSS framework** — plain CSS custom properties throughout, full control over every pixel

---

## License

Built for the Halleyx Full Stack Engineer Challenge 2026.
