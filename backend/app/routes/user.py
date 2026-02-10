from flask import Blueprint, jsonify, request
from ..extensions import db
from ..models.user import User

user_bp = Blueprint('user', __name__)


@user_bp.route('/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


@user_bp.route('/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if 'nome' in data:
        user.nome = data['nome']
    if 'email' in data:
        user.email = data['email']
    db.session.commit()
    return jsonify(user.to_dict())
