from flask import current_app, jsonify
from itsdangerous import URLSafeTimedSerializer
from app.libs.enums import ClientTypeEnum
from app.libs.redprint import Redprint
from app.models.user import User
from app.validators.forms import ClientForm


api = Redprint("token")


@api.route("", methods=["POST"])
def get_token():
    form = ClientForm().validate_for_api()
    promise = {
        ClientTypeEnum.USER_EMAIL: User.verify,
    }
    identity = promise[ClientTypeEnum(form.type.data)](
        form.account.data, form.secret.data
    )
    expiration = current_app.config["TOKEN_EXPIRATION"]
    token = generate_auth_token(
        identity["uid"], form.type.data, identity["scope"], expiration
    )
    return jsonify({"token": token}), 201


def generate_auth_token(uid, ac_type, scope=None, expiration=7200):
    s = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
    return s.dumps({"uid": uid, "type": ac_type.value, "scope": scope})
