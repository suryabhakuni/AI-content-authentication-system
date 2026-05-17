class AIDetectionService {
  constructor() {
    this.apiUrl =
      import.meta.env.VITE_AI_DETECTION_API_URL || "http://localhost:8000";
    this.enabled = import.meta.env.VITE_AI_DETECTION_ENABLED !== "false";
  }

  isEnabled() {
    return this.enabled;
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.apiUrl}/api/health`);

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Health check error:", error);
      throw this._handleError(error);
    }
  }

  async detectText(text) {
    if (!this.enabled) {
      return this._getMockTextResult(text);
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/detect/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Detection failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        isAiGenerated: result.is_ai_generated,
        confidence: result.confidence,
        processingTime: result.processing_time,
        modelName: result.model_name,
        details: result.details,
      };
    } catch (error) {
      console.error("Text detection error:", error);
      throw this._handleError(error);
    }
  }

  async detectImage(imageFile) {
    if (!this.enabled) {
      return this._getMockImageResult(imageFile);
    }

    try {
      const base64Image = await this._convertImageToBase64(imageFile);

      const response = await fetch(`${this.apiUrl}/api/detect/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `Detection failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        isAiGenerated: result.is_ai_generated,
        confidence: result.confidence,
        processingTime: result.processing_time,
        modelName: result.model_name,
        details: result.details,
      };
    } catch (error) {
      console.error("Image detection error:", error);
      throw this._handleError(error);
    }
  }

  _convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });
  }

  _handleError(error) {
    if (error.message.includes("fetch")) {
      return new Error(
        "Unable to connect to AI detection service. Please ensure the backend is running."
      );
    }

    if (error.message.includes("timeout")) {
      return new Error(
        "Detection request timed out. Please try again with a smaller file."
      );
    }

    return error;
  }

  _getMockTextResult(text) {
    const aiPatterns = [
      "as an ai",
      "i don't have personal",
      "i'm sorry, but",
      "it's important to note",
      "in conclusion",
    ];

    const lowerText = text.toLowerCase();
    const hasAiPattern = aiPatterns.some((pattern) => lowerText.includes(pattern));

    return {
      isAiGenerated: hasAiPattern,
      confidence: hasAiPattern ? 0.85 : 0.25,
      processingTime: 0.5,
      modelName: "mock-detector",
      details: { mode: "mock" },
    };
  }

  _getMockImageResult(imageFile) {
    const isAi = Math.random() > 0.5;

    return {
      isAiGenerated: isAi,
      confidence: isAi ? 0.75 : 0.3,
      processingTime: 1.2,
      modelName: "mock-detector",
      details: {
        mode: "mock",
        imageSize: [imageFile.size, imageFile.size],
      },
    };
  }
}

const aiDetectionService = new AIDetectionService();
export default aiDetectionService;
