from flask import (
    Blueprint,
    make_response,
    render_template,
    request,
    session,
    url_for,
)

from common import response_message
from model.article import Article
from model.user import User


personal = Blueprint("personal", __name__)


@personal.before_request
def article_before_request():
    url = request.path
    is_login = session.get("is_login")
    if url.startswith("/personal") and is_login != "true":
        response = make_response("登录重定向", 302)
        response.headers["Location"] = url_for("index.home")
        return response


@personal.route("/personal")
def personal_center():
    type_name = request.args.get("type")
    if type_name is None:
        type_name = "article"
    user_id = session.get("user_id")
    article = Article()
    if type_name == "article":
        article_data = article.get_article_by_user_id(user_id)
    elif type_name == "favorite":
        article_data = article.get_favorite_article_by_user_id(user_id)
    elif type_name == "feedback":
        article_data = article.get_feedback_article_by_user_id(user_id)
    else:
        return response_message.PersonalMessage.error("type参数错误")
    user = User().find_by_user_id(user_id)
    return render_template(
        "personal_center.html",
        article_data=article_data,
        active=type_name,
        type_name=type_name,
        user=user,
    )
