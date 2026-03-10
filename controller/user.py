from flask import Blueprint, make_response, session
from common.utils import ImageCode
from model.user import User


user = Blueprint("user", __name__)


@user.route("/user")
def get_one():
    user = User()
    result = user.get_one()
    print(result)
    return "获取用户成功"


@user.route("/vcode")
def vcode():
    code, bstring = ImageCode().get_code()
    response = make_response(bstring)
    response.headers["Content-Type"] = "image/jpeg"
    session["vcode"] = code.lower()
    return response
