from datetime import datetime
from fileinput import filename
import random
import json
from flask import Blueprint, jsonify, make_response, render_template, request, session
from common import response_message
from common.utils import compress_image
from model.article import Article
from model.feedback import Feedback
from model.user import User
from model.favorite import Favorite


article = Blueprint("article", __name__)


@article.before_request
def article_before_request(): ...


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

    feedback_data_list = Feedback().get_feedback_user_list(article_id)

    is_favorite = 1
    if session.get("is_login") == "true":
        user_id = session.get("user_id")
        is_favorite = Favorite().user_if_favorite(user_id, article_id)

    feedback_count = Feedback().get_article_feedback_count(article_id)
    about_article = article.find_about_article(article_content.label_name)

    return render_template(
        "article-info.html",
        article_content=article_content,
        user_info=user_info,
        is_favorite=is_favorite,
        article_tag_list=article_tag_list,
        about_article=about_article,
        feedback_data_list=feedback_data_list,
        feedback_count=feedback_count,
    )


@article.route("/article/new")
def article_new():
    return render_template("new-article.html")


@article.route("/article/save", methods=["post"])
def article_save():
    request_data = json.loads(request.data)
    article_id = request_data.get("article_id")
    drafted = request_data.get("drafted")
    if article_id == -1 and drafted == 0:
        user, title, article_content = get_article_request_param(request_data)
        if title == "":
            return response_message.ArticleMessage.error("文章标题不能为空")
        if user is None:
            return response_message.ArticleMessage.error("用户不存在")
        article_id = Article().insert_article(
            user.user_id, title, article_content, drafted
        )
        return response_message.ArticleMessage.save_success("保存草稿成功", article_id)
    elif article_id > -1:
        user, title, article_content = get_article_request_param(request_data)
        if title == "":
            return response_message.ArticleMessage.error("文章标题不能为空")
        label_name = request_data.get("label_name")
        article_tag = request_data.get("article_tag")
        article_type = request_data.get("article_type")
        article_id = Article().update_article(
            article_id,
            title,
            article_content,
            drafted,
            label_name,
            article_tag,
            article_type,
        )
        return response_message.ArticleMessage.save_success("更新文章成功", article_id)
    else:
        return response_message.ArticleMessage.error("请求参数错误")


def get_article_request_param(request_data):
    user = User().find_by_user_id(session.get("user_id"))
    title = request_data.get("title")
    article_content = request_data.get("article_content")
    return user, title, article_content


@article.route("/article/update/article_header_image", methods=["post"])
def update_article_header_image():
    f = request.files.get("header-image-file")
    if f is None:
        return response_message.ArticleMessage.error("请上传图片")
    filename = f.filename
    if not filename:
        return make_response("文件不存在")
    suffix = filename.split(".")[-1]
    newname = datetime.now().strftime("%Y%m%d_%H%M%S.") + suffix
    newname = "article-header-" + newname
    f.save("resource/upload/" + newname)
    source = dest = "resource/upload/" + newname
    compress_image(source, dest, 2000)

    article_id = request.form.get("article_id")
    Article().update_article_header_image(article_id, newname)

    result = {}
    result["state"] = "SUCCESS"
    result["url"] = "/upload/" + newname
    result["title"] = filename
    result["original"] = filename
    return jsonify(result)


@article.route("/article/random/header/image", methods=["post"])
def random_article_header_image():
    name = random.randint(1, 4)
    newname = str(name) + ".jpg"

    article_id = request.form.get("article_id")
    Article().update_article_header_image(article_id, newname)

    result = {}
    result["state"] = "SUCCESS"
    result["url"] = "/images/headers/" + newname
    result["title"] = newname
    result["original"] = newname
    return jsonify(result)
