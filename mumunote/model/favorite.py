from sqlalchemy import Table
from common.database import db_connect
from app.config.config import config
from app.settings import env
from model.user import User

db_session, Base, engine = db_connect()


class Favorite(Base):
    __table__ = Table("favorite", Base.metadata, autoload_with=engine)

    def update_status(self, article_id, user_id, canceled):
        favorite_data = (
            db_session.query(Favorite)
            .filter_by(article_id=article_id, user_id=user_id)
            .first()
        )
        if favorite_data is None:
            favorite = Favorite(
                article_id=article_id, user_id=user_id, canceled=canceled
            )
            db_session.add(favorite)
        else:
            favorite_data.canceled = canceled
        db_session.commit()
        # return favorite_data

    def user_if_favorite(self, user_id, article_id):
        favorite_data = (
            db_session.query(Favorite.canceled)
            .filter_by(user_id=user_id, article_id=article_id)
            .first()
        )
        if favorite_data is None:
            return 1
        else:
            return favorite_data.canceled
