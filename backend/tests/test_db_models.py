from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.infrastructure.db.models import Base, User, Conversation, Message


def test_can_create_user_conversation_and_message():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as s:
        u = User(email="me@example.com", password_hash="hashed")
        s.add(u)
        s.commit()
        s.refresh(u)

        c = Conversation(
            user_id=u.id,
            profile_text="profil",
            niveau_max=5,
            q1="tech",
            initial_metiers="[]",
            quiz_answers_json="{}",
        )
        s.add(c)
        s.commit()
        s.refresh(c)

        m = Message(conversation_id=c.id, role="user", content="hello")
        s.add(m)
        s.commit()

    with Session(engine) as s:
        users = s.query(User).all()
        assert len(users) == 1
        assert users[0].email == "me@example.com"
        assert len(users[0].conversations) == 1
        assert users[0].conversations[0].messages[0].content == "hello"
        assert users[0].conversations[0].q1 == "tech"
