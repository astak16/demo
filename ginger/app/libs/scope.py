class Scope:
    allow_api = []
    allow_module = []
    forbidden = []

    def __add__(self, other):
        self.allow_api = self.allow_api + other.allow_api
        self.allow_api = list(set(self.allow_api))

        self.allow_module = self.allow_module + other.allow_module
        self.allow_module = list(set(self.allow_module))

        self.forbidden = self.forbidden + other.forbidden
        self.forbidden = list(set(self.forbidden))

        return self


class AdminScope(Scope):
    allow_api = ["v1.super_get_user", "v1.super_delete_user"]
    # allow_module = ["v1.user"]

    def __init__(self):
        self + UserScope()
        ...


class UserScope(Scope):
    allow_api = ["v1.user+get_user", "v1.user+delete_user", "v1.gift+create"]
    # forbidden = ["v1.super_get_user", "v1.super_delete_user"]
    # allow_module = ["v1.user"]

    def __init__(self):
        # self + AdminScope()
        ...


def is_in_scope(scope, endpoint):
    scope = globals().get(scope)
    splits = endpoint.split("+")
    red_name = splits[0]
    if not scope:
        return False
    if endpoint in scope().forbidden:
        return False
    if endpoint in scope().allow_api:
        return True
    if red_name in scope().allow_module:
        return True
    else:
        return False
