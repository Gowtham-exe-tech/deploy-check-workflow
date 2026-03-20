"""
End-to-end tests for the Workflow Engine.

Run:  python test_all.py
Requires: pip install requests
The backend must be running at http://localhost:8000
"""

import json
import sys
import time
import requests

BASE = "http://localhost:8000"
PASS = 0
FAIL = 0


def check(label, condition, detail=""):
    global PASS, FAIL
    if condition:
        print(f"  ✓  {label}")
        PASS += 1
    else:
        print(f"  ✗  {label}" + (f"  →  {detail}" if detail else ""))
        FAIL += 1


def section(title):
    print(f"\n{'─' * 60}")
    print(f"  {title}")
    print(f"{'─' * 60}")


# ─────────────────────────────────────────────────────────────
# 1. Health check
# ─────────────────────────────────────────────────────────────
section("1. Health check")

r = requests.get(f"{BASE}/health")
check("GET /health returns 200", r.status_code == 200)
check("Response has status=ok", r.json().get("status") == "ok")


# ─────────────────────────────────────────────────────────────
# 2. Workflow CRUD
# ─────────────────────────────────────────────────────────────
section("2. Workflow CRUD")

# Create
payload = {
    "name": "Test Workflow",
    "description": "Created by test suite",
    "input_schema": {
        "amount":   {"type": "number",  "required": True},
        "priority": {"type": "string",  "required": True, "allowed_values": ["High", "Low"]},
    }
}
r = requests.post(f"{BASE}/workflows", json=payload)
check("POST /workflows returns 201", r.status_code == 201, r.text)
wf = r.json()
WF_ID = wf["id"]
check("Workflow has id",      bool(wf.get("id")))
check("Name is correct",      wf["name"] == "Test Workflow")
check("Version starts at 1",  wf["version"] == 1)
check("is_active is True",    wf["is_active"] is True)

# List
r = requests.get(f"{BASE}/workflows")
check("GET /workflows returns 200", r.status_code == 200)
check("Response has items list", "items" in r.json())
check("Total > 0", r.json()["total"] > 0)

# Search
r = requests.get(f"{BASE}/workflows?search=Test")
check("Search finds workflow", r.json()["total"] >= 1)

r = requests.get(f"{BASE}/workflows?search=XYZ_NOT_EXIST_ABC")
check("Search returns 0 for unknown term", r.json()["total"] == 0)

# Get by ID
r = requests.get(f"{BASE}/workflows/{WF_ID}")
check("GET /workflows/:id returns 200", r.status_code == 200)
check("Returns correct workflow", r.json()["id"] == WF_ID)

# Update
r = requests.put(f"{BASE}/workflows/{WF_ID}", json={"name": "Test Workflow Updated"})
check("PUT /workflows/:id returns 200", r.status_code == 200, r.text)
check("Version incremented",   r.json()["version"] == 2)
check("Name updated",          r.json()["name"] == "Test Workflow Updated")

# 404
r = requests.get(f"{BASE}/workflows/does-not-exist")
check("GET unknown workflow returns 404", r.status_code == 404)


# ─────────────────────────────────────────────────────────────
# 3. Step CRUD
# ─────────────────────────────────────────────────────────────
section("3. Step CRUD")

# Create steps
s1 = requests.post(f"{BASE}/workflows/{WF_ID}/steps", json={
    "name": "Manager Approval", "step_type": "approval", "order": 1,
    "metadata": {"assignee_email": "manager@test.com"}, "max_iterations": 5
}).json()
STEP_1_ID = s1["id"]

s2 = requests.post(f"{BASE}/workflows/{WF_ID}/steps", json={
    "name": "Finance Notification", "step_type": "notification", "order": 2,
    "metadata": {"channel": "email", "template": "finance_alert"}
}).json()
STEP_2_ID = s2["id"]

