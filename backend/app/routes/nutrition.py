from datetime import date, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import or_
from ..extensions import db
from ..models.nutrition import (
    Food, NutritionProfile, MealPlan, MealPlanItem, FoodLog,
    MEAL_TYPES, MEAL_TYPE_LABELS,
)
from ..services.nutrition import (
    calculate_full_profile, suggest_meal_plan, GOAL_LABELS,
    ACTIVITY_MULTIPLIERS,
)
from .auth_helpers import get_current_user_id

nutrition_bp = Blueprint('nutrition', __name__)


# --- Foods ---

@nutrition_bp.route('/foods', methods=['GET'])
@jwt_required()
def search_foods():
    """Search foods with pagination."""
    user_id = get_current_user_id()
    q = request.args.get('q', '').strip()
    category = request.args.get('category', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 30, type=int)

    query = Food.query.filter(
        or_(Food.user_id == None, Food.user_id == user_id)
    )

    if q:
        query = query.filter(Food.name.ilike(f'%{q}%'))
    if category:
        query = query.filter(Food.category == category)

    query = query.order_by(Food.name)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'foods': [f.to_dict() for f in pagination.items],
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
    })


@nutrition_bp.route('/foods', methods=['POST'])
@jwt_required()
def create_food():
    """Create a custom food."""
    user_id = get_current_user_id()
    data = request.get_json()

    food = Food(
        user_id=user_id,
        name=data['name'],
        category=data.get('category', 'Personalizado'),
        calories_per_100g=data.get('caloriesPer100g', 0),
        protein_per_100g=data.get('proteinPer100g', 0),
        carbs_per_100g=data.get('carbsPer100g', 0),
        fat_per_100g=data.get('fatPer100g', 0),
        fiber_per_100g=data.get('fiberPer100g', 0),
        sodium_per_100g=data.get('sodiumPer100g', 0),
        is_custom=True,
    )
    db.session.add(food)
    db.session.commit()
    return jsonify(food.to_dict()), 201


@nutrition_bp.route('/foods/categories', methods=['GET'])
@jwt_required()
def food_categories():
    """Return all food categories."""
    user_id = get_current_user_id()
    rows = db.session.query(Food.category).filter(
        or_(Food.user_id == None, Food.user_id == user_id),
        Food.category != None,
    ).distinct().order_by(Food.category).all()
    return jsonify([r[0] for r in rows if r[0]])


# --- Nutrition Profile ---

@nutrition_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get nutrition profile for the current user."""
    user_id = get_current_user_id()
    profile = NutritionProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return jsonify(None)
    return jsonify(profile.to_dict())


@nutrition_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Create or update nutrition profile and recalculate TMB/TDEE/macros."""
    user_id = get_current_user_id()
    data = request.get_json()

    profile = NutritionProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        profile = NutritionProfile(user_id=user_id)
        db.session.add(profile)

    profile.age = data['age']
    profile.sex = data['sex']
    profile.weight_kg = data['weightKg']
    profile.height_cm = data['heightCm']
    profile.activity_level = data['activityLevel']
    profile.goal = data['goal']

    # Calculate TMB/TDEE/macros
    result = calculate_full_profile(
        profile.sex, profile.weight_kg, profile.height_cm,
        profile.age, profile.activity_level, profile.goal,
    )
    profile.tmb = result['tmb']
    profile.tdee = result['tdee']
    profile.target_calories = result['target_calories']
    profile.target_protein_g = result['target_protein_g']
    profile.target_carbs_g = result['target_carbs_g']
    profile.target_fat_g = result['target_fat_g']
    profile.target_fiber_g = result['target_fiber_g']

    db.session.commit()
    return jsonify(profile.to_dict())


