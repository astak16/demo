class Config(object):
    db_url = "mysql+pymysql://root:123456@localhost:3306/mumunote?charset=utf8"
    page_count = 10
    article_header_image_path = "/images/article/header/"
    email_name = "xx"
    passwd = "bbb"


class TestConfig(Config):
    if_echo = True
    LOG_LEVEL = "DEBUG"


class ProductionConfig(Config):
    if_echo = False
    LOG_LEVEL = "INFO"


config = {"test": TestConfig, "prop": ProductionConfig}
