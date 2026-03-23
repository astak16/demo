from flask import Flask


def create_app():
    app = Flask(__name__)
    app.config.from_object("config")
    register_blueprints(app)
    return app


def register_blueprints(app):
    from app.web.book import web

    app.register_blueprint(web)


# id, author: string[], binding, category, image, images: {large: string}, isbn, pages, price,pubdate,publisher,subtitle,summary,title,translator:[]
