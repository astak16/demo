class Config(object):
    db_url = "mysql+pymysql://root:123456@localhost:3306/mumunote?charset=utf8"
    page_count = 10
    article_header_image_path = "/images/article/header/"
    user_header_image_path = "/images/headers/"
    email_name = "xx"
    passwd = "bbb"
    label_types = {
        "recommend": {"name": "推荐", "selected": "selected"},
        "auto_test": {"name": "自动化测试", "selected": "selected"},
        "python": {"name": "Python", "selected": "selected"},
        "java": {"name": "Java", "selected": "selected"},
        "perf_test": {"name": "性能测试", "selected": "selected"},
        "function_test": {"name": "功能测试", "selected": "selected"},
        "funny": {"name": "幽默段子", "selected": "selected"},
    }
    article_types = {
        "recommend": {"name": "请选择", "selected": "selected"},
        "first": {"name": "首发", "selected": "no-selected"},
        "original": {"name": "原创", "selected": "no-selected"},
        "other": {"name": "其它", "selected": "no-selected"},
    }
    article_tags = [
        "Html5",
        "Angular",
        "JS",
        "CSS3",
        "Sass/Less",
        "JAVA",
        "Python",
        "Go",
        "C++",
        "C#",
        "MySQL",
        "Oracle",
        "MongoDB",
        "Android",
        "Unity 3",
        "DCocos2d-x",
    ]
    REDIS_HOST = "localhost"
    REDIS_PORT = 6379
    REDIS_PASSWORD = ""
    REDIS_POLL = 10
    REDIS_DB = 2
    REDIS_DECODE_RESPONSES = True


class TestConfig(Config):
    if_echo = True
    LOG_LEVEL = "DEBUG"


class ProductionConfig(Config):
    if_echo = False
    LOG_LEVEL = "INFO"


config = {"test": TestConfig, "prop": ProductionConfig}
