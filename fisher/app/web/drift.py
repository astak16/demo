from . import web

__author__ = "七月"


@web.route("/drift/<int:gid>", methods=["GET", "POST"])
def send_drift(gid):
    return "送出鱼漂的页面，书籍id是%d" % gid


@web.route("/pending")
def pending():
    return "等待处理的鱼漂页面"


@web.route("/drift/<int:did>/reject")
def reject_drift(did):
    return "拒绝鱼漂页面，鱼漂id是%d" % did


@web.route("/drift/<int:did>/redraw")
def redraw_drift(did):
    return "撤销鱼漂页面，鱼漂id是%d" % did


@web.route("/drift/<int:did>/mailed")
def mailed_drift(did):
    return "鱼漂邮寄完成页面，鱼漂id是%d" % did
