from app.forms.book import SearchForm
from app.view_models.book import BookCollection
from helper import is_isbn_or_key
from spider.yushu_book import YuShuBook
from flask import jsonify, request
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
        return json.dumps(book, default=lambda o: o.__dict)
    else:
        return jsonify(form.errors)
