from . import web

__author__ = "七月"


@web.route("/my/wish")
def my_wish():
    return "我的心愿页面"


@web.route("/wish/book/<isbn>")
def save_to_wish(isbn):
    return "我的心愿页面"


@web.route("/satisfy/wish/<int:wid>")
def satisfy_wish(wid):
    return "满足心愿页面，心愿id是%d" % wid


@web.route("/wish/book/<isbn>/redraw")
def redraw_from_wish(isbn):
    return "从心愿清单中撤销页面，书籍isbn是%s" % isbn
