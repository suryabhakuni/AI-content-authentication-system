from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os
import logging
import time
import base64
import requests
import json
from typing import Optional, Dict, Any

from models.text_detector import TextDetector
from models.image_detector import ImageDetector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(
    title="AI Detection API",
    description="API for detecting AI-generated text and images",
    version="1.0.0"
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:8080,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

text_detector = None
image_detector = None

USE_HF_API = os.getenv("USE_HF_API", "false").lower() == "true"
HF_API_KEY = os.getenv("HF_API_KEY", "")


class TextDetectionRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000, description="Text to analyze")


class ImageDetectionRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image data")


class DetectionResponse(BaseModel):
    is_ai_generated: bool
    confidence: float = Field(..., ge=0.0, le=1.0)
    processing_time: float
    model_name: str
    details: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@app.on_event("startup")
async def startup_event():
    global text_detector, image_detector

    if USE_HF_API:
        logger.info("USE_HF_API is enabled. Skipping local model loading to save memory.")
        return

    try:
        logger.info("Loading AI detection models...")
        text_detector = TextDetector()
        image_detector = ImageDetector()
        logger.info("All models loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load models: {e}")


def detect_text_via_hf_api(text: str) -> dict:
    model_name = os.getenv("TEXT_MODEL", "Hello-SimpleAI/chatgpt-detector-roberta").strip()
    api_url = f"https://api-inference.huggingface.co/models/{model_name}"
    headers = {
        "Authorization": f"Bearer {HF_API_KEY.strip()}",
        "Content-Type": "application/json"
    }
    payload = {"inputs": text}
    
    try:
        response = requests.post(api_url, json=payload, headers=headers, timeout=30)
        if response.status_code == 503:
            return {"error": response.json().get("error", "Model is currently loading")}
            
        response.raise_for_status()
        res = response.json()
        
        if isinstance(res, list) and len(res) > 0:
            data = res[0] if isinstance(res[0], list) else res
            ai_prob = 0.0
            for item in data:
                label = item.get("label", "").upper()
                score = item.get("score", 0.0)
                if label == "LABEL_1" or "CHATGPT" in label or "AI" in label:
                    ai_prob = score
                    break
            else:
                if len(data) == 2:
                    ai_prob = data[1].get("score", 0.0)
                elif len(data) == 1:
                    ai_prob = data[0].get("score", 0.0)
            
            return {
                "is_ai_generated": ai_prob > 0.5,
                "confidence": ai_prob,
                "model_name": f"hf-api/{model_name}"
            }
        else:
            return {"error": f"Unexpected API response format: {res}"}
    except requests.exceptions.RequestException as e:
        try:
            err_msg = response.json().get("error", str(e))
        except Exception:
            err_msg = str(e)
        return {"error": err_msg}


def detect_image_via_hf_api(image_bytes: bytes) -> dict:
    model_name = os.getenv("IMAGE_MODEL", "Organika/sdxl-detector").strip()
    api_url = f"https://api-inference.huggingface.co/models/{model_name}"
    headers = {
        "Authorization": f"Bearer {HF_API_KEY.strip()}"
    }
    
    try:
        response = requests.post(api_url, data=image_bytes, headers=headers, timeout=30)
        if response.status_code == 503:
            return {"error": response.json().get("error", "Model is currently loading")}
            
        response.raise_for_status()
        res = response.json()
        
        if isinstance(res, list) and len(res) > 0:
            ai_prob = 0.0
            for item in res:
                label = item.get("label", "").lower()
                score = item.get("score", 0.0)
                if label in ["artificial", "fake", "ai", "generated", "synth", "label_1"]:
                    ai_prob = score
                    break
            else:
                first_label = res[0].get("label", "").lower()
                first_score = res[0].get("score", 0.0)
                if first_label in ["human", "real", "natural"]:
                    ai_prob = 1.0 - first_score
                else:
                    ai_prob = first_score
                    
            return {
                "is_ai_generated": ai_prob > 0.5,
                "confidence": ai_prob,
                "model_name": f"hf-api/{model_name}",
                "details": {
                    "api_raw_response": res
                }
            }
        else:
            return {"error": f"Unexpected API response format: {res}"}
    except requests.exceptions.RequestException as e:
        try:
            err_msg = response.json().get("error", str(e))
        except Exception:
            err_msg = str(e)
        return {"error": err_msg}


@app.get("/")
async def root():
    return {
        "message": "AI Detection API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "detect_text": "/api/detect/text",
            "detect_image": "/api/detect/image"
        }
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "models": {
            "text": "api" if USE_HF_API else ("loaded" if text_detector else "not_loaded"),
            "image": "api" if USE_HF_API else ("loaded" if image_detector else "not_loaded")
        },
        "version": "1.0.0"
    }


@app.post("/api/detect/text", response_model=DetectionResponse)
async def detect_text(request: TextDetectionRequest):
    if not USE_HF_API and not text_detector:
        raise HTTPException(status_code=503, detail="Text detection model not loaded")

    start_time = time.time()

    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        if USE_HF_API:
            result = detect_text_via_hf_api(request.text)
        else:
            result = text_detector.detect(request.text)
            
        processing_time = time.time() - start_time

        if "error" in result and result["error"]:
            error_msg = result["error"]
            status_code = 503 if "loading" in error_msg.lower() else 500
            raise HTTPException(status_code=status_code, detail=error_msg)

        return DetectionResponse(
            is_ai_generated=result["is_ai_generated"],
            confidence=result["confidence"],
            processing_time=processing_time,
            model_name=result["model_name"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in text detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/detect/image", response_model=DetectionResponse)
async def detect_image(request: ImageDetectionRequest):
    if not USE_HF_API and not image_detector:
        raise HTTPException(status_code=503, detail="Image detection model not loaded")

    start_time = time.time()

    try:
        try:
            if "," in request.image:
                image_data = request.image.split(",")[1]
            else:
                image_data = request.image

            image_bytes = base64.b64decode(image_data)

            if len(image_bytes) > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

        if USE_HF_API:
            result = detect_image_via_hf_api(image_bytes)
        else:
            result = image_detector.detect(image_bytes)
            
        processing_time = time.time() - start_time

        if "error" in result and result["error"]:
            error_msg = result["error"]
            status_code = 503 if "loading" in error_msg.lower() else 500
            raise HTTPException(status_code=status_code, detail=error_msg)

        return DetectionResponse(
            is_ai_generated=result["is_ai_generated"],
            confidence=result["confidence"],
            processing_time=processing_time,
            model_name=result["model_name"],
            details=result.get("details")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in image detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run(app, host=host, port=port)
