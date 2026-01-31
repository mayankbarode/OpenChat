import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from .models import User, Conversation

async def init_db():
    # Use environment variable or default to local mongodb
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/openchatllm")
    
    client = AsyncIOMotorClient(mongodb_url)
    
    # Initialize Beanie with the models
    await init_beanie(
        database=client.get_database(),
        document_models=[User, Conversation]
    )
    print(f"MongoDB Initialized at {mongodb_url}")
