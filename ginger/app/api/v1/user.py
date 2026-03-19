from flask import jsonify
from app.libs.error_code import NotFound
from app.libs.redprint import Redprint
from app.libs.token_auth import auth
from app.models.user import User

api = Redprint("user")


class Uccs:
    name = "uccs"
    age = 18

    def __init__(
        self,
    ):
        self.name = "astak"


@api.route("/<int:uid>", methods=["GET"])
@auth.login_required
def get_user(uid):
    user = User.query.get_or_404(uid)

    return jsonify(user)
