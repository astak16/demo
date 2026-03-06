from flask import Flask
# from controller.index6 import index6

# app = Flask(__name__,template_folder="template")


# app.register_blueprint(index6)


# if __name__ == "__main__":
#     app.run()

# import pymysql

# conn = pymysql.connect(host="localhost", user="root", password="123456", database="tomas",charset="utf8",cursorclass=pymysql.cursors.DictCursor)

# cursor=conn.cursor()
# cursor.execute("select * from users")
# result=cursor.fetchall()
# print(result)

from sqlalchemy import Table, create_engine
from sqlalchemy.orm import declarative_base, scoped_session, sessionmaker

engine=create_engine("mysql+pymysql://root:123456@localhost:3306/tomas?charset=utf8",echo=True)
session = sessionmaker(engine)
db_session = scoped_session(session)
Base = declarative_base()

class User(Base):
    __table__ = Table("users", Base.metadata, autoload_with=engine)

app = Flask(__name__)    

@app.route("/",methods=['post'])
def login():
    result=db_session.query(User).all()
    # print(result)
    for r in result:
        print(r.nickname)
    return '登录成功'

if __name__ == "__main__":
    app.run()