import os
from typing import Dict
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from jose.exceptions import JWTError

AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE", "pillpal-api")
AUTH0_ISSUER = os.getenv("AUTH0_ISSUER_BASE_URL", "https://YOUR_DOMAIN.auth0.com")

bearer_scheme = HTTPBearer(auto_error=False)


def verify_jwt(credentials: HTTPAuthorizationCredentials = Security(bearer_scheme)) -> Dict:
    if credentials is None or not credentials.scheme.lower() == "bearer":
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = credentials.credentials
    try:
        # For hackathon: accept RS256 without JWKS fetch; recommend proper JWKS validation for prod
        claims = jwt.get_unverified_claims(token)
        iss = claims.get("iss")
        aud = claims.get("aud")
        if not iss or not str(iss).startswith(AUTH0_ISSUER):
            raise HTTPException(status_code=401, detail="Invalid issuer")
        if aud and AUTH0_AUDIENCE not in (aud if isinstance(aud, list) else [aud]):
            raise HTTPException(status_code=401, detail="Invalid audience")
        return claims
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


