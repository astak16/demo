import logging
from flask import Blueprint, render_template, request
from app.config.config import config
from app.settings import env
from model.article import Article


index = Blueprint("index", __name__)

label_types = {
    "recommend": {"name": "推荐", "selected": "selected"},
    "auto_test": {"name": "自动化测试", "selected": "selected"},
    "python": {"name": "Python", "selected": "selected"},
    "java": {"name": "Java", "selected": "selected"},
    "perf_test": {"name": "性能测试", "selected": "selected"},
    "function_test": {"name": "功能测试", "selected": "selected"},
    "funny": {"name": "幽默段子", "selected": "selected"},
}


@index.route("/")
def home():
    page = request.args.get("page")
    article_type = request.args.get("article_type")
    logging.debug("page: %s, article_type: %s", page, article_type)
    if page is None:
        page = 1
    if article_type is None:
        article_type = "recommend"

    search_keyword = request.args.get("keyword")
    if search_keyword is not None:
        db_result = Article().search_article(page, search_keyword)
    else:
        db_result = Article().find_article(page, article_type)

    logging.debug("db_result: %s", db_result)

    for article, nickname in db_result:
        label_type = label_types.get(article.label_name)
        article.label = label_type.get("name") if label_type else ""
        article.create_time = (
            str(article.create_time.month) + "." + str(article.create_time.day)
        )
        article.article_image = config[env].article_header_image_path + str(
            article.article_image
        )
        article.article_tag = article.article_tag.replace(",", " · ")

    start_num = request.args.get("start_num")
    if start_num is None:
        start_num = 0
    end_num = len(db_result)

    for k, v in label_types.items():
        if article_type == k:
            v["selected"] = "selected"
        else:
            v["selected"] = "np-selected"

    return render_template(
        "index.html",
        result=db_result,
        label_types=label_types,
        start_num=start_num,
        end_num=end_num,
    )
