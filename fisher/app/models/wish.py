from app.models.gift import Gift
from spider.yushu_book import YuShuBook
from sqlalchemy import Column, String, Integer, ForeignKey, Boolean, desc, func
from sqlalchemy.orm import relationship
from app.models.base import Base, db


class Wish(Base):
    __tablename__ = "wish"

    id = Column(Integer, primary_key=True)
    uid = Column(Integer, ForeignKey("user.id"), nullable=False)
    user = relationship("User")
    isbn = Column(String(13))
    launched = Column(Boolean, default=False)

    @property
    def book(self):
        yushu_book = YuShuBook()
        yushu_book.search_by_isbn(self.isbn)
        return yushu_book

    @classmethod
    def get_user_wishes(cls, uid):
        wishes = (
            cls.query.filter_by(uid=uid, launched=False)
            .order_by(desc(Wish.create_time))
            .all()
        )
        return wishes

    @classmethod
    def get_gift_counts(cls, isbn_list):
        count_list = (
            db.session.query(func.count(Gift.id), Gift.isbn)
            .filter(Gift.launched == False, Gift.isbn.in_(isbn_list), Gift.status == 1)
            .group_by(Gift.isbn)
            .all()
        )
        # count_list = [EachGiftWishCount(*item) for item in count_list]
        count_list = [{"count": item[0], "isbn": item[1]} for item in count_list]
        return count_list

    # @classmethod
    # @cache.memoize(timeout=600)
    # def recent(cls):
    #     gift_list = (
    #         cls.query.filter_by(launched=False)
    #         .order_by(desc(Gift.create_time))
    #         .group_by(Gift.book_id)
    #         .limit(current_app.config["RECENT_BOOK_PER_PAGE"])
    #         .all()
    #     )
    #     view_model = GiftsViewModel.recent(gift_list)
    #     return view_model
