from flask import request
from app.libs.enums import ClientTypeEnum
from app.libs.error_code import ClientTypeError, Success
from app.libs.redprint import Redprint
from app.models.user import User
from app.validators.forms import ClientForm, UserEmailForm


api = Redprint("client")


@api.route("/register", methods=["POST"])
def create_client():
    form = ClientForm().validate_for_api()
    promise = {
        ClientTypeEnum.USER_EMAIL: __register_user_by_email,
    }
    client_type = ClientTypeEnum(form.type.data)
    handler = promise.get(client_type)
    if handler is None:
        raise ClientTypeError()
    handler()
    return Success()


def __register_user_by_email():

    form = UserEmailForm().validate_for_api()
    User.register_by_email(form.nickname.data, form.account.data, form.secret.data)
