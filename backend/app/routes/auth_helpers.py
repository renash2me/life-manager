from flask_jwt_extended import get_jwt_identity
from ..models.user import User


def get_current_user_id():
    """Get the current user ID from JWT token."""
    return get_jwt_identity()


def get_current_user():
    """Get the current User object from JWT token."""
    user_id = get_jwt_identity()
    return User.query.get(user_id)
