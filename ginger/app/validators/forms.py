from wtforms import IntegerField, StringField, ValidationError
from wtforms.validators import DataRequired, Email, Regexp, length
from app.libs.enums import ClientTypeEnum
from app.models.user import User
from app.validators.base import BaseForm as Form


class ClientForm(Form):
    account = StringField(
        validators=[DataRequired(message="不能为空"), length(min=5, max=32)]
    )
    secret = StringField()
    type = IntegerField(validators=[DataRequired()])

    def validate_type(self, value):
        try:
            client_type = ClientTypeEnum(value.data)
        except ValueError as e:
            raise ValidationError(str(e)) from e
        self.type.data = client_type


class UserEmailForm(ClientForm):
    account = StringField(validators=[Email(message="invalidate email")])
    secret = StringField(
        validators=[
            DataRequired(),
            # password can only include letters , numbers and "_"
            Regexp(r"^[A-Za-z0-9_*&$#@]{6,22}$"),
        ]
    )
    nickname = StringField(validators=[DataRequired(), length(min=2, max=22)])

    def validate_account(self, value):
        if User.query.filter_by(email=value.data).first():
            raise ValidationError()


class BookSearchForm(Form):
    q = StringField(validators=[DataRequired()])