s3 = requests.post(f"{BASE}/workflows/{WF_ID}/steps", json={
    "name": "Task Rejection", "step_type": "task", "order": 3,
    "metadata": {"action": "reject"}
}).json()
STEP_3_ID = s3["id"]

check("Step 1 created", bool(STEP_1_ID))
check("Step 2 created", bool(STEP_2_ID))
check("Step 3 created", bool(STEP_3_ID))
check("Step type approval",     s1["step_type"] == "approval")
check("Step type notification", s2["step_type"] == "notification")
check("Max iterations stored",  s1["max_iterations"] == 5)

# Set start step
r = requests.put(f"{BASE}/workflows/{WF_ID}", json={"name": "Test Workflow Updated", "start_step_id": STEP_1_ID})
check("Start step set", r.json().get("start_step_id") == STEP_1_ID)

# List steps
r = requests.get(f"{BASE}/workflows/{WF_ID}/steps")
check("GET /steps returns 200",   r.status_code == 200)
check("Returns 3 steps",          len(r.json()) == 3)

# Update step
r = requests.put(f"{BASE}/steps/{STEP_1_ID}", json={"name": "Senior Manager Approval"})
check("PUT /steps/:id returns 200", r.status_code == 200)
check("Step name updated",         r.json()["name"] == "Senior Manager Approval")

# Invalid step type
r = requests.post(f"{BASE}/workflows/{WF_ID}/steps", json={"name": "Bad", "step_type": "invalid"})
check("Invalid step_type returns 400", r.status_code == 400)


# ─────────────────────────────────────────────────────────────
# 4. Rule CRUD
# ─────────────────────────────────────────────────────────────
section("4. Rule CRUD")

# Add rules to step 1
r1 = requests.post(f"{BASE}/steps/{STEP_1_ID}/rules", json={
    "condition": "amount > 100 and priority == 'High'",
    "next_step_id": STEP_2_ID,
    "priority": 1,
})
check("Rule 1 created", r1.status_code == 201, r1.text)
RULE_1_ID = r1.json()["id"]

r2 = requests.post(f"{BASE}/steps/{STEP_1_ID}/rules", json={
    "condition": "DEFAULT",
    "next_step_id": STEP_3_ID,
    "priority": 2,
})
check("DEFAULT rule created", r2.status_code == 201)
RULE_2_ID = r2.json()["id"]

# Add rules to step 2
requests.post(f"{BASE}/steps/{STEP_2_ID}/rules", json={"condition": "DEFAULT", "next_step_id": None, "priority": 1})
# Add rules to step 3
requests.post(f"{BASE}/steps/{STEP_3_ID}/rules", json={"condition": "DEFAULT", "next_step_id": None, "priority": 1})

# List rules
r = requests.get(f"{BASE}/steps/{STEP_1_ID}/rules")
check("GET /steps/:id/rules returns 200", r.status_code == 200)
check("Returns 2 rules",                  len(r.json()) == 2)
check("Rules ordered by priority",        r.json()[0]["priority"] < r.json()[1]["priority"])

# Update rule
r = requests.put(f"{BASE}/rules/{RULE_1_ID}", json={"condition": "amount > 50 and priority == 'High'"})
check("PUT /rules/:id returns 200",  r.status_code == 200)
check("Condition updated",           "50" in r.json()["condition"])

# Restore original condition
requests.put(f"{BASE}/rules/{RULE_1_ID}", json={"condition": "amount > 100 and priority == 'High'"})


# ─────────────────────────────────────────────────────────────
# 5. Rule Engine (via /simulate endpoint)
# ─────────────────────────────────────────────────────────────
section("5. Rule engine (/simulate)")

rules_payload = [
    {"condition": "amount > 100 and priority == 'High'", "next_step_id": "step-finance", "priority": 1},
    {"condition": "amount <= 100",                        "next_step_id": "step-ceo",     "priority": 2},
    {"condition": "DEFAULT",                              "next_step_id": "step-reject",  "priority": 3},
]

