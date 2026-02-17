from datetime import datetime, timezone
from ..extensions import db


class Food(db.Model):
    """Food items - TACO database + user custom foods."""
    __tablename__ = 'foods'

    id = db.Column(db.Integer, primary_key=True)
    taco_id = db.Column(db.Integer, nullable=True, unique=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), nullable=True)
    calories_per_100g = db.Column(db.Float, nullable=False, default=0)
    protein_per_100g = db.Column(db.Float, nullable=False, default=0)
    carbs_per_100g = db.Column(db.Float, nullable=False, default=0)
    fat_per_100g = db.Column(db.Float, nullable=False, default=0)
    fiber_per_100g = db.Column(db.Float, nullable=False, default=0)
    sodium_per_100g = db.Column(db.Float, nullable=False, default=0)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    is_custom = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'tacoId': self.taco_id,
            'name': self.name,
            'category': self.category,
            'caloriesPer100g': self.calories_per_100g,
            'proteinPer100g': self.protein_per_100g,
            'carbsPer100g': self.carbs_per_100g,
            'fatPer100g': self.fat_per_100g,
            'fiberPer100g': self.fiber_per_100g,
            'sodiumPer100g': self.sodium_per_100g,
            'isCustom': self.is_custom,
        }


class NutritionProfile(db.Model):
    """User nutrition profile - TMB/TDEE and macro targets."""
    __tablename__ = 'nutrition_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    age = db.Column(db.Integer, nullable=False)
    sex = db.Column(db.String(10), nullable=False)  # 'male' or 'female'
    weight_kg = db.Column(db.Float, nullable=False)
    height_cm = db.Column(db.Float, nullable=False)
    activity_level = db.Column(db.String(20), nullable=False)  # sedentary/light/moderate/active/very_active
    goal = db.Column(db.String(20), nullable=False)  # lose_fast/lose/maintain/gain/gain_fast
    tmb = db.Column(db.Float, nullable=True)
    tdee = db.Column(db.Float, nullable=True)
    target_calories = db.Column(db.Float, nullable=True)
    target_protein_g = db.Column(db.Float, nullable=True)
    target_carbs_g = db.Column(db.Float, nullable=True)
    target_fat_g = db.Column(db.Float, nullable=True)
    target_fiber_g = db.Column(db.Float, nullable=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'age': self.age,
            'sex': self.sex,
            'weightKg': self.weight_kg,
            'heightCm': self.height_cm,
            'activityLevel': self.activity_level,
            'goal': self.goal,
            'tmb': self.tmb,
            'tdee': self.tdee,
            'targetCalories': self.target_calories,
            'targetProteinG': self.target_protein_g,
            'targetCarbsG': self.target_carbs_g,
            'targetFatG': self.target_fat_g,
            'targetFiberG': self.target_fiber_g,
        }


class MealPlan(db.Model):
    """Meal plan template."""
    __tablename__ = 'meal_plans'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    total_calories = db.Column(db.Float, nullable=True)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    items = db.relationship('MealPlanItem', backref='meal_plan', cascade='all, delete-orphan',
                           order_by='MealPlanItem.meal_type, MealPlanItem.order')

    def to_dict(self, include_items=True):
        d = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'totalCalories': self.total_calories,
            'active': self.active,
        }
        if include_items:
            d['items'] = [item.to_dict() for item in self.items]
        return d


MEAL_TYPES = [
    'cafe_da_manha', 'lanche_da_manha', 'almoco', 'lanche_da_tarde',
    'jantar', 'ceia', 'pre_treino', 'pos_treino',
]

MEAL_TYPE_LABELS = {
    'cafe_da_manha': 'Cafe da Manha',
    'lanche_da_manha': 'Lanche da Manha',
    'almoco': 'Almoco',
    'lanche_da_tarde': 'Lanche da Tarde',
    'jantar': 'Jantar',
    'ceia': 'Ceia',
    'pre_treino': 'Pre-Treino',
    'pos_treino': 'Pos-Treino',
}


class MealPlanItem(db.Model):
    """Item in a meal plan."""
    __tablename__ = 'meal_plan_items'

    id = db.Column(db.Integer, primary_key=True)
    meal_plan_id = db.Column(db.Integer, db.ForeignKey('meal_plans.id', ondelete='CASCADE'), nullable=False)
    food_id = db.Column(db.Integer, db.ForeignKey('foods.id'), nullable=False)
    meal_type = db.Column(db.String(30), nullable=False)
    quantity_grams = db.Column(db.Float, nullable=False, default=100)
    order = db.Column(db.Integer, default=0)

    food = db.relationship('Food', lazy='joined')

    def to_dict(self):
        factor = self.quantity_grams / 100
        food = self.food
        return {
            'id': self.id,
            'foodId': self.food_id,
            'mealType': self.meal_type,
            'mealTypeLabel': MEAL_TYPE_LABELS.get(self.meal_type, self.meal_type),
            'quantityGrams': self.quantity_grams,
            'order': self.order,
            'food': food.to_dict() if food else None,
            'calories': round(food.calories_per_100g * factor, 1) if food else 0,
            'protein': round(food.protein_per_100g * factor, 1) if food else 0,
            'carbs': round(food.carbs_per_100g * factor, 1) if food else 0,
            'fat': round(food.fat_per_100g * factor, 1) if food else 0,
            'fiber': round(food.fiber_per_100g * factor, 1) if food else 0,
        }


class FoodLog(db.Model):
    """Daily food log entry."""
    __tablename__ = 'food_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    food_id = db.Column(db.Integer, db.ForeignKey('foods.id'), nullable=False)
    meal_type = db.Column(db.String(30), nullable=False)
    quantity_grams = db.Column(db.Float, nullable=False, default=100)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    food = db.relationship('Food', lazy='joined')

    def to_dict(self):
        factor = self.quantity_grams / 100
        food = self.food
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'foodId': self.food_id,
            'mealType': self.meal_type,
            'mealTypeLabel': MEAL_TYPE_LABELS.get(self.meal_type, self.meal_type),
            'quantityGrams': self.quantity_grams,
            'food': food.to_dict() if food else None,
            'calories': round(food.calories_per_100g * factor, 1) if food else 0,
            'protein': round(food.protein_per_100g * factor, 1) if food else 0,
            'carbs': round(food.carbs_per_100g * factor, 1) if food else 0,
            'fat': round(food.fat_per_100g * factor, 1) if food else 0,
            'fiber': round(food.fiber_per_100g * factor, 1) if food else 0,
        }
