VALID_TRANSITIONS = {
    "REQUESTED": {"MATCHED", "CANCELLED"},
    "MATCHED": {"ACCEPTED", "CANCELLED"},
    "ACCEPTED": {"IN_PROGRESS", "CANCELLED"},
    "IN_PROGRESS": {"COMPLETED"},
    "COMPLETED": set(),
    "CANCELLED": set(),
}

class InvalidTransitionError(Exception):
    pass

def validate_transition(current_status: str, new_status: str):
    allowed = VALID_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        raise InvalidTransitionError(
            f"Cannot transition from {current_status} to {new_status}"
        )