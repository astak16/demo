import re

from flask import Blueprint, make_response, session, request
from common import response_message
from common.email_utils import gen_email_code, send_email
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


@user.route("/ecode", methods=["post"])
def email_code():
    email = request.form.get("email")
    if email is None:
        return response_message.UserMessage.error("请输入邮箱地址")
    if not re.match(r".+@.+\..+", email):
        return response_message.UserMessage.error("请输入正确的邮箱地址")
    code = gen_email_code()
    try:
        send_email(email, code)
        session["ecode"] = code.lower()
        return response_message.UserMessage.success("验证码已发送")
    except Exception as e:
        print(e)
        return response_message.UserMessage.error("验证码发送失败")