@nutrition_bp.route('/profile/options', methods=['GET'])
@jwt_required()
def profile_options():
    """Return available options for profile form (goals, activity levels)."""
    return jsonify({
        'goals': [{'value': k, 'label': v} for k, v in GOAL_LABELS.items()],
        'activityLevels': [
            {'value': 'sedentary', 'label': 'Sedentario (pouco ou nenhum exercicio)'},
            {'value': 'light', 'label': 'Leve (1-3 dias/semana)'},
            {'value': 'moderate', 'label': 'Moderado (3-5 dias/semana)'},
            {'value': 'active', 'label': 'Ativo (6-7 dias/semana)'},
            {'value': 'very_active', 'label': 'Muito ativo (exercicio intenso + trabalho fisico)'},
        ],
        'mealTypes': [{'value': k, 'label': v} for k, v in MEAL_TYPE_LABELS.items()],
    })


# --- Meal Plans ---

@nutrition_bp.route('/meal-plans', methods=['GET'])
@jwt_required()
def list_meal_plans():
    user_id = get_current_user_id()
    plans = MealPlan.query.filter_by(user_id=user_id).order_by(MealPlan.created_at.desc()).all()
    return jsonify([p.to_dict(include_items=False) for p in plans])


@nutrition_bp.route('/meal-plans', methods=['POST'])
@jwt_required()
def create_meal_plan():
    user_id = get_current_user_id()
    data = request.get_json()
    plan = MealPlan(
        user_id=user_id,
        name=data['name'],
        description=data.get('description'),
    )
    db.session.add(plan)
    db.session.commit()
    return jsonify(plan.to_dict()), 201


@nutrition_bp.route('/meal-plans/<int:plan_id>', methods=['GET'])
@jwt_required()
def get_meal_plan(plan_id):
    user_id = get_current_user_id()
    plan = MealPlan.query.filter_by(id=plan_id, user_id=user_id).first_or_404()
    return jsonify(plan.to_dict())


@nutrition_bp.route('/meal-plans/<int:plan_id>', methods=['PUT'])
@jwt_required()
def update_meal_plan(plan_id):
    user_id = get_current_user_id()
    plan = MealPlan.query.filter_by(id=plan_id, user_id=user_id).first_or_404()
    data = request.get_json()
    if 'name' in data:
        plan.name = data['name']
    if 'description' in data:
        plan.description = data['description']
    if 'active' in data:
        plan.active = data['active']
    db.session.commit()
    return jsonify(plan.to_dict())


@nutrition_bp.route('/meal-plans/<int:plan_id>', methods=['DELETE'])
@jwt_required()
def delete_meal_plan(plan_id):
    user_id = get_current_user_id()
    plan = MealPlan.query.filter_by(id=plan_id, user_id=user_id).first_or_404()
    db.session.delete(plan)
    db.session.commit()
    return '', 204


# --- Meal Plan Items ---

