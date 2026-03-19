class AdminScope:
    allow_api = ["v1.super_get_user"]


class UserScope:
    allow_api = []


def is_in_scope(scope, endpoint):
    scope = globals().get(scope)
    if not scope:
        return False

    if endpoint in scope().allow_api:
        return True
    else:
        return False
