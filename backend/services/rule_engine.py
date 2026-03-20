"""
Rule Engine — pure module, zero database access.

evaluateRules(rules, input_data) is the only public function.
The caller (execution engine or route handler) loads rules from DB,
then passes them here. This keeps the engine fast and independently testable.

Supported condition syntax:
  Comparison : ==  !=  <  >  <=  >=
  Logical    : and  or  (Python syntax; frontend can send && || which we normalize)
  Functions  : contains(field, "val")  startsWith(field, "pre")  endsWith(field, "suf")  iequals(field, "val")
  Special    : DEFAULT  — always matches, used as fallback catch-all
"""


def _normalize(condition: str) -> str:
    """Normalize JS-style operators to Python equivalents."""
    return (
        condition
        .replace("&&", " and ")
        .replace("||", " or ")
        .replace("===", "==")
        .replace("!==", "!=")
    )


def _build_scope(data: dict) -> dict:
    """Build a safe evaluation scope from input data + helper functions."""

    # BUG-006 FIX: iequals() added for case-insensitive string comparison.
    # Standard == is still case-sensitive (High != high).
    # Users should use iequals(field, 'value') when case should not matter.
    def iequals(field, value):
        return str(field).strip().lower() == str(value).strip().lower()

    def contains(field, value):
        return str(value).lower() in str(field).lower()

    def startsWith(field, prefix):  # noqa: N802 — matches spec naming
        return str(field).startswith(str(prefix))

    def endsWith(field, suffix):    # noqa: N802
        return str(field).endswith(str(suffix))

    return {
        **data,
        "iequals":    iequals,
        "contains":   contains,
        "startsWith": startsWith,
        "endsWith":   endsWith,
        # block all builtins for safety
        "__builtins__": {},
    }


def evaluate_condition(condition: str, data: dict) -> bool:
    """
    Evaluate a single condition string against input data.
    Returns True if the condition matches.
    Raises ValueError on syntax error.
    """
    stripped = condition.strip()
    if stripped.upper() == "DEFAULT":
        return True

    normalized = _normalize(stripped)
    scope = _build_scope(data)

    try:
        result = eval(normalized, {"__builtins__": {}}, scope)  # noqa: S307
        return bool(result)
    except NameError as e:
        # field referenced in condition doesn't exist in input_data — treat as False
        # e.g. condition references "department" but input has no "department" key
        return False
    except Exception as e:
        raise ValueError(f"Condition syntax error in '{condition}': {e}")


def evaluate_rules(rules: list, input_data: dict) -> dict:
    """
    Evaluate all rules for a step in priority order.

    Args:
        rules      : list of Rule ORM objects (or dicts with .condition/.priority/.next_step_id)
        input_data : dict of values from execution.data

    Returns dict:
        has_match      : bool
        matched_rule   : the first Rule that matched, or None
        next_step_id   : str | None
        evaluation_log : list of {rule, priority, result, error} for every rule evaluated
    """
    evaluation_log = []
    matched_rule = None

    # sort by priority ascending — lowest number evaluated first
    def get_priority(r):
        return r.priority if hasattr(r, "priority") else r.get("priority", 99)

    def get_condition(r):
        return r.condition if hasattr(r, "condition") else r.get("condition", "")

    def get_next(r):
        return r.next_step_id if hasattr(r, "next_step_id") else r.get("next_step_id")

    sorted_rules = sorted(rules, key=get_priority)

    for rule in sorted_rules:
        result = False
        error = None

        try:
            result = evaluate_condition(get_condition(rule), input_data)
        except ValueError as e:
            error = str(e)
            result = False

        evaluation_log.append({
            "rule":      get_condition(rule),
            "priority":  get_priority(rule),
            "result":    result,
            "error":     error,
        })

        if result and matched_rule is None:
            matched_rule = rule

    return {
        "has_match":      matched_rule is not None,
        "matched_rule":   matched_rule,
        "next_step_id":   get_next(matched_rule) if matched_rule else None,
        "evaluation_log": evaluation_log,
    }
