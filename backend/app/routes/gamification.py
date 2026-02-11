from datetime import date, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models.gamification import Action, Event, Trophy, UserTrophy
from ..models.user import User
from ..services.scoring import calculate_daily_score, calculate_score_history
from ..services.leveling import process_level_up
from ..services.trophies import evaluate_trophies
from .auth_helpers import get_current_user_id, get_current_user

gamification_bp = Blueprint('gamification', __name__)


# --- Actions CRUD ---

@gamification_bp.route('/actions', methods=['GET'])
@jwt_required()
def list_actions():
    actions = Action.query.all()
    return jsonify([a.to_dict() for a in actions])


@gamification_bp.route('/actions', methods=['POST'])
@jwt_required()
def create_action():
    data = request.get_json()
    action = Action(
        nome=data['nome'],
        areas=data.get('areas', {}),
        sinergia=data.get('sinergia', False),
        penalidade_planejado=data.get('penalidadeFinanceiraPlanejado', 0),
        penalidade_nao_planejado=data.get('penalidadeFinanceiraNaoPlanejado', 0),
    )
    db.session.add(action)
    db.session.commit()
    return jsonify(action.to_dict()), 201


@gamification_bp.route('/actions/<int:action_id>', methods=['PUT'])
@jwt_required()
def update_action(action_id):
    action = Action.query.get_or_404(action_id)
    data = request.get_json()
    action.nome = data.get('nome', action.nome)
    action.areas = data.get('areas', action.areas)
    action.sinergia = data.get('sinergia', action.sinergia)
    action.penalidade_planejado = data.get('penalidadeFinanceiraPlanejado', action.penalidade_planejado)
    action.penalidade_nao_planejado = data.get('penalidadeFinanceiraNaoPlanejado', action.penalidade_nao_planejado)
    db.session.commit()
    return jsonify(action.to_dict())


@gamification_bp.route('/actions/<int:action_id>', methods=['DELETE'])
@jwt_required()
def delete_action(action_id):
    action = Action.query.get_or_404(action_id)
    db.session.delete(action)
    db.session.commit()
    return '', 204


# --- Events ---

@gamification_bp.route('/events', methods=['GET'])
@jwt_required()
def list_events():
    user_id = get_current_user_id()
    days = request.args.get('days', 30, type=int)
    since = date.today() - timedelta(days=days)
    events = Event.query.filter(
        Event.user_id == user_id,
        Event.data >= since,
    ).order_by(Event.data.desc()).all()

    result = []
    for ev in events:
        ev_dict = ev.to_dict()
        ev_dict['actionNome'] = ev.action.nome if ev.action else None
        result.append(ev_dict)
    return jsonify(result)


@gamification_bp.route('/events', methods=['POST'])
@jwt_required()
def create_event():
    """Create event, calculate XP, check level up, evaluate trophies."""
    data = request.get_json()
    user_id = get_current_user_id()
    user = User.query.get(user_id)
    action = Action.query.get(data['actionId'])
    if not action:
        return jsonify({'error': 'Action not found'}), 404

    event = Event(
        user_id=user_id,
        action_id=data['actionId'],
        descricao=data.get('descricao', ''),
        gasto_planejado=data.get('gastoPlanejado', False),
        data=date.fromisoformat(data.get('data', date.today().isoformat())),
    )
    db.session.add(event)

    # XP = sum of area points + synergy bonus
    xp_gained = sum(action.areas.values())
    if action.sinergia and len(action.areas) >= 2:
        xp_gained += len(action.areas)
    user.experience += xp_gained

    leveled_up = process_level_up(user)
    new_trophies = evaluate_trophies(user)

    db.session.commit()

    return jsonify({
        'event': event.to_dict(),
        'xpGained': xp_gained,
        'leveledUp': leveled_up,
        'newTrophies': [t.to_dict() for t in new_trophies],
        'user': user.to_dict(),
    }), 201


# --- Score ---

@gamification_bp.route('/score', methods=['GET'])
@jwt_required()
def get_score():
    user_id = get_current_user_id()
    target_date = request.args.get('date', date.today().isoformat())
    score = calculate_daily_score(user_id, target_date)
    return jsonify(score)


@gamification_bp.route('/score/history', methods=['GET'])
@jwt_required()
def get_score_history():
    user_id = get_current_user_id()
    days = request.args.get('days', 30, type=int)
    history = calculate_score_history(user_id, days)
    return jsonify(history)


# --- Trophies ---

@gamification_bp.route('/trophies', methods=['GET'])
@jwt_required()
def list_trophies():
    trophies = Trophy.query.all()
    return jsonify([t.to_dict() for t in trophies])


@gamification_bp.route('/trophies', methods=['POST'])
@jwt_required()
def create_trophy():
    data = request.get_json()
    trophy = Trophy(
        nome=data['nome'],
        descricao=data.get('descricao', ''),
        criteria=data['criteria'],
        recompensa=data['recompensa'],
    )
    db.session.add(trophy)
    db.session.commit()
    return jsonify(trophy.to_dict()), 201


@gamification_bp.route('/trophies/<int:trophy_id>', methods=['PUT'])
@jwt_required()
def update_trophy(trophy_id):
    trophy = Trophy.query.get_or_404(trophy_id)
    data = request.get_json()
    trophy.nome = data.get('nome', trophy.nome)
    trophy.descricao = data.get('descricao', trophy.descricao)
    trophy.criteria = data.get('criteria', trophy.criteria)
    trophy.recompensa = data.get('recompensa', trophy.recompensa)
    db.session.commit()
    return jsonify(trophy.to_dict())


@gamification_bp.route('/trophies/<int:trophy_id>', methods=['DELETE'])
@jwt_required()
def delete_trophy(trophy_id):
    trophy = Trophy.query.get_or_404(trophy_id)
    db.session.delete(trophy)
    db.session.commit()
    return '', 204


@gamification_bp.route('/trophies/earned', methods=['GET'])
@jwt_required()
def earned_trophies():
    user_id = get_current_user_id()
    earned = UserTrophy.query.filter_by(user_id=user_id).all()
    result = []
    for ut in earned:
        trophy_dict = ut.trophy.to_dict()
        trophy_dict['earnedAt'] = ut.earned_at.isoformat()
        result.append(trophy_dict)
    return jsonify(result)
