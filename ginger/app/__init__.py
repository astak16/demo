from .app import Flask
from .api.v1 import create_blueprint_v1
from .models.base import db


def register_blueprints(app):
    app.register_blueprint(create_blueprint_v1(), url_prefix="/v1")


def register_plugin(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()


def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.setting")
    app.config.from_object("app.config.secure")
    register_blueprints(app)
    register_plugin(app)
    return app
