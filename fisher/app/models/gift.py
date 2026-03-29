from flask import current_app
from typing import cast
from sqlalchemy import Column, String, Integer, ForeignKey, Boolean, desc, func
from sqlalchemy.orm import relationship
from sqlalchemy.sql.elements import ColumnElement
from app.models.wish import Wish
from spider.yushu_book import YuShuBook
from .base import Base, db
from app.models.gift import Gift
from collections import namedtuple

EachGiftWishCount = namedtuple("EachGiftWishCount", ["count", "isbn"])


class Gift(Base):
    __tablename__ = "gift"

    id = Column(Integer, primary_key=True)
    uid = Column(Integer, ForeignKey("user.id"), nullable=False)
    user = relationship("User")
    # bid = Column(Integer, ForeignKey("book.id"), nullable=False)
    # book = relationship("Book")
    isbn = Column(String(15), nullable=False)
    launched = Column(Boolean, default=False)

    def is_yourself_gift(self, uid):
        return True if self.uid == uid else False

    @property
    def book(self):
        yushu_book = YuShuBook()
        yushu_book.search_by_isbn(self.isbn)
        return yushu_book.first

    @classmethod
    def get_user_gifts(cls, uid):
        gifts = (
            cls.query.filter_by(uid=uid, launched=False)
            .order_by(desc(Gift.create_time))
            .all()
        )
        return gifts

    @classmethod
    def get_wish_counts(cls, isbn_list):
        count_list = (
            db.session.query(func.count(Wish.id), Wish.isbn)
            .filter(
                Wish.launched.is_(False),
                Wish.isbn.in_(isbn_list),
                cast(ColumnElement[bool], Wish.status == 1),
            )
            .group_by(Wish.isbn)
            .all()
        )
        # count_list = [EachGiftWishCount(*item) for item in count_list]
        count_list = [{"count": item[0], "isbn": item[1]} for item in count_list]
        return count_list

    @classmethod
    # @cache.memoize(timeout=600)
    def recent(cls):
        gift_list = (
            cls.query.filter_by(launched=False)
            .order_by(desc(Gift.create_time))
            .group_by(Gift.isbn)
            .limit(current_app.config["RECENT_BOOK_PER_PAGE"])
            .all()
        )
        # view_model = GiftsViewModel.recent(gift_list)
        return gift_list
