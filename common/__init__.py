import logging
from logging.handlers import RotatingFileHandler
from app.config.config import config
from app.settings import env


def set_log():
    config_class = config[env]
    logging.basicConfig(level=config_class.LOG_LEVEL)
    file_log_handler = RotatingFileHandler(
        "log/mumunote.log", maxBytes=1024 * 1024 * 300, backupCount=10
    )
    formatter = logging.Formatter(
        "%(asctime)s:%(levelname)s:%(filename)s:%(lineno)d %(message)s"
    )
    file_log_handler.setFormatter(formatter)
    logging.getLogger().addHandler(file_log_handler)


set_log()
