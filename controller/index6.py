from flask import Blueprint, render_template

index6 = Blueprint("index6", __name__)

@index6.route("/index6")
def index():
    return render_template("shouji_index.html")
