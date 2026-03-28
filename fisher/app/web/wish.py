from flask import current_app, flash, redirect, url_for
from flask_login import current_user, login_required
from app.models.wish import Wish
from app.web import gift
from . import web
from app.models.base import db


@web.route("/my/wish")
def my_wish():
    return "我的心愿页面"


@web.route("/wish/book/<isbn>")
@login_required
def save_to_wish(isbn):
    if current_user.can_save_to_list(isbn):
        # try:
        with db.auto_commit():
            wish = Wish()
            wish.isbn = isbn
            wish.uid = current_user.id
            db.session.add(wish)
    #     db.session.commit()
    # except Exception as e:
    #     db.session.rollback()
    #     raise e
    else:
        flash("这本书已经添加至你的赠送清单或心愿清单，请不要重复添加")
    return redirect(url_for("web.book_detail", isbn=isbn))


@web.route("/satisfy/wish/<int:wid>")
def satisfy_wish(wid):
    return "满足心愿页面，心愿id是%d" % wid


@web.route("/wish/book/<isbn>/redraw")
def redraw_from_wish(isbn):
    return "从心愿清单中撤销页面，书籍isbn是%s" % isbn
