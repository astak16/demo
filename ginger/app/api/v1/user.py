from app.libs.redprint import Redprint
from app.libs.token_auth import auth

api = Redprint("user")


@api.route("")
@auth.login_required
def get_user():
    return "get user"
