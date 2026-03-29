from flask import flash, redirect, render_template, url_for
from flask_login import current_user, login_required
from app.libs.email import send_mail
from app.models.gift import Gift
from app.models.wish import Wish
from app.view_models.trade import MyTrades
from . import web
from app.models.base import db


@web.route("/my/wish")
def my_wish():
    uid = current_user.id
    wishes_of_mine = Wish.get_user_wishes(uid)
    isbn_list = [wish.isbn for wish in wishes_of_mine]
    gift_count_list = Wish.get_gift_counts(isbn_list)
    view_model = MyTrades(wishes_of_mine, gift_count_list)
    return render_template("my_wishes.html", wishes=view_model.trades)


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
@login_required
def satisfy_wish(wid):
    wish = Wish.query.get_or_404(wid)
    gift = Gift.query.filter_by(uid=current_user.id, isbn=wish.isbn).first()
    if not gift:
        flash("你还没有赠送此书，请点击添加到赠送清单添加此书")
    else:
        send_mail(
            wish.user.email,
            "有人想要一本书",
            "email/satisfy_wish.html",
            wisher=wish.user,
            gift=gift,
        )
        flash("一封邮件已发送给愿意赠送者， 如果他同意赠送，你将收到一个鱼漂")
    return redirect(url_for("web.book_detail", isbn=wish.isbn))


@web.route("/wish/book/<isbn>/redraw")
@login_required
def redraw_from_wish(isbn):
    wish = Wish.query.filter_by(isbn=isbn, launched=False).first_or_404()
    with db.auto_commit():
        wish.delete()
    return redirect(url_for("web.my_wish"))
