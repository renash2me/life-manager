"""Seed exercise catalog into the database."""
from ..extensions import db
from ..models.workout_tracking import Exercise

EXERCISES = [
    # Peito
    {'name': 'Supino reto com barra', 'muscle_group': 'chest', 'equipment': 'barbell', 'exercise_type': 'compound'},
    {'name': 'Supino inclinado com halteres', 'muscle_group': 'chest', 'equipment': 'dumbbell', 'exercise_type': 'compound'},
    {'name': 'Supino declinado com barra', 'muscle_group': 'chest', 'equipment': 'barbell', 'exercise_type': 'compound'},
    {'name': 'Crucifixo com halteres', 'muscle_group': 'chest', 'equipment': 'dumbbell', 'exercise_type': 'strength'},
    {'name': 'Cross-over (cabo)', 'muscle_group': 'chest', 'equipment': 'cable', 'exercise_type': 'strength'},
    {'name': 'Flexao de bracos', 'muscle_group': 'chest', 'equipment': 'bodyweight', 'exercise_type': 'compound'},
    {'name': 'Chest press (maquina)', 'muscle_group': 'chest', 'equipment': 'machine', 'exercise_type': 'strength'},

    # Costas
    {'name': 'Barra fixa (pull-up)', 'muscle_group': 'back', 'equipment': 'bodyweight', 'exercise_type': 'compound'},
    {'name': 'Remada curvada com barra', 'muscle_group': 'back', 'equipment': 'barbell', 'exercise_type': 'compound'},
    {'name': 'Remada unilateral com halter', 'muscle_group': 'back', 'equipment': 'dumbbell', 'exercise_type': 'compound'},
    {'name': 'Puxada frontal (pulley)', 'muscle_group': 'back', 'equipment': 'cable', 'exercise_type': 'compound'},
    {'name': 'Remada sentada (cabo)', 'muscle_group': 'back', 'equipment': 'cable', 'exercise_type': 'compound'},
    {'name': 'Levantamento terra', 'muscle_group': 'back', 'equipment': 'barbell', 'exercise_type': 'compound'},
    {'name': 'Pulldown triangulo', 'muscle_group': 'back', 'equipment': 'cable', 'exercise_type': 'strength'},

    # Ombros
    {'name': 'Desenvolvimento militar com barra', 'muscle_group': 'shoulders', 'equipment': 'barbell', 'exercise_type': 'compound'},
    {'name': 'Desenvolvimento com halteres', 'muscle_group': 'shoulders', 'equipment': 'dumbbell', 'exercise_type': 'compound'},
    {'name': 'Elevacao lateral', 'muscle_group': 'shoulders', 'equipment': 'dumbbell', 'exercise_type': 'strength'},
    {'name': 'Elevacao frontal', 'muscle_group': 'shoulders', 'equipment': 'dumbbell', 'exercise_type': 'strength'},
    {'name': 'Crucifixo inverso', 'muscle_group': 'shoulders', 'equipment': 'dumbbell', 'exercise_type': 'strength'},

    # Biceps
    {'name': 'Rosca direta com barra', 'muscle_group': 'biceps', 'equipment': 'barbell', 'exercise_type': 'strength'},
    {'name': 'Rosca alternada com halteres', 'muscle_group': 'biceps', 'equipment': 'dumbbell', 'exercise_type': 'strength'},
    {'name': 'Rosca martelo', 'muscle_group': 'biceps', 'equipment': 'dumbbell', 'exercise_type': 'strength'},
    {'name': 'Rosca concentrada', 'muscle_group': 'biceps', 'equipment': 'dumbbell', 'exercise_type': 'strength'},
    {'name': 'Rosca Scott (banco)', 'muscle_group': 'biceps', 'equipment': 'barbell', 'exercise_type': 'strength'},

    # Triceps
    {'name': 'Triceps testa com barra', 'muscle_group': 'triceps', 'equipment': 'barbell', 'exercise_type': 'strength'},
    {'name': 'Triceps pulley (corda)', 'muscle_group': 'triceps', 'equipment': 'cable', 'exercise_type': 'strength'},
    {'name': 'Triceps francês com halter', 'muscle_group': 'triceps', 'equipment': 'dumbbell', 'exercise_type': 'strength'},
    {'name': 'Mergulho em paralelas', 'muscle_group': 'triceps', 'equipment': 'bodyweight', 'exercise_type': 'compound'},
    {'name': 'Triceps banco', 'muscle_group': 'triceps', 'equipment': 'bodyweight', 'exercise_type': 'strength'},

    # Pernas
    {'name': 'Agachamento livre com barra', 'muscle_group': 'legs', 'equipment': 'barbell', 'exercise_type': 'compound'},
    {'name': 'Leg press 45', 'muscle_group': 'legs', 'equipment': 'machine', 'exercise_type': 'compound'},
    {'name': 'Cadeira extensora', 'muscle_group': 'legs', 'equipment': 'machine', 'exercise_type': 'strength'},
    {'name': 'Mesa flexora', 'muscle_group': 'legs', 'equipment': 'machine', 'exercise_type': 'strength'},
    {'name': 'Agachamento bulgaro', 'muscle_group': 'legs', 'equipment': 'dumbbell', 'exercise_type': 'compound'},
    {'name': 'Passada (afundo)', 'muscle_group': 'legs', 'equipment': 'dumbbell', 'exercise_type': 'compound'},
    {'name': 'Panturrilha em pe (maquina)', 'muscle_group': 'legs', 'equipment': 'machine', 'exercise_type': 'strength'},
    {'name': 'Panturrilha sentado', 'muscle_group': 'legs', 'equipment': 'machine', 'exercise_type': 'strength'},
    {'name': 'Stiff (levantamento terra romeno)', 'muscle_group': 'legs', 'equipment': 'barbell', 'exercise_type': 'compound'},

    # Gluteos
    {'name': 'Hip thrust', 'muscle_group': 'glutes', 'equipment': 'barbell', 'exercise_type': 'compound'},
    {'name': 'Elevacao pelvica', 'muscle_group': 'glutes', 'equipment': 'bodyweight', 'exercise_type': 'strength'},
    {'name': 'Abdutora (maquina)', 'muscle_group': 'glutes', 'equipment': 'machine', 'exercise_type': 'strength'},

    # Abdomen
    {'name': 'Abdominal crunch', 'muscle_group': 'abs', 'equipment': 'bodyweight', 'exercise_type': 'strength'},
    {'name': 'Prancha (isometrico)', 'muscle_group': 'abs', 'equipment': 'bodyweight', 'exercise_type': 'strength'},
    {'name': 'Abdominal infra (elevacao de pernas)', 'muscle_group': 'abs', 'equipment': 'bodyweight', 'exercise_type': 'strength'},
    {'name': 'Abdominal obliquo', 'muscle_group': 'abs', 'equipment': 'bodyweight', 'exercise_type': 'strength'},
    {'name': 'Abdominal na polia', 'muscle_group': 'abs', 'equipment': 'cable', 'exercise_type': 'strength'},

    # Cardio
    {'name': 'Corrida (esteira)', 'muscle_group': 'cardio', 'equipment': 'machine', 'exercise_type': 'cardio'},
    {'name': 'Bicicleta ergometrica', 'muscle_group': 'cardio', 'equipment': 'machine', 'exercise_type': 'cardio'},
    {'name': 'Eliptico', 'muscle_group': 'cardio', 'equipment': 'machine', 'exercise_type': 'cardio'},
    {'name': 'Pular corda', 'muscle_group': 'cardio', 'equipment': 'none', 'exercise_type': 'cardio'},
]


def seed_exercises():
    """Insert exercise catalog into database."""
    created = 0
    skipped = 0

    for ex_data in EXERCISES:
        existing = Exercise.query.filter_by(
            name=ex_data['name'], user_id=None
        ).first()
        if existing:
            skipped += 1
            continue

        exercise = Exercise(
            name=ex_data['name'],
            muscle_group=ex_data['muscle_group'],
            equipment=ex_data.get('equipment', 'none'),
            exercise_type=ex_data.get('exercise_type', 'strength'),
            user_id=None,  # Global exercise
        )
        db.session.add(exercise)
        created += 1

    db.session.commit()
    print(f'Exercises: {created} created, {skipped} skipped (already exist).')
    return created
