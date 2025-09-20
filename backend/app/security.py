import os
from typing import Dict, Iterable
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from jose.exceptions import JWTError
from dotenv import load_dotenv

# Ensure environment variables are loaded before reading
load_dotenv()

def _as_list(value: object) -> Iterable[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return [str(v) for v in value]
    return [str(value)]

AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE", "https://pillpal-api")
AUTH0_ISSUER = (os.getenv("AUTH0_ISSUER_BASE_URL", "")).rstrip("/")

bearer_scheme = HTTPBearer(auto_error=False)


def verify_jwt(credentials: HTTPAuthorizationCredentials = Security(bearer_scheme)) -> Dict:
    if credentials is None or not credentials.scheme.lower() == "bearer":
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = credentials.credentials
    try:
        # For hackathon: accept RS256 without JWKS fetch; recommend proper JWKS validation for prod
        claims = jwt.get_unverified_claims(token)
        iss = str(claims.get("iss", "")).rstrip("/")
        aud = claims.get("aud")
        expected_issuer = AUTH0_ISSUER.rstrip("/")
        if not iss or not (iss == expected_issuer or iss.startswith(expected_issuer)):
            raise HTTPException(status_code=401, detail="Invalid issuer")
        aud_list = _as_list(aud)
        expected_aud = AUTH0_AUDIENCE
        if aud_list and expected_aud not in aud_list:
            raise HTTPException(status_code=401, detail="Invalid audience")
        return claims
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


