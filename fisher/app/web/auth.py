from flask import flash, redirect, render_template, request, url_for
from app.forms.auth import LoginForm, RegisterForm
from app.models.user import User
from app.models.base import db
from . import web
from flask_login import login_user, logout_user


@web.route("/register", methods=["GET", "POST"])
def register():
    form = RegisterForm(request.form)
    if request.method == "POST" and form.validate():
        with db.auto_commit():
            user = User()
            user.set_attrs(form.data)
            db.session.add(user)
            # db.session.commit()
        return redirect(url_for("web.login"))
    return render_template("auth/register.html", form=form)


@web.route("/login", methods=["GET", "POST"])
def login():
    form = LoginForm(request.form)
    if request.method == "POST" and form.validate():
        user = User.query.filter_by(email=form.email.data).first()
        if user and user.check_password(form.password.data):
            login_user(user, remember=True)
            next = request.args.get("next")
            if not next or not next.startswith("/"):
                next = url_for("web.index")
            return redirect(next)
        else:
            flash("账号不存在或密码错误")

    return render_template("auth/login.html", form=form)


@web.route("/reset/password", methods=["GET", "POST"])
def forget_password_request():
    return "重置密码请求页面"


@web.route("/reset/password/<token>", methods=["GET", "POST"])
def forget_password(token):
    return "重置密码页面"


@web.route("/change/password", methods=["GET", "POST"])
def change_password():
    return "修改密码页面"


@web.route("/logout")
def logout():
    logout_user()
    return redirect(url_for("web.index"))
