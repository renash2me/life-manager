"""Seed TACO foods into the database."""
import json
import os
from ..extensions import db
from ..models.nutrition import Food


def seed_taco_foods():
    """Load TACO foods from JSON and insert into database."""
    json_path = os.path.join(os.path.dirname(__file__), 'taco_foods.json')

    if not os.path.exists(json_path):
        print('ERROR: taco_foods.json not found!')
        return 0

    with open(json_path, 'r', encoding='utf-8') as f:
        foods_data = json.load(f)

    created = 0
    skipped = 0

    for item in foods_data:
        # Skip if already exists (by taco_id)
        existing = Food.query.filter_by(taco_id=item['taco_id']).first()
        if existing:
            skipped += 1
            continue

        food = Food(
            taco_id=item['taco_id'],
            name=item['name'],
            category=item['category'],
            calories_per_100g=item.get('calories', 0),
            protein_per_100g=item.get('protein', 0),
            carbs_per_100g=item.get('carbs', 0),
            fat_per_100g=item.get('fat', 0),
            fiber_per_100g=item.get('fiber', 0),
            sodium_per_100g=item.get('sodium', 0),
            is_custom=False,
        )
        db.session.add(food)
        created += 1

    db.session.commit()
    print(f'TACO: {created} foods created, {skipped} skipped (already exist).')
    return created
