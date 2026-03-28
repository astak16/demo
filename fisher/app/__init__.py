from flask import Flask
from app.models.base import db
from flask_login import LoginManager

login_manager = LoginManager()


def create_app():
    app = Flask(__name__)
    app.config.from_object("app.secure")
    app.config.from_object("app.setting")
    register_blueprints(app)
    db.init_app(app)
    login_manager.init_app(app)
    setattr(login_manager, "login_view", "web.login")
    setattr(login_manager, "login_message", "请先登录或注册")
    with app.app_context():
        db.create_all()
    return app


def register_blueprints(app):
    from app.web.book import web

    app.register_blueprint(web)
