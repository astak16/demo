from flask import current_app, flash, redirect, url_for
from flask_login import current_user, login_required
from app.models.gift import Gift
from . import web
from app.models.base import db


@web.route("/my/gifts")
def my_gifts():
    return "我的赠送页面"


@web.route("/gifts/book/<isbn>")
@login_required
def save_to_gifts(isbn):
    if current_user.can_save_to_list(isbn):
        # try:
        with db.auto_commit():
            gift = Gift()
            gift.isbn = isbn
            gift.uid = current_user.id
            current_user.beans += current_app.config["BEANS_UPLOAD_ONE_BOOK"]
            db.session.add(gift)
    #     db.session.commit()
    # except Exception as e:
    #     db.session.rollback()
    #     raise e
    else:
        flash("这本书已经添加至你的赠送清单或心愿清单，请不要重复添加")
    return redirect(url_for("web.book_detail", isbn=isbn))


@web.route("/gifts/<gid>/redraw")
def redraw_from_gifts(gid):
    return "从赠送清单中撤销页面，书籍id是%d" % gid
