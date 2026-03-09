class Config(object):
    db_url = "mysql+pymysql://root:123456@localhost:3306/tomas?charset=utf8"


class TestConfig(Config):
    if_echo = True


class ProductionConfig(Config):
    if_echo = False


config = {"test": TestConfig, "prop": ProductionConfig}
