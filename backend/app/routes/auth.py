from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, decode_token
from ..extensions import db
from ..models.user import User
from .auth_helpers import get_current_user

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email e senha são obrigatórios'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Email ou senha incorretos'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()})


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    nome = data.get('nome', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not nome or not email or not password:
        return jsonify({'error': 'Nome, email e senha são obrigatórios'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email já cadastrado'}), 409

    user = User(nome=nome, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()}), 201


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    return jsonify(user.to_dict())


@auth_bp.route('/debug-token', methods=['GET'])
def debug_token():
    """Debug endpoint to test JWT token validation without redirect loops."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({
            'valid': False,
            'error': 'No Bearer token in Authorization header',
            'header': auth_header[:100] if auth_header else '(empty)',
        })

    token = auth_header[7:]
    try:
        decoded = decode_token(token)
        return jsonify({
            'valid': True,
            'identity': decoded.get('sub'),
            'type': decoded.get('type'),
            'expires': decoded.get('exp'),
        })
    except Exception as e:
        return jsonify({
            'valid': False,
            'error': str(e),
            'token_start': token[:30] + '...' if len(token) > 30 else token,
        })
