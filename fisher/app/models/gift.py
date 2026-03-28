# from app.spider.yushu_book import YuShuBook
from sqlalchemy import Column, String, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .base import Base


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
        if self.uid == uid:
            return True

    # @property
    # def book(self):
    #     yushu_book = YuShuBook()
    #     yushu_book.search_by_isbn(self.isbn)
    #     return yushu_book

    # @classmethod
    # @cache.memoize(timeout=600)
    # def recent(cls):
    #     gift_list = cls.query.filter_by(launched=False).order_by(
    #         desc(Gift.create_time)).group_by(Gift.book_id).limit(
    #         current_app.config['RECENT_BOOK_PER_PAGE']).all()
    #     view_model = GiftsViewModel.recent(gift_list)
    #     return view_model
