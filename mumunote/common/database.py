from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, scoped_session, sessionmaker
from app.settings import env
from app.config.config import config


def db_connect():
    engine = create_engine(
        config[env].db_url, echo=config[env].if_echo, pool_size=10, max_overflow=30
    )
    session = sessionmaker(engine, autoflush=False)
    db_session = scoped_session(session)
    Base = declarative_base()
    return db_session, Base, engine
