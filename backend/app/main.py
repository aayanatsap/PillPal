from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from .security import verify_jwt

app = FastAPI(title="PillPal API", version="0.1.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IntentRequest(BaseModel):
    query: str


class IntentResponse(BaseModel):
    intent: str
    data: dict


@app.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok"}


@app.post("/api/v1/intent", response_model=IntentResponse)
async def parse_intent(body: IntentRequest, _claims: dict = Depends(verify_jwt)):
    # TODO: integrate Gemini 1.5 Flash
    return IntentResponse(intent="unknown", data={"echo": body.query})


@app.post("/api/v1/label-extract")
async def label_extract(_claims: dict = Depends(verify_jwt)):
    # TODO: receive image, call Gemini OCR, return parsed medication JSON
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")


@app.get("/api/v1/risk")
async def risk_for_user(_claims: dict = Depends(verify_jwt)):
    # TODO: compute risk via simple logistic regression
    return {"score": 0}


