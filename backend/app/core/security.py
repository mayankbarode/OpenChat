from datetime import datetime, timedelta
from typing import Optional, Any, Union
from jose import jwt
import os

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "openchatllm-super-secret-key-12345")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

# Simple password storage (no hashing for development)
# WARNING: Not secure for production! Use bcrypt for real deployments.

def verify_password(plain_password: str, stored_password: str) -> bool:
    """Simple password comparison (no hashing)"""
    return plain_password == stored_password

def get_password_hash(password: str) -> str:
    """Return password as-is (no hashing for development)"""
    return password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return decoded_token if decoded_token["exp"] >= datetime.utcnow().timestamp() else None
    except:
        return None
