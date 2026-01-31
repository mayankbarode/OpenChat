from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..core.security import decode_access_token
from ..database.models import User
from beanie import PydanticObjectId

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
        
    user = await User.get(user_id)
    if user is None:
        raise credentials_exception
        
    return user
