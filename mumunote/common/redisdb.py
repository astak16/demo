from app.config.config import config
from app.settings import env
from datetime import datetime
import redis
from common.database import db_connect
from app.settings import env
from model.user import User

db_session, Base, engine = db_connect()


def redis_connect():
    redis_config = config[env]
    pool = redis.ConnectionPool(
        host=redis_config.REDIS_HOST,
        port=redis_config.REDIS_PORT,
        db=redis_config.REDIS_DB,
        decode_responses=redis_config.REDIS_DECODE_RESPONSES,
    )
    return redis.Redis(connection_pool=pool)


def model_list(result):
    list = []
    for row in result:
        dict = {}
        for k, v in row.__dict__.items():
            if not k.startswith("_sa_"):
                if isinstance(v, datetime):
                    v = v.strftime("%Y-%m-%d %H:%M:%S")
                dict[k] = v
        list.append(dict)
    return list


def mysql_to_redis_string():
    redis_client = redis_connect()
    result = db_session.query(User).all()
    user_list = model_list(result)
    for user in user_list:
        redis_client.set("user:" + str(user["username"]), str(user))
