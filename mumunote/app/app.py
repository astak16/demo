import os
from flask import Flask
from controller.redis_user import redis_user
from controller.personal import personal
from controller.feedback import feedback
from controller.index import index
from controller.user import user
from controller.article import article
from controller.favorite import favorite


def create_app():
    app = Flask(
        __name__,
        template_folder="../template",
        static_url_path="/",
        static_folder="../resource",
    )

    init_blueprint(app)
    app.config["SECRET_KEY"] = os.urandom(24)
    return app


def init_blueprint(app):
    app.register_blueprint(user)
    app.register_blueprint(index)
    app.register_blueprint(article)
    app.register_blueprint(favorite)
    app.register_blueprint(feedback)
    app.register_blueprint(personal)
    app.register_blueprint(redis_user)
