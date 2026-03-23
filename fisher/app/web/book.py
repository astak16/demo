from helper import is_isbn_or_key
from yushu_book import YuShuBook
from flask import Blueprint, request
from . import web


@web.route("/book/search/<q>/<page>")
def search(q, page):
    q = request.args["q"]
    page = request.args["page"]
    isbn_or_key = is_isbn_or_key(q)
    if isbn_or_key == "isbn":
        YuShuBook.search_by_isbn(q)
    else:
        YuShuBook.search_by_keyword(q)

    return f"search {isbn_or_key} {q} page {page}"
