import os
from flask import Flask
from controller.index import index
from controller.user import user
from controller.article import article


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
