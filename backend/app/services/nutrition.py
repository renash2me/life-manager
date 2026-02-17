"""Nutrition service - TMB/TDEE calculation, macro targets, diet suggestion."""


# Activity level multipliers (Harris-Benedict / Mifflin-St Jeor standard)
ACTIVITY_MULTIPLIERS = {
    'sedentary': 1.2,       # Pouco ou nenhum exercicio
    'light': 1.375,         # Exercicio leve 1-3 dias/semana
    'moderate': 1.55,       # Exercicio moderado 3-5 dias/semana
    'active': 1.725,        # Exercicio intenso 6-7 dias/semana
    'very_active': 1.9,     # Exercicio muito intenso, trabalho fisico
}

# Caloric adjustment by goal (kcal/day)
GOAL_ADJUSTMENTS = {
    'lose_fast': -750,   # Perder rapido (~0.75 kg/semana)
    'lose': -500,        # Perder (~0.5 kg/semana)
    'maintain': 0,       # Manter peso
    'gain': 300,         # Ganhar massa (~0.3 kg/semana)
    'gain_fast': 500,    # Ganhar massa rapido (~0.5 kg/semana)
}

GOAL_LABELS = {
    'lose_fast': 'Perder peso rapido',
    'lose': 'Perder peso',
    'maintain': 'Manter peso',
    'gain': 'Ganhar massa',
    'gain_fast': 'Ganhar massa rapido',
}

# Macro distribution by goal (protein%, carbs%, fat%)
MACRO_DISTRIBUTIONS = {
    'lose_fast': (0.35, 0.25, 0.40),
    'lose': (0.35, 0.30, 0.35),
    'maintain': (0.25, 0.45, 0.30),
    'gain': (0.30, 0.45, 0.25),
    'gain_fast': (0.25, 0.50, 0.25),
}

# Calorie distribution by meal type (for diet suggestion)
MEAL_CALORIE_WEIGHTS = {
    'cafe_da_manha': 0.20,
    'lanche_da_manha': 0.08,
    'almoco': 0.30,
    'lanche_da_tarde': 0.08,
    'jantar': 0.25,
    'ceia': 0.04,
    'pre_treino': 0.03,
    'pos_treino': 0.02,
}


def calc_tmb(sex, weight_kg, height_cm, age):
    """Calculate TMB (Taxa Metabolica Basal) using Mifflin-St Jeor equation.

    Male:   10 * peso + 6.25 * altura_cm - 5 * idade + 5
    Female: 10 * peso + 6.25 * altura_cm - 5 * idade - 161
    """
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    if sex == 'male':
        return round(base + 5)
    else:
        return round(base - 161)


def calc_tdee(tmb, activity_level):
    """Calculate TDEE (Total Daily Energy Expenditure)."""
    multiplier = ACTIVITY_MULTIPLIERS.get(activity_level, 1.55)
    return round(tmb * multiplier)


def calc_targets(tdee, goal):
    """Calculate calorie and macro targets based on goal."""
    adjustment = GOAL_ADJUSTMENTS.get(goal, 0)
    target_calories = max(1200, tdee + adjustment)  # Minimum 1200 kcal

    prot_pct, carb_pct, fat_pct = MACRO_DISTRIBUTIONS.get(goal, (0.25, 0.45, 0.30))

    # Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g
    target_protein_g = round(target_calories * prot_pct / 4)
    target_carbs_g = round(target_calories * carb_pct / 4)
    target_fat_g = round(target_calories * fat_pct / 9)

    # Fiber: 14g per 1000 kcal (recommendation)
    target_fiber_g = round(target_calories * 14 / 1000)

    return {
        'target_calories': round(target_calories),
        'target_protein_g': target_protein_g,
        'target_carbs_g': target_carbs_g,
        'target_fat_g': target_fat_g,
        'target_fiber_g': target_fiber_g,
    }


def calculate_full_profile(sex, weight_kg, height_cm, age, activity_level, goal):
    """Calculate complete nutrition profile."""
    tmb = calc_tmb(sex, weight_kg, height_cm, age)
    tdee = calc_tdee(tmb, activity_level)
    targets = calc_targets(tdee, goal)
    return {
        'tmb': tmb,
        'tdee': tdee,
        **targets,
    }


def suggest_meal_plan(foods, target_calories, target_protein_g, target_carbs_g, target_fat_g):
    """Generate a meal plan suggestion using a greedy algorithm.

    Distributes foods across meals respecting calorie budgets per meal.
    Returns list of (food_id, meal_type, quantity_grams) tuples.
    """
    if not foods:
        return []

    # Sort foods by protein density (good heuristic for balanced meals)
    sorted_foods = sorted(foods, key=lambda f: f.protein_per_100g, reverse=True)

    plan_items = []
    remaining_cal = target_calories

    for meal_type, weight in MEAL_CALORIE_WEIGHTS.items():
        meal_budget = target_calories * weight
        meal_cal = 0

        for food in sorted_foods:
            if meal_cal >= meal_budget:
                break
            if food.calories_per_100g <= 0:
                continue

            # Calculate how much of this food fits in the remaining meal budget
            remaining_meal = meal_budget - meal_cal
            max_grams = (remaining_meal / food.calories_per_100g) * 100
            # Clamp to reasonable portion sizes
            portion = min(max_grams, 200)
            portion = max(portion, 30)
            portion = round(portion / 5) * 5  # Round to nearest 5g

            actual_cal = food.calories_per_100g * portion / 100
            if meal_cal + actual_cal > meal_budget * 1.1:
                continue

            plan_items.append({
                'food_id': food.id,
                'meal_type': meal_type,
                'quantity_grams': portion,
            })
            meal_cal += actual_cal

        remaining_cal -= meal_cal

    return plan_items
