from flask_login import current_user

from app.forms.book import SearchForm
from app.models.gift import Gift
from app.models.wish import Wish
from app.view_models.book import BookCollection, BookViewModel
from app.libs.helper import is_isbn_or_key
from app.view_models.trade import TradeInfo
from spider import yushu_book
from spider.yushu_book import YuShuBook
from flask import jsonify, render_template, request, flash
from . import web
import json


@web.route("/book/search")
def search():
    form = SearchForm(request.args)
    book = BookCollection()
    if form.validate():
        q = form.q.data
        if q:
            q = q.strip()

        page = form.page.data
        if not page:
            page = 1

        isbn_or_key = is_isbn_or_key(q)
        yushu_book = YuShuBook()
        if isbn_or_key == "isbn":
            yushu_book.search_by_isbn(q)
        else:
            yushu_book.search_by_keyword(q, page)
        book.fill(yushu_book, q)

        # return jsonify(book)
        # return json.dumps(book, default=lambda o: o.__dict)
        return render_template("search_result.html", books=book.books, form=form)
    else:
        # return jsonify(form.errors)
        flash("搜索的关键字不符合要求，请重新输入")
        return render_template("search_result.html", books=[], form=form)


@web.route("/book/<isbn>/detail")
def book_detail(isbn):
    has_in_gifts = False
    has_in_wishes = False

    yushu_book = YuShuBook()
    yushu_book.search_by_isbn(isbn)
    book = BookViewModel(yushu_book.first)

    if current_user.is_authenticated:
        if Gift.query.filter_by(uid=current_user.id, isbn=isbn, launched=False).first():
            has_in_gifts = True
        if Wish.query.filter_by(uid=current_user.id, isbn=isbn, launched=False).first():
            has_in_wishes = True

    trade_gifts = Gift.query.filter_by(isbn=isbn, launched=False).all()
    trade_wishes = Wish.query.filter_by(isbn=isbn, launched=False).all()

    trade_wishes_model = TradeInfo(trade_wishes)
    trade_gifts_model = TradeInfo(trade_gifts)

    return render_template(
        "book_detail.html",
        book=book,
        wishes=trade_wishes_model,
        gifts=trade_gifts_model,
        has_in_gifts=has_in_gifts,
        has_in_wishes=has_in_wishes,
    )
