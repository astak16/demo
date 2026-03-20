from flask import jsonify, g
from app.libs.error_code import AuthFailed, DeleteSuccess, NotFound
from app.libs.redprint import Redprint
from app.libs.token_auth import auth
from app.models.user import User
from app.models.base import db

api = Redprint("user")


# class Uccs:
#     name = "uccs"
#     age = 18

#     def __init__(
#         self,
#     ):
#         self.name = "astak"


@api.route("/<int:uid>", methods=["GET"])
@auth.login_required
def super_get_user(uid):
    # is_admin = g.user.is_admin
    # if not is_admin:
    #     raise AuthFailed()
    user = User.query.filter_by(id=uid).first_or_404()
    return jsonify(user)


@api.route("", methods=["GET"])
@auth.login_required
def get_user():
    uid = g.user.uid
    user = User.query.filter_by(id=uid).first_or_404()
    return jsonify(user)


@api.route("/<int:uid>", methods=["DELETE"])
def super_delete_user(uid): ...


@api.route("", methods=["DELETE"])
@auth.login_required
def delete_user():
    uid = g.user.uid

    with db.auto_commit():
        user = User.query.filter_by(id=uid).first_or_404()
        user.delete()
    return DeleteSuccess()