@nutrition_bp.route('/meal-plans/<int:plan_id>/items', methods=['POST'])
@jwt_required()
def add_plan_item(plan_id):
    user_id = get_current_user_id()
    plan = MealPlan.query.filter_by(id=plan_id, user_id=user_id).first_or_404()
    data = request.get_json()

    item = MealPlanItem(
        meal_plan_id=plan.id,
        food_id=data['foodId'],
        meal_type=data['mealType'],
        quantity_grams=data.get('quantityGrams', 100),
        order=data.get('order', 0),
    )
    db.session.add(item)

    # Recalculate total calories
    db.session.flush()
    _update_plan_totals(plan)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@nutrition_bp.route('/meal-plans/<int:plan_id>/items/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_plan_item(plan_id, item_id):
    user_id = get_current_user_id()
    plan = MealPlan.query.filter_by(id=plan_id, user_id=user_id).first_or_404()
    item = MealPlanItem.query.filter_by(id=item_id, meal_plan_id=plan.id).first_or_404()
    data = request.get_json()

    if 'foodId' in data:
        item.food_id = data['foodId']
    if 'mealType' in data:
        item.meal_type = data['mealType']
    if 'quantityGrams' in data:
        item.quantity_grams = data['quantityGrams']
    if 'order' in data:
        item.order = data['order']

    _update_plan_totals(plan)
    db.session.commit()
    return jsonify(item.to_dict())


@nutrition_bp.route('/meal-plans/<int:plan_id>/items/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_plan_item(plan_id, item_id):
    user_id = get_current_user_id()
    plan = MealPlan.query.filter_by(id=plan_id, user_id=user_id).first_or_404()
    item = MealPlanItem.query.filter_by(id=item_id, meal_plan_id=plan.id).first_or_404()
    db.session.delete(item)
    _update_plan_totals(plan)
    db.session.commit()
    return '', 204


def _update_plan_totals(plan):
    """Recalculate total calories for a meal plan."""
    total = 0
    for item in plan.items:
        if item.food:
            total += item.food.calories_per_100g * item.quantity_grams / 100
    plan.total_calories = round(total)


@nutrition_bp.route('/meal-plans/suggest', methods=['POST'])
@jwt_required()
def suggest_plan():
    """Auto-generate a meal plan based on user targets."""
    user_id = get_current_user_id()
    profile = NutritionProfile.query.filter_by(user_id=user_id).first()
    if not profile or not profile.target_calories:
        return jsonify({'error': 'Crie seu perfil nutricional primeiro'}), 400

    # Get commonly used foods (TACO + user custom)
    foods = Food.query.filter(
        or_(Food.user_id == None, Food.user_id == user_id),
        Food.calories_per_100g > 0,
    ).order_by(Food.calories_per_100g).all()

    if not foods:
        return jsonify({'error': 'Nenhum alimento cadastrado. Execute flask seed-taco primeiro.'}), 400

    # Create the plan
    plan = MealPlan(
        user_id=user_id,
        name=f'Plano sugerido ({round(profile.target_calories)} kcal)',
        description=f'Gerado automaticamente - {profile.target_calories} kcal/dia',
    )
    db.session.add(plan)
    db.session.flush()

    # Generate suggestions
    suggestions = suggest_meal_plan(
        foods, profile.target_calories,
        profile.target_protein_g, profile.target_carbs_g, profile.target_fat_g,
    )

    for idx, s in enumerate(suggestions):
        item = MealPlanItem(
            meal_plan_id=plan.id,
            food_id=s['food_id'],
            meal_type=s['meal_type'],
            quantity_grams=s['quantity_grams'],
            order=idx,
        )
        db.session.add(item)

    db.session.flush()
    _update_plan_totals(plan)
    db.session.commit()

    return jsonify(plan.to_dict()), 201


# --- Food Log ---

@nutrition_bp.route('/log', methods=['GET'])
@jwt_required()
def get_food_log():
    """Get food log for a specific date."""
    user_id = get_current_user_id()
    date_str = request.args.get('date')
    target_date = date.fromisoformat(date_str) if date_str else date.today()

    entries = FoodLog.query.filter_by(
        user_id=user_id, date=target_date,
    ).order_by(FoodLog.meal_type, FoodLog.created_at).all()

    return jsonify([e.to_dict() for e in entries])


@nutrition_bp.route('/log', methods=['POST'])
@jwt_required()
def add_food_log():
    """Add a food log entry."""
    user_id = get_current_user_id()
    data = request.get_json()

    entry = FoodLog(
        user_id=user_id,
        date=date.fromisoformat(data['date']) if data.get('date') else date.today(),
        food_id=data['foodId'],
        meal_type=data['mealType'],
        quantity_grams=data.get('quantityGrams', 100),
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify(entry.to_dict()), 201


@nutrition_bp.route('/log/<int:log_id>', methods=['DELETE'])
@jwt_required()
def delete_food_log(log_id):
    user_id = get_current_user_id()
    entry = FoodLog.query.filter_by(id=log_id, user_id=user_id).first_or_404()
    db.session.delete(entry)
    db.session.commit()
    return '', 204


@nutrition_bp.route('/log/from-plan', methods=['POST'])
@jwt_required()
def copy_plan_to_log():
    """Copy a meal plan to today's food log."""
    user_id = get_current_user_id()
    data = request.get_json()
    plan_id = data['planId']
    target_date = date.fromisoformat(data['date']) if data.get('date') else date.today()

    plan = MealPlan.query.filter_by(id=plan_id, user_id=user_id).first_or_404()

    created = 0
    for item in plan.items:
        entry = FoodLog(
            user_id=user_id,
            date=target_date,
            food_id=item.food_id,
            meal_type=item.meal_type,
            quantity_grams=item.quantity_grams,
        )
        db.session.add(entry)
        created += 1

    db.session.commit()
    return jsonify({'created': created}), 201


# --- Summary & History ---

@nutrition_bp.route('/summary', methods=['GET'])
@jwt_required()
def daily_summary():
    """Daily nutrition summary: consumed vs targets."""
    user_id = get_current_user_id()
    date_str = request.args.get('date')
    target_date = date.fromisoformat(date_str) if date_str else date.today()

    entries = FoodLog.query.filter_by(user_id=user_id, date=target_date).all()

    consumed = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0, 'fiber': 0}
    by_meal = {}

    for e in entries:
        if not e.food:
            continue
        factor = e.quantity_grams / 100
        cal = e.food.calories_per_100g * factor
        prot = e.food.protein_per_100g * factor
        carb = e.food.carbs_per_100g * factor
        fat = e.food.fat_per_100g * factor
        fib = e.food.fiber_per_100g * factor

        consumed['calories'] += cal
        consumed['protein'] += prot
        consumed['carbs'] += carb
        consumed['fat'] += fat
        consumed['fiber'] += fib

        if e.meal_type not in by_meal:
            by_meal[e.meal_type] = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0, 'fiber': 0,
                                    'label': MEAL_TYPE_LABELS.get(e.meal_type, e.meal_type)}
        by_meal[e.meal_type]['calories'] += cal
        by_meal[e.meal_type]['protein'] += prot
        by_meal[e.meal_type]['carbs'] += carb
        by_meal[e.meal_type]['fat'] += fat
        by_meal[e.meal_type]['fiber'] += fib

    # Round values
    for key in consumed:
        consumed[key] = round(consumed[key], 1)
    for meal in by_meal.values():
        for key in ['calories', 'protein', 'carbs', 'fat', 'fiber']:
            meal[key] = round(meal[key], 1)

    # Get targets
    profile = NutritionProfile.query.filter_by(user_id=user_id).first()
    targets = None
    if profile:
        targets = {
            'calories': profile.target_calories,
            'protein': profile.target_protein_g,
            'carbs': profile.target_carbs_g,
            'fat': profile.target_fat_g,
            'fiber': profile.target_fiber_g,
        }

    return jsonify({
        'date': target_date.isoformat(),
        'consumed': consumed,
        'targets': targets,
        'byMeal': by_meal,
        'entryCount': len(entries),
    })


@nutrition_bp.route('/history', methods=['GET'])
@jwt_required()
def calorie_history():
    """Calorie history for the last N days."""
    user_id = get_current_user_id()
    days = request.args.get('days', 30, type=int)
    since = date.today() - timedelta(days=days)

    entries = FoodLog.query.filter(
        FoodLog.user_id == user_id,
        FoodLog.date >= since,
    ).all()

    # Group by date
    daily = {}
    for e in entries:
        d = e.date.isoformat()
        if d not in daily:
            daily[d] = {'date': d, 'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
        if e.food:
            factor = e.quantity_grams / 100
            daily[d]['calories'] += e.food.calories_per_100g * factor
            daily[d]['protein'] += e.food.protein_per_100g * factor
            daily[d]['carbs'] += e.food.carbs_per_100g * factor
            daily[d]['fat'] += e.food.fat_per_100g * factor

    # Round and sort
    result = sorted(daily.values(), key=lambda x: x['date'])
    for d in result:
        d['calories'] = round(d['calories'])
        d['protein'] = round(d['protein'], 1)
        d['carbs'] = round(d['carbs'], 1)
        d['fat'] = round(d['fat'], 1)

    profile = NutritionProfile.query.filter_by(user_id=user_id).first()
    target_calories = profile.target_calories if profile else None

    return jsonify({
        'history': result,
        'targetCalories': target_calories,
    })
