from flask import Blueprint, render_template, request
from common import response_message
from model.article import Article
from model.user import User


article = Blueprint("article", __name__)


@article.route("/detail")
def article_detail():
    article_id = request.args.get("article_id")
    article = Article()
    article_content = article.get_article_detail(article_id)
    if not article_content:
        return response_message.ArticleMessage.error("文章不存在")

    article_tag_string = article_content.article_tag
    article_tag_list = article_tag_string.split(",")

    user = User()
    user_info = user.find_by_user_id(article_content.user_id)

    is_favorite = 1

    return render_template(
        "article-info.html",
        article_content=article_content,
        user_info=user_info,
        is_favorite=is_favorite,
        article_tag_list=article_tag_list,
    )
