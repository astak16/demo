from app.forms.book import SearchForm
from helper import is_isbn_or_key
from spider.yushu_book import YuShuBook
from flask import jsonify, request
from . import web


@web.route("/book/search")
def search():
    form = SearchForm(request.args)
    if form.validate():
        q = form.q.data
        if q:
            q = q.strip()

        page = form.page.data
        if not page:
            page = 1

        isbn_or_key = is_isbn_or_key(q)
        if isbn_or_key == "isbn":
            result = YuShuBook.search_by_isbn(q)
        else:
            result = YuShuBook.search_by_keyword(q, page)

        return jsonify(result)
    else:
        return jsonify(form.errors)
