from typing import Any
from app.db import mongo

class CareerProfileRepository:
    def __init__(self, db: Any = None):
        self._db = db

    def get_collection(self):
        return (self._db if self._db is not None else mongo.db).career_profiles

    def get_by_user(self, user_id: str) -> dict | None:
        return self.get_collection().find_one({"user_id": user_id})

    def upsert(self, user_id: str, profile_data: dict) -> dict:
        profile_data["user_id"] = user_id
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        profile_data["updated_at"] = now
        
        result = self.get_collection().find_one_and_update(
            {"user_id": user_id},
            {"$set": profile_data, "$setOnInsert": {"created_at": now}},
            upsert=True,
            return_document=True
        )
        return result
