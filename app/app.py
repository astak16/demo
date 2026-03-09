from flask import Flask

from controller.user import user


def create_app():
    app = Flask(
        __name__,
        template_folder="../templates",
        static_url_path="/",
        static_folder="../resources",
    )

    init_blueprint(app)

    return app


def init_blueprint(app):
    app.register_blueprint(user)
