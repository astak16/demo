from flask import Blueprint

web = Blueprint("web", __name__)

from . import book, user, main, wish, gift, drift, auth
