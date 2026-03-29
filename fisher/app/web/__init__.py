from flask import Blueprint, render_template

web = Blueprint("web", __name__)


@web.app_errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404


from . import book, user, main, wish, gift, drift, auth
