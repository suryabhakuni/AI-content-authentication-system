import logging
from PIL import Image
import io
import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification
import numpy as np
from scipy import fftpack

logger = logging.getLogger(__name__)


class ImageDetector:
    def __init__(self, model_name="Organika/sdxl-detector"):
        try:
            logger.info(f"Loading image detection model: {model_name}")
            self.model_name = model_name

            try:
                self.processor = AutoImageProcessor.from_pretrained(model_name)
                self.model = AutoModelForImageClassification.from_pretrained(model_name)
            except Exception:
                logger.warning(f"Failed to load {model_name}, trying fallback model")
                model_name = "umm-maybe/AI-image-detector"
                self.model_name = model_name
                self.processor = AutoImageProcessor.from_pretrained(model_name)
                self.model = AutoModelForImageClassification.from_pretrained(model_name)

            self.model.eval()
            logger.info(f"Image detection model loaded successfully: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to load image detection model: {e}")
            raise RuntimeError(f"Failed to load image detection model: {e}")

    def detect(self, image_data):
        try:
            image = self._preprocess_image(image_data)

            if image is None:
                return {
                    "is_ai_generated": False,
                    "confidence": 0.0,
                    "error": "Failed to process image"
                }

            inputs = self.processor(images=image, return_tensors="pt")

            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits

            probs = torch.softmax(logits, dim=-1)

            if probs.shape[1] == 2:
                ai_prob = probs[0][1].item()
            else:
                ai_prob = torch.max(probs[0]).item()

            artifact_score = self._check_ai_artifacts(image)
            fft_score = self._check_frequency_artifacts(image)

            combined_confidence = (ai_prob * 0.9) + ((artifact_score + fft_score) / 2 * 0.1)

            if combined_confidence > 0.7:
                final_confidence = combined_confidence
            elif combined_confidence < 0.3:
                final_confidence = combined_confidence
            else:
                final_confidence = 0.5 + (combined_confidence - 0.5) * 0.7

            is_ai_generated = final_confidence > 0.5

            return {
                "is_ai_generated": is_ai_generated,
                "confidence": float(final_confidence),
                "model_name": self.model_name,
                "details": {
                    "model_confidence": float(ai_prob),
                    "artifact_score": float(artifact_score),
                    "frequency_score": float(fft_score),
                    "combined_raw": float(combined_confidence),
                    "image_size": image.size
                }
            }

        except Exception as e:
            logger.error(f"Error during image detection: {e}")
            return {
                "is_ai_generated": False,
                "confidence": 0.0,
                "error": str(e)
            }

    def _preprocess_image(self, image_data):
        try:
            if isinstance(image_data, bytes):
                image = Image.open(io.BytesIO(image_data))
            elif isinstance(image_data, Image.Image):
                image = image_data
            else:
                logger.error("Invalid image data type")
                return None

            if image.mode != "RGB":
                image = image.convert("RGB")

            max_size = 1024
            if image.width > max_size or image.height > max_size:
                image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                logger.info(f"Image resized to {image.size}")

            return image

        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            return None

    def _check_ai_artifacts(self, image):
        try:
            img_array = np.array(image).astype(np.float32)
            scores = []

            if len(img_array.shape) == 3:
                for channel in range(3):
                    channel_data = img_array[:, :, channel]
                    hist, _ = np.histogram(channel_data, bins=256, range=(0, 255))
                    hist = hist / hist.sum()
                    entropy = -np.sum(hist * np.log2(hist + 1e-10))
                    normalized_entropy = entropy / 8.0
                    scores.append(1.0 - normalized_entropy)

            if len(img_array.shape) == 3:
                gray = np.mean(img_array, axis=2)
            else:
                gray = img_array

            from scipy import ndimage
            sx = ndimage.sobel(gray, axis=0, mode='constant')
            sy = ndimage.sobel(gray, axis=1, mode='constant')
            edge_magnitude = np.hypot(sx, sy)

            edge_std = np.std(edge_magnitude)
            edge_smoothness = 1.0 - min(edge_std / 50.0, 1.0)
            scores.append(edge_smoothness)

            noise_level = np.std(gray - ndimage.gaussian_filter(gray, sigma=1))
            noise_score = 1.0 - min(noise_level / 10.0, 1.0)
            scores.append(noise_score)

            return float(np.mean(scores))

        except Exception as e:
            logger.error(f"Error checking AI artifacts: {e}")
            return 0.5

    def _check_frequency_artifacts(self, image):
        try:
            img_array = np.array(image).astype(np.float32)

            if len(img_array.shape) == 3:
                gray = np.mean(img_array, axis=2)
            else:
                gray = img_array

            fft = fftpack.fft2(gray)
            fft_shift = fftpack.fftshift(fft)
            magnitude_spectrum = np.abs(fft_shift)

            h, w = magnitude_spectrum.shape
            center_h, center_w = h // 2, w // 2
            center_size = min(h, w) // 4

            center_region = magnitude_spectrum[
                center_h - center_size:center_h + center_size,
                center_w - center_size:center_w + center_size
            ]

            outer_region = magnitude_spectrum.copy()
            outer_region[
                center_h - center_size:center_h + center_size,
                center_w - center_size:center_w + center_size
            ] = 0

            center_energy = np.sum(center_region ** 2)
            outer_energy = np.sum(outer_region ** 2)

            if outer_energy > 0:
                freq_ratio = center_energy / outer_energy
                freq_score = min(np.log10(freq_ratio) / 3.0, 1.0)
            else:
                freq_score = 0.5

            return float(max(0.0, min(freq_score, 1.0)))

        except Exception as e:
            logger.error(f"Error checking frequency artifacts: {e}")
            return 0.5
