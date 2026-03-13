import hashlib
import json
import re
from flask import Blueprint, make_response, session, request, url_for
from common import response_message
from common.email_utils import gen_email_code, send_email
from common.utils import ImageCode
from model.user import User
from app.config.config import config
from app.settings import env


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
    email = json.loads(request.data).get("email")
    if email is None:
        return response_message.UserMessage.error("请输入邮箱地址")
    if not re.match(r".+@.+\..+", email):
        return response_message.UserMessage.error("请输入正确的邮箱地址")
    code = gen_email_code()
    try:
        print("邮箱验证码: ", code)
        session["ecode"] = code.lower()
        send_email(email, code)
        return response_message.UserMessage.success("验证码已发送")
    except Exception as e:
        print(e)
        return response_message.UserMessage.error("验证码发送失败")


@user.route("/register", methods=["post"])
def register():
    request_data = json.loads(request.data)
    username = request_data.get("username")
    password = request_data.get("password")
    second_password = request_data.get("second_password")
    ecode = request_data.get("ecode")
    if ecode.lower() != session.get("ecode"):
        return response_message.UserMessage.error("邮箱验证码错误")
    if not re.match(r".+@.+\..+", username):
        return response_message.UserMessage.error("请输入正确的邮箱地址")
    if len(password) < 6:
        return response_message.UserMessage.error("密码长度不能小于6位")
    if password != second_password:
        return response_message.UserMessage.error("两次输入的密码不一致")
    user = User()
    if len(user.find_by_username(username=username)) > 0:
        return response_message.UserMessage.error("用户名已存在")

    password = hashlib.md5(password.encode()).hexdigest()
    result = user.do_register(username=username, password=password)

    return response_message.UserMessage.success("注册成功")


@user.route("/login", methods=["post"])
def login():
    request_data = json.loads(request.data)
    username = request_data.get("username")
    password = request_data.get("password")
    vcode = request_data.get("vcode")
    if vcode.lower() != session.get("vcode"):
        return response_message.UserMessage.error("验证码错误")

    password = hashlib.md5(password.encode()).hexdigest()
    user = User()
    result = user.find_by_username(username=username)

    if len(result) == 0:
        return response_message.UserMessage.error("用户名不存在")
    if result[0].password != password:
        return response_message.UserMessage.error("密码错误")

    session["is_login"] = "true"
    session["user_id"] = result[0].user_id
    session["username"] = username
    session["nickname"] = result[0].nickname
    session["picture"] = config[env].user_header_image_path + result[0].picture
    response = make_response(response_message.UserMessage.success("登录成功"))
    response.set_cookie("username", username, max_age=30 * 24 * 3600)
    return response


@user.route("/logout")
def logout():
    session.clear()
    response = make_response(response_message.UserMessage.success("退出登录成功"), 302)
    response.headers["Location"] = url_for("index.home")
    response.delete_cookie("username")
    return response