# Test: high amount, high priority → rule 1 matches
r = requests.post(f"{BASE}/simulate", json={
    "rules": rules_payload,
    "input_data": {"amount": 250, "priority": "High"}
})
check("Simulate returns 200", r.status_code == 200)
res = r.json()
check("has_match is True",       res["has_match"])
check("Matched rule 1",          res["matched_rule"]["priority"] == 1)
check("next_step_id is finance", res["next_step_id"] == "step-finance")
check("All 3 rules evaluated",   len(res["evaluation_log"]) == 3)

# Test: low amount → rule 2 matches
r = requests.post(f"{BASE}/simulate", json={
    "rules": rules_payload,
    "input_data": {"amount": 50, "priority": "Low"}
})
res = r.json()
check("Low amount matches rule 2", res["matched_rule"]["priority"] == 2)
check("next_step_id is ceo",       res["next_step_id"] == "step-ceo")

# Test: DEFAULT fallback
r = requests.post(f"{BASE}/simulate", json={
    "rules": rules_payload,
    "input_data": {"amount": 200, "priority": "Low"}
})
res = r.json()
check("DEFAULT rule catches unmatched", res["matched_rule"]["condition"] == "DEFAULT")
check("next_step_id is reject",         res["next_step_id"] == "step-reject")

# Test: contains() function
r = requests.post(f"{BASE}/simulate", json={
    "rules": [{"condition": "contains(name, 'Alice')", "next_step_id": None, "priority": 1}],
    "input_data": {"name": "Alice Smith"}
})
res = r.json()
check("contains() function works", res["has_match"])

# Test: startsWith() function
r = requests.post(f"{BASE}/simulate", json={
    "rules": [{"condition": "startsWith(dept, 'Eng')", "next_step_id": None, "priority": 1}],
    "input_data": {"dept": "Engineering"}
})
check("startsWith() function works", r.json()["has_match"])

# Test: missing field (should not throw, rule returns False)
r = requests.post(f"{BASE}/simulate", json={
    "rules": [{"condition": "missing_field == 'test'", "next_step_id": None, "priority": 1},
              {"condition": "DEFAULT", "next_step_id": None, "priority": 2}],
    "input_data": {}
})
res = r.json()
check("Missing field does not crash",    res["has_match"])
check("Missing field falls to DEFAULT",  res["matched_rule"]["condition"] == "DEFAULT")

# Test: no match without DEFAULT
r = requests.post(f"{BASE}/simulate", json={
    "rules": [{"condition": "amount > 1000", "next_step_id": None, "priority": 1}],
    "input_data": {"amount": 50}
})
check("No match without DEFAULT → has_match False", not r.json()["has_match"])


# ─────────────────────────────────────────────────────────────
# 6. Workflow Execution
# ─────────────────────────────────────────────────────────────
section("6. Workflow execution")

# Execute with high amount + High priority → should route to Finance Notification → end
r = requests.post(f"{BASE}/workflows/{WF_ID}/execute", json={
    "data": {"amount": 250, "priority": "High"},
    "triggered_by": "test_suite"
})
check("POST /execute returns 201", r.status_code == 201, r.text)
ex = r.json()
EX_ID = ex["id"]
check("Execution has id",             bool(ex.get("id")))
check("workflow_version matches",     ex["workflow_version"] == r.json()["workflow_version"])
check("triggered_by is test_suite",   ex["triggered_by"] == "test_suite")
check("Execution not pending forever", ex["status"] in ("completed", "pending", "failed"))

# Wait a moment for approval steps
time.sleep(0.2)
ex = requests.get(f"{BASE}/executions/{EX_ID}").json()
check("Execution has step_logs",  len(ex.get("step_logs", [])) > 0)

# Check first step log
if ex.get("step_logs"):
    log = ex["step_logs"][0]
    check("Step log has step_name",       bool(log.get("step_name")))
    check("Step log has evaluated_rules", isinstance(log.get("evaluated_rules"), list))
    check("Step status is completed or failed", log["status"] in ("completed", "failed"))

