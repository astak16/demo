from sqlalchemy import Table, func
from common.database import db_connect
from common.utils import model_to_json
from model.user import User

db_session, Base, engine = db_connect()


class Feedback(Base):
    __table__ = Table("comment", Base.metadata, autoload_with=engine)

    def find_feedback_by_article_id(self, article_id):
        return (
            db_session.query(Feedback)
            .filter_by(article_id=article_id, reply_id=0, base_reply_id=0)
            .order_by(Feedback.id.desc())
            .all()
        )

    def get_feedback_user_list(self, article_id):
        final_data_list = []

        feedback_list = self.find_feedback_by_article_id(article_id)

        for feedback in feedback_list:
            user = User()
            all_reply = self.find_reply_by_reply_id(base_reply_id=feedback.id)
            feedback_user = user.find_by_user_id(feedback.user_id)
            reply_list = []
            for reply in all_reply:
                reply_content_with_user = {}
                from_user_data = user.find_by_user_id(reply.user_id)

                to_user_replay_data = self.find_reply_by_id(reply.reply_id)
                to_user_data = user.find_by_user_id(to_user_replay_data[0].user_id)

                reply_content_with_user["from_user"] = model_to_json(from_user_data)
                reply_content_with_user["to_user"] = model_to_json(to_user_data)
                reply_content_with_user["content"] = model_to_json(reply)
                reply_list.append(reply_content_with_user)

            every_feedback_data = model_to_json(feedback)
            every_feedback_data.update(model_to_json(feedback_user))
            every_feedback_data["reply_list"] = reply_list
            final_data_list.append(every_feedback_data)

        return final_data_list

    def find_reply_by_reply_id(self, base_reply_id):
        return (
            db_session.query(Feedback)
            .filter_by(base_reply_id=base_reply_id)
            .order_by(Feedback.id.asc())
            .all()
        )

    def find_reply_by_id(self, id):
        return (
            db_session.query(Feedback)
            .filter(Feedback.id == id)
            .order_by(Feedback.id.asc())
            .all()
        )

    def get_article_feedback_count(self, article_id):
        return (
            db_session.query(Feedback)
            .filter_by(article_id=article_id, reply_id=0, base_reply_id=0)
            .count()
        )

    def insert_comment(self, user_id, article_id, content, ipaddr):
        max_floor = (
            db_session.query(func.max(Feedback.floor_number).label("max_floor"))
            .filter_by(article_id=article_id)
            .scalar()
        )
        next_floor = 1 if max_floor in (None, 0) else int(max_floor) + 1

        feedback = Feedback(
            user_id=user_id,
            article_id=article_id,
            content=content,
            ipaddr=ipaddr,
            floor_number=next_floor,
            reply_id=0,
            base_reply_id=0,
        )
        db_session.add(feedback)
        db_session.commit()
        db_session.refresh(feedback)
        return feedback

    def insert_reply(
        self, article_id, user_id, content, ipaddr, reply_id, base_reply_id
    ):
        feedback = Feedback(
            user_id=user_id,
            article_id=article_id,
            content=content,
            ipaddr=ipaddr,
            reply_id=reply_id,
            base_reply_id=base_reply_id,
        )
        db_session.add(feedback)
        db_session.commit()
        db_session.refresh(feedback)
        return feedback
