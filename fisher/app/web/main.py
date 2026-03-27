from . import web

__author__ = "七月"


@web.route("/")
def index():
    return "鱼书的首页"


@web.route("/personal")
def personal_center():
    return "个人中心页面"
