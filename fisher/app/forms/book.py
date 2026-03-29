from wtforms import Form, IntegerField, StringField
from wtforms.validators import DataRequired, Length, NumberRange, Regexp


class SearchForm(Form):
    q = StringField(validators=[DataRequired(), Length(min=1, max=30)])
    page = IntegerField(validators=[NumberRange(min=1, max=99)], default=1)


class DriftForm(Form):
    recipient_name = StringField(
        validators=[
            DataRequired(),
            Length(min=2, max=20, message="收件人姓名长度必须在2-20之间"),
        ]
    )
    mobile = StringField(
        validators=[
            DataRequired(),
            Regexp("^1[0-9]{10}$", message="请输入正确的手机号"),
        ]
    )
    message = StringField()
    address = StringField(
        validators=[
            DataRequired(),
            Length(min=10, max=70, message="地址长度必须在10-70之间"),
        ]
    )
