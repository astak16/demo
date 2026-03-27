from . import web

__author__ = "七月"


@web.route("/my/gifts")
def my_gifts():
    return "我的赠送页面"


@web.route("/gifts/book/<isbn>")
def save_to_gifts(isbn):
    return "添加到赠送清单页面，书籍isbn是%s" % isbn


@web.route("/gifts/<gid>/redraw")
def redraw_from_gifts(gid):
    return "从赠送清单中撤销页面，书籍id是%d" % gid
