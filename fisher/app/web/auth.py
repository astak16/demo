from . import web


@web.route("/register", methods=["GET", "POST"])
def register():
    return "注册页面"


@web.route("/login", methods=["GET", "POST"])
def login():
    return "登录页面"


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
    return "退出登录页面"
