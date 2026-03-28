from flask_login import login_required
from app.models.gift import Gift
from . import web
from app.models.base import db


@web.route("/my/gifts")
@login_required
def my_gifts():
    return "我的赠送页面"


@web.route("/gifts/book/<isbn>")
def save_to_gifts(isbn):
    gift = Gift()
    gift.isbn = isbn
    db.session.add(gift)
    db.session.commit()
    return "添加到赠送清单的页面，书籍isbn是%s" % isbn


@web.route("/gifts/<gid>/redraw")
def redraw_from_gifts(gid):
    return "从赠送清单中撤销页面，书籍id是%d" % gid
