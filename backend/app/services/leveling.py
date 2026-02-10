def process_level_up(user):
    """
    Check if user has enough XP to level up.
    XP threshold scales by 1.2x per level.
    Ported from Better Life/server/index.js level-up logic.
    """
    leveled_up = False
    while user.experience >= user.next_level_exp:
        user.level += 1
        user.experience -= user.next_level_exp
        user.next_level_exp = int(user.next_level_exp * 1.2)
        leveled_up = True
    return leveled_up
