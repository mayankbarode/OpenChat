import datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel, create_engine, Session, select

# Database setup
sqlite_url = "sqlite:///./openchatllm.db"
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

class MessageBase(SQLModel):
    role: str
    content: str
    timestamp: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

class Message(MessageBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversation.id")
    conversation: "Conversation" = Relationship(back_populates="messages")

class ConversationBase(SQLModel):
    title: str = "New Chat"
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

class Conversation(ConversationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    messages: List[Message] = Relationship(back_populates="conversation", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