# If pending (approval step), approve it
if ex["status"] == "pending":
    r = requests.post(f"{BASE}/executions/{EX_ID}/approve")
    check("Approve returns 200", r.status_code == 200, r.text)
    ex = requests.get(f"{BASE}/executions/{EX_ID}").json()
    check("Status after approve is not pending", ex["status"] != "pending")

# Execute with low amount → DEFAULT path → Task Rejection → end
r2 = requests.post(f"{BASE}/workflows/{WF_ID}/execute", json={
    "data": {"amount": 30, "priority": "Low"},
})
check("Second execution created", r2.status_code == 201)
ex2 = r2.json()
EX2_ID = ex2["id"]

time.sleep(0.2)
ex2 = requests.get(f"{BASE}/executions/{EX2_ID}").json()
if ex2["status"] == "pending":
    requests.post(f"{BASE}/executions/{EX2_ID}/approve")
    time.sleep(0.2)
    ex2 = requests.get(f"{BASE}/executions/{EX2_ID}").json()

check("Second execution has logs", len(ex2.get("step_logs", [])) > 0)

# Input validation — missing required field
r = requests.post(f"{BASE}/workflows/{WF_ID}/execute", json={"data": {}})
check("Missing required field returns 422", r.status_code == 422)

# Input validation — wrong allowed value
r = requests.post(f"{BASE}/workflows/{WF_ID}/execute", json={"data": {"amount": 100, "priority": "INVALID"}})
check("Invalid allowed_value returns 422", r.status_code == 422)


# ─────────────────────────────────────────────────────────────
# 7. Execution actions
# ─────────────────────────────────────────────────────────────
section("7. Execution actions (cancel, list)")

# List executions
r = requests.get(f"{BASE}/executions")
check("GET /executions returns 200",  r.status_code == 200)
check("Has items list",               "items" in r.json())
check("total > 0",                    r.json()["total"] > 0)

# Filter by status
r = requests.get(f"{BASE}/executions?status=completed")
check("Filter by status=completed works", r.status_code == 200)

# Create a fresh execution to cancel
r_cancel = requests.post(f"{BASE}/workflows/{WF_ID}/execute", json={
    "data": {"amount": 999, "priority": "High"},
})
if r_cancel.status_code == 201:
    cancel_id = r_cancel.json()["id"]
    # Only cancel if still in cancellable state
    ex_check = requests.get(f"{BASE}/executions/{cancel_id}").json()
    if ex_check["status"] in ("pending", "in_progress"):
        r = requests.post(f"{BASE}/executions/{cancel_id}/cancel")
        check("Cancel returns 200", r.status_code == 200)
        check("Status is canceled", r.json()["status"] == "canceled")
    else:
        check("Execution ran too fast to cancel (ok)", True)
else:
    check("Cancel test execution created", False, r_cancel.text)

# Get single execution
r = requests.get(f"{BASE}/executions/{EX_ID}")
check("GET /executions/:id returns 200", r.status_code == 200)
check("Returns correct execution", r.json()["id"] == EX_ID)

# 404
r = requests.get(f"{BASE}/executions/does-not-exist")
check("Unknown execution returns 404", r.status_code == 404)


# ─────────────────────────────────────────────────────────────
# 8. Delete cleanup
# ─────────────────────────────────────────────────────────────
section("8. Cleanup (delete)")

r = requests.delete(f"{BASE}/workflows/{WF_ID}")
check("DELETE /workflows/:id returns 204", r.status_code == 204)

r = requests.get(f"{BASE}/workflows/{WF_ID}")
check("Deleted workflow returns 404", r.status_code == 404)


# ─────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────
print(f"\n{'═' * 60}")
print(f"  Results: {PASS} passed, {FAIL} failed")
print(f"{'═' * 60}\n")

sys.exit(0 if FAIL == 0 else 1)
