import logging
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

logger = logging.getLogger(__name__)


class TextDetector:
    def __init__(self, model_name="Hello-SimpleAI/chatgpt-detector-roberta"):
        try:
            logger.info(f"Loading text detection model: {model_name}")
            self.model_name = model_name
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
            self.model.eval()
            logger.info("Text detection model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load text detection model: {e}")
            raise RuntimeError(f"Failed to load text detection model: {e}")

    def detect(self, text):
        try:
            cleaned_text = self._preprocess(text)

            if not cleaned_text:
                return {
                    "is_ai_generated": False,
                    "confidence": 0.0,
                    "error": "Empty text after preprocessing"
                }

            inputs = self.tokenizer(
                cleaned_text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )

            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits

            confidence = self._calculate_confidence(logits)
            is_ai_generated = confidence > 0.5

            return {
                "is_ai_generated": is_ai_generated,
                "confidence": float(confidence),
                "model_name": self.model_name
            }

        except Exception as e:
            logger.error(f"Error during text detection: {e}")
            return {
                "is_ai_generated": False,
                "confidence": 0.0,
                "error": str(e)
            }

    def _preprocess(self, text):
        if not text:
            return ""

        cleaned = " ".join(text.split())

        if len(cleaned) > 10000:
            cleaned = cleaned[:10000]
            logger.warning("Text truncated to 10000 characters")

        return cleaned

    def _calculate_confidence(self, logits):
        probs = torch.softmax(logits, dim=-1)

        # Label 0 = Human-written, Label 1 = AI-generated
        ai_prob = probs[0][1].item() if probs.shape[1] > 1 else probs[0][0].item()

        return ai_prob
