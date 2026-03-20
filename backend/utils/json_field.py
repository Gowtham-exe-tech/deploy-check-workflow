import json


def parse_json_field(value) -> dict:
    """Safely parse a JSON text column to dict. Returns {} on failure."""
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return {}


def dump_json_field(value) -> str:
    """Serialize a dict to JSON string for storage."""
    if value is None:
        return "{}"
    if isinstance(value, str):
        return value
    return json.dumps(value)
