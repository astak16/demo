from app.libs.redprint import Redprint

api = Redprint("user")


@api.route("/get")
def get_user():
    return "get user"
