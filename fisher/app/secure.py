DEBUG = True

SQLALCHEMY_DATABASE_URI = (
    "mysql+cymysql://root:123456@localhost:3306/fisher?charset=utf8"
)

SECRET_KEY = "88d4f0396aa04177c556be8befd7d8d3e6982a34"

MAIL_SERVER = "smtp.qq.com"
MAIL_PORT = 465
MAIL_USE_SSL = True
MAIL_USE_TSL = False
MAIL_USERNAME = "uccs"
MAIL_PASSWORD = "hsgyqjvibgkbbfb"
MAIL_SUBJECT_PREFIX = "[鱼书]"
MAIL_SENDER = "鱼书 <hello@yushu.com>"
