from collections import namedtuple
from flask import current_app, g
from flask_httpauth import HTTPBasicAuth
from itsdangerous import SignatureExpired, URLSafeTimedSerializer, BadSignature
from app.libs.error_code import AuthFailed

auth = HTTPBasicAuth()
User = namedtuple("User", ["uid", "ac_type", "scope"])


@auth.verify_password
def verify_password(token, password):
    user_info = verify_auth_token(token)
    if not user_info:
        return False
    else:
        g.user = user_info
        return True


def verify_auth_token(token):
    s = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
    try:
        data = s.loads(token)
    except SignatureExpired:
        raise AuthFailed(msg="token is expired", error_code=1003)
    except BadSignature:
        raise AuthFailed(msg="token is invalid", error_code=1002)
    uid = data["uid"]
    ac_type = data["type"]
    return User(uid, ac_type, "")
