import os
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

Base = declarative_base()


def _get_engine():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        db_url = f"sqlite:///{os.path.join(os.getenv('DATA_DIR', '/tmp'), 'rag_assistant.db')}"
    return create_engine(db_url, connect_args={"check_same_thread": False})


# Imported lazily here to keep the public module surface simple.
from sqlalchemy import create_engine


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_size = Column(Integer)
    page_count = Column(Integer)
    chunk_count = Column(Integer, default=0)
    collection = Column(String(100), default="General")
    status = Column(String(50), default="processing")
    created_at = Column(DateTime, default=datetime.utcnow)
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete")


class Chunk(Base):
    __tablename__ = "chunks"
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer)
    chunk_index = Column(Integer)
    char_count = Column(Integer)
    faiss_index = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    document = relationship("Document", back_populates="chunks")


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True)
    title = Column(String(255), default="New conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    messages = relationship("Message", back_populates="conversation", cascade="all, delete")


class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    sources = Column(Text)
    retrieval_time_ms = Column(Float)
    llm_time_ms = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    conversation = relationship("Conversation", back_populates="messages")


def init_db():
    engine = _get_engine()
    Base.metadata.create_all(engine)
    print("[DB] Initialized")


def SessionLocal():
    engine = _get_engine()
    Session = sessionmaker(bind=engine)
    return Session()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
