# from app.libs.enums import PendingStatus
# from app.models.drift import Drift
from math import floor

from app.libs.enums import PendingStatus
from app.models.drift import Drift
from app.models.gift import Gift
from app.models.wish import Wish
from app.libs.helper import is_isbn_or_key
from itsdangerous import URLSafeTimedSerializer

# from itsdangerous import TimedJSONWebSignatureSerializer as Serializer
from flask_login import UserMixin
from app import login_manager
from flask import current_app
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Column, ForeignKey, func
from sqlalchemy import String, Unicode, DateTime, Boolean
from sqlalchemy import SmallInteger, Integer, Float
from sqlalchemy.orm import relationship
from .base import Base, db
from spider.yushu_book import YuShuBook


class User(UserMixin, Base):
    __tablename__ = "user"
    # __bind_key__ = 'fisher'

    id = Column(Integer, primary_key=True)
    nickname = Column(String(24), nullable=False)
    phone_number = Column(String(18), unique=True)
    email = Column(String(50), unique=True, nullable=False)
    confirmed = Column(Boolean, default=False)
    beans = Column(Float, default=0)
    send_counter = Column(Integer, default=0)
    receive_counter = Column(Integer, default=0)
    # gifts = relationship("Gift")
    wx_open_id = Column(String(50))
    wx_name = Column(String(32))

    _password = Column("password", String(256), nullable=False)

    # def __init__(self, nickname, email, password, phone_number=None):
    #     self.nickname = nickname
    #     self._password = generate_password_hash(password)
    #     self.email = email
    #     self.phone_number = phone_number
    #     super(User, self).__init__()

    @property
    def password(self):
        return self._password

    @password.setter
    def password(self, raw):
        self._password = generate_password_hash(raw)

    def check_password(self, raw):
        if self._password is None:
            return False
        return check_password_hash(str(self._password), raw)

    # def can_satisfied_wish(self, current_gift_id=None):
    #     if current_gift_id:
    #         gift = Gift.query.get(current_gift_id)
    #         if gift.uid == self.id:
    #             return False
    #     if self.beans < 1:
    #         return False
    #     success_gifts = Drift.query.filter(
    #         Drift.pending == PendingStatus.success, Gift.uid == self.id
    #     ).count()
    #     success_receive = Drift.query.filter(
    #         Drift.pending == PendingStatus.success, Drift.requester_id == self.id
    #     ).count()
    #     return False if success_gifts <= success_receive - 2 else True
    def can_send_drift(self):
        beans = db.session.query(User.beans).filter_by(id=self.id).scalar()
        if beans < 1:
            return False
        success_gifts_count = Gift.query.filter_by(uid=self.id, launched=True).count()
        success_receive_count = Drift.query.filter_by(
            requester_id=self.id, pending=PendingStatus.success
        ).count()
        return (
            True
            if floor(success_gifts_count / 2) <= floor(success_receive_count)
            else False
        )

    def can_save_to_list(self, isbn):
        if is_isbn_or_key(isbn) != "isbn":
            return False
        yushu_book = YuShuBook()
        yushu_book.search_by_isbn(isbn)
        if not yushu_book.first:
            return False
        # 不允许一个用户同时赠送多本相同的图书
        gifting = Gift.query.filter_by(uid=self.id, isbn=isbn, launched=False).first()
        # 一个用户不可能同时成为赠送者和索要者
        wishing = Wish.query.filter_by(uid=self.id, isbn=isbn, launched=False).first()
        # 既不在赠送清单，也不在心愿清单才能添加
        if not gifting and not wishing:
            return True
        else:
            return False

    # def confirm(self, token):
    #     s = Serializer(current_app.config["SECRET_KEY"])
    #     try:
    #         data = s.loads(token.encode("utf-8"))
    #     except:
    #         return False
    #     if data.get("confirm") != self.id:
    #         return False
    #     self.confirmed = True
    #     db.session.add(self)
    #     return True

    def generate_token(self, expiration=600):
        # s = Serializer(current_app.config["SECRET_KEY"], expiration)
        s = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
        return s.dumps({"id": self.id})

    @staticmethod
    def reset_password(token, new_password):
        s = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
        try:
            data = s.loads(token)
        except:
            return False
        uid = data.get("id")
        with db.auto_commit():
            user = User.query.get(uid)
            if user is None:
                return False
            user.password = new_password

        # user = User.query.get(data.get("id"))
        # if user is None:
        #     return False
        # user.password = new_password
        # db.session.commit()
        return True

    @property
    def summary(self):
        return dict(
            nickname=self.nickname,
            beans=self.beans,
            email=self.email,
            send_receive=str(self.send_counter) + "/" + str(self.receive_counter),
        )


@login_manager.user_loader
def get_user(uid):
    return User.query.get(int(uid))
