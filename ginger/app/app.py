from flask import Flask
from app.api.v1 import create_blueprint_v1


__author__ = "uccs"


def register_blueprints(app):
    app.register_blueprint(create_blueprint_v1(), url_prefix="/v1")


def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.setting")
    app.config.from_object("app.config.secure")
    register_blueprints(app)
    return app
