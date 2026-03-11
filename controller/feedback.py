from datetime import datetime, time
import hashlib
import json
import re
from flask import Blueprint, jsonify, make_response, session, request, url_for
from common import response_message
from common.email_utils import gen_email_code, send_email
from common.utils import ImageCode, compress_image
from model.user import User
from app.config.config import config
from app.settings import env
from app.config.ue_config import FEEDBACK_UECONFIG


feedback = Blueprint("feedback", __name__)


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
