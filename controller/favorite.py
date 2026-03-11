import json
import logging
from flask import Blueprint, request, session
from common import response_message
from model.favorite import Favorite


favorite = Blueprint("favorite", __name__)


@favorite.route("/favorite/update_status", methods=["post"])
def update_status():
    request_data = json.loads(request.data)
    article_id = request_data.get("article_id")
    canceled = request_data.get("canceled")
    user_id = session.get("user_id")
    try:
        Favorite().update_status(
            article_id=article_id, user_id=user_id, canceled=canceled
        )
        return response_message.FavoriteMessage.success("收藏成功")
    except Exception as e:
        logging.error("更新收藏状态失败: %s", str(e))
        print(e)
        return response_message.FavoriteMessage.error("更新收藏状态失败")
