import hashlib
import json
import re
from flask import Blueprint, make_response, session, request
from common import response_message
from common.email_utils import gen_email_code, send_email
from common.redisdb import redis_connect
from model.user import User
from app.config.config import config
from app.settings import env


redis_user = Blueprint("redis_user", __name__)


redis_client = redis_connect()


@redis_user.route("/redis/ecode", methods=["post"])
def email_code():
    email = json.loads(request.data).get("email")
    if email is None:
        return response_message.UserMessage.error("请输入邮箱地址")
    if not re.match(r".+@.+\..+", email):
        return response_message.UserMessage.error("请输入正确的邮箱地址")
    code = gen_email_code()
    try:
        print("邮箱验证码: ", code)
        email_vcode = "email:" + email
        redis_client.set(email_vcode, code.lower())
        redis_client.expire(email_vcode, 5 * 60)
        send_email(email, code)
        return response_message.UserMessage.success("验证码已发送")
    except Exception as e:
        print(e)
        return response_message.UserMessage.error("验证码发送失败")


@redis_user.route("/redis/register", methods=["post"])
def register():
    request_data = json.loads(request.data)
    username = request_data.get("username")
    password = request_data.get("password")
    second_password = request_data.get("second_password")
    ecode = request_data.get("ecode")
    redis_ecode = redis_client.get("email:" + username)
    if ecode.lower() != redis_ecode:
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


@redis_user.route("/redis/login", methods=["post"])
def login():
    request_data = json.loads(request.data)
    username = request_data.get("username")
    password = request_data.get("password")
    vcode = request_data.get("vcode")
    if vcode.lower() != session.get("vcode"):
        return response_message.UserMessage.error("验证码错误")

    password = hashlib.md5(password.encode()).hexdigest()
    # mysql_to_redis_string()
    result = redis_client.get("user:" + username)
    if result is None:
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
    else:
        result = eval(result)
        if result.get("password") == password:
            response = make_response(response_message.UserMessage.success("登录成功"))
            # response.set_cookie("username", username, max_age=30 * 24 * 3600)
            return response
        else:
            return response_message.UserMessage.error("密码错误")
