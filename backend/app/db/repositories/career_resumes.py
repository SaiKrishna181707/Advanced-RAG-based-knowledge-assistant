from typing import Any
from datetime import datetime, timezone
from bson import ObjectId
from app.db import mongo
from app.db.serialize import docs_out, doc_out

class CareerResumeRepository:
    def __init__(self, db: Any = None):
        self._db = db

    def get_collection(self):
        return (self._db if self._db is not None else mongo.db).career_resumes

    def get_by_user(self, user_id: str, resume_id: str) -> dict | None:
        return self.get_collection().find_one({"_id": ObjectId(str(resume_id)), "user_id": user_id})

    def list_by_user(self, user_id: str) -> list[dict]:
        cursor = self.get_collection().find({"user_id": user_id}).sort("created_at", -1)
        return list(cursor)

    def create(self, data: dict) -> dict:
        now = datetime.now(timezone.utc)
        data["created_at"] = now
        data["updated_at"] = now
        result = self.get_collection().insert_one(data)
        data["_id"] = result.inserted_id
        return data

    def update(self, user_id: str, resume_id: str, updates: dict) -> dict | None:
        updates["updated_at"] = datetime.now(timezone.utc)
        return self.get_collection().find_one_and_update(
            {"_id": ObjectId(str(resume_id)), "user_id": user_id},
            {"$set": updates},
            return_document=True
        )

    def delete(self, user_id: str, resume_id: str) -> dict | None:
        return self.get_collection().find_one_and_delete(
            {"_id": ObjectId(str(resume_id)), "user_id": user_id}
        )
