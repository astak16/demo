from sqlalchemy import Table
from common.database import db_connect
from app.config.config import config
from app.settings import env
from model.user import User

db_session, Base, engine = db_connect()


class Article(Base):
    __table__ = Table("article", Base.metadata, autoload_with=engine)

    def find_article(self, page, article_type="recommend"):
        if int(page) < 1:
            page = 1
        count = int(page) * config[env].page_count
        if article_type == "recommend":
            result = (
                db_session.query(Article, User.nickname)
                .join(User, User.user_id == Article.user_id)
                .filter(Article.drafted == 1)
                .order_by(Article.browse_num.desc())
                .limit(count)
                .all()
            )
        else:
            result = (
                db_session.query(Article, User.nickname)
                .join(User, User.user_id == Article.user_id)
                .filter(Article.label_name == article_type, Article.drafted == 1)
                .order_by(Article.create_time.desc())
                .limit(count)
                .all()
            )
        return result

    def search_article(self, page, keyword):
        if int(page) < 1:
            page = 1
        count = int(page) * config[env].page_count
        result = (
            db_session.query(Article, User.nickname)
            .join(User, User.user_id == Article.user_id)
            .filter(
                Article.article_content.like("%" + keyword + "%"), Article.drafted == 1
            )
            .order_by(Article.browse_num.desc())
            .limit(count)
            .all()
        )
        return result

    def get_article_detail(self, article_id):
        return db_session.query(Article).filter_by(id=article_id).first()

    def find_about_article(self, label_name):
        return (
            db_session.query(Article)
            .filter_by(label_name=label_name, drafted=1)
            .order_by(Article.browse_num.desc())
            .limit(5)
        )

    def insert_article(self, user_id, title, article_content, drafted):
        new_article = Article(
            user_id=user_id,
            title=title,
            article_content=article_content,
            drafted=drafted,
        )
        db_session.add(new_article)
        db_session.commit()
        return new_article.id

    def update_article(
        self,
        article_id,
        title,
        article_content,
        drafted,
        label_name="",
        article_tag="",
        article_type="",
    ):
        row = db_session.query(Article).filter_by(id=article_id).first()
        if row:
            row.title = title
            row.article_content = article_content
            row.drafted = drafted
            row.label_name = label_name
            row.article_tag = article_tag
            row.article_type = article_type
            db_session.commit()
        return article_id

    def update_article_header_image(self, article_id, article_image):
        row = db_session.query(Article).filter_by(id=article_id).first()
        if row:
            row.header_image = article_image
            db_session.commit()
        return article_id

    def get_all_article_drafted(self, user_id):
        return (
            db_session.query(Article)
            .filter_by(user_id=user_id, drafted=0)
            .order_by(Article.create_time.desc())
            .all()
        )

    def get_one_article_drafted(self, article_id):
        return (
            db_session.query(Article)
            .filter_by(id=article_id, drafted=0)
            .order_by(Article.create_time.desc())
            .first()
        )
