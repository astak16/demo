from threading import Thread
from flask import current_app, render_template, copy_current_request_context
from app import mail
from flask_mail import Message


def send_async_mail(app, msg):
    with app.app_context():
        try:
            mail.send(msg)
        except Exception as e:
            ...


def send_mail(to, subject, template, **kwargs):
    msg = Message(
        "鱼书" + " " + subject,
        sender=current_app.config["MAIL_USERNAME"],
        recipients=[to],
    )
    msg.html = render_template(template, **kwargs)
    thr = Thread(
        target=copy_current_request_context(lambda: send_async_mail(current_app, msg))
    )
    thr.start()
