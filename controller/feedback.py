from datetime import datetime
import json
from flask import Blueprint, jsonify, make_response, session, request
from common import response_message
from common.utils import compress_image, model_to_json
from model.feedback import Feedback
from app.config.ue_config import FEEDBACK_UECONFIG


feedback = Blueprint("feedback", __name__)


@feedback.before_request
def before_request():
    if session.get("user_id") is None or session.get("user_id") == "true":
        return {"status": 9999, "data": "请登录"}


@feedback.route("/feedback", methods=["get", "post"])
def ueditor():
    param = request.args.get("action")
    if request.method == "GET" and param == "config":
        print("请求了UEditor的config接口")
        return make_response(FEEDBACK_UECONFIG)
    elif param == "image":
        f = request.files.get("file")
        if f is None:
            return make_response("文件不存在")
        filename = f.filename
        if not filename:
            return make_response("文件不存在")
        suffix = filename.split(".")[-1]
        newname = datetime.now().strftime("%Y%m%d_%H%M%S.") + suffix
        f.save("resource/upload/" + newname)
        source = dest = "resource/upload/" + newname
        compress_image(source, dest, 2000)

        result = {}
        result["state"] = "SUCCESS"
        result["url"] = "/upload/" + newname
        result["title"] = filename
        result["original"] = filename
        return jsonify(result)

    return make_response("请求无效", 400)


@feedback.route("/feedback/add", methods=["post"])
def add():
    request_data = json.loads(request.data)
    article_id = request_data.get("article_id")
    content = request_data.get("content").strip()
    ipaddr = request.remote_addr
    user_id = session.get("user_id")

    if len(content) < 5 or len(content) > 1000:
        return response_message.FeedbackMessage.error("评论内容长度不合法")

    try:
        result = Feedback().insert_comment(user_id, article_id, content, ipaddr)

        # result = model_to_json(result)
        return response_message.FeedbackMessage.success("评论成功")
    except Exception as e:
        print(e)
        return response_message.FeedbackMessage.error("评论失败")


@feedback.route("/feedback/reply", methods=["post"])
def reply():
    request_data = json.loads(request.data)
    article_id = request_data.get("article_id")
    content = request_data.get("content").strip()
    ipaddr = request.remote_addr
    user_id = session.get("user_id")
    reply_id = request_data.get("reply_id")
    base_reply_id = request_data.get("base_reply_id")

    if len(content) < 5 or len(content) > 1000:
        return response_message.FeedbackMessage.error("评论内容长度不合法")

    try:
        result = Feedback().insert_reply(
            user_id=user_id,
            article_id=article_id,
            content=content,
            ipaddr=ipaddr,
            reply_id=reply_id,
            base_reply_id=base_reply_id,
        )

        # result = model_to_json(result)
        return response_message.FeedbackMessage.success("评论成功")
    except Exception as e:
        print(e)
        return response_message.FeedbackMessage.error("评论失败")
