from sqlalchemy import Table
from common.database import db_connect

db_session, Base, engine = db_connect()


class User(Base):
    __table__ = Table("user", Base.metadata, autoload_with=engine)

    def get_one(self):
        return db_session.query(User).first()

    def find_by_username(self, username):
        return db_session.query(User).filter(User.username == username).all()

    def do_register(self, username, password):
        nickname = username.split("@")[0]
        # picture_num = random.randint(1, 539)
        job = "未定义"
        user = User(
            username=username,
            password=password,
            nickname=nickname,
            picture="1.jpg",
            job=job,
        )
        db_session.add(user)
        db_session.commit()
        return user
