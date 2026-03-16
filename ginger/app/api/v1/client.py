from flask import request
from app.libs.enums import ClientTypeEnum
from app.libs.error_code import ClientTypeError
from app.libs.redprint import Redprint
from app.models.user import User
from app.validators.forms import ClientForm, UserEmailForm


api = Redprint("client")


@api.route("/register", methods=["POST"])
def create_client():
    data = request.json
    form = ClientForm(data=data)
    if form.validate():
        promise = {
            ClientTypeEnum.USER_EMAIL: __register_user_by_email,
        }
        client_type = ClientTypeEnum(form.type.data)
        handler = promise.get(client_type)
        if handler is None:
            raise ClientTypeError()
        handler()
        return "success", 200
    else:
        raise ClientTypeError()


def __register_user_by_email():
    form = UserEmailForm(data=request.json)
    if form.validate():
        User.register_by_email(form.nickname.data, form.account.data, form.secret.data)
        return {"message": "success"}, 200
    return {"errors": form.errors}, 400
