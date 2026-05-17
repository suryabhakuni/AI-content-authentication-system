import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ResultCard } from "./ResultCard";
import blockchainService from "@/services/blockchainService";
import aiDetectionService from "@/services/aiDetectionService";
import { BLOCKCHAIN_CONFIG, CONTRACT_ABI } from "@/config/blockchain";

export const UploadForm = () => {
  const [textContent, setTextContent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [textLoading, setTextLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [textStoreOnBlockchain, setTextStoreOnBlockchain] = useState(false);
  const [imageStoreOnBlockchain, setImageStoreOnBlockchain] = useState(false);

  const [walletConnected, setWalletConnected] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [gasEstimate, setGasEstimate] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const { toast } = useToast();

  const resultsRef = useRef(null);

  const validateFile = (file) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Supported formats: JPG, PNG, WEBP, GIF`,
      };
    }

    if (file.size > maxSize) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      return {
        valid: false,
        error: `File too large (${fileSizeMB}MB). Maximum size: 10MB`,
      };
    }

    return { valid: true };
  };

  const validateText = (text) => {
    const minLength = 10;
    const maxLength = 50000;
    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      return {
        valid: false,
        error: "Please enter some text to authenticate",
      };
    }

    if (trimmedText.length < minLength) {
      return {
        valid: false,
        error: `Text too short. Minimum ${minLength} characters required (current: ${trimmedText.length})`,
      };
    }

    if (trimmedText.length > maxLength) {
      return {
        valid: false,
        error: `Text too long. Maximum ${maxLength} characters allowed (current: ${trimmedText.length})`,
      };
    }

    return { valid: true };
  };

  const handleBlockchainError = (error) => {
    console.error("Blockchain error:", error);

    // User rejected transaction
    if (error.code === 4001 || error.code === "ACTION_REJECTED") {      return {
        title: "Transaction Cancelled",
        description:
          "You rejected the transaction. Click 'Authenticate' again to retry.",
        action: "retry",
      };
    }

    if (
      error.message?.includes("insufficient funds") ||
      error.code === "INSUFFICIENT_FUNDS"
    ) {
      const networkInfo = blockchainService.getNetworkInfo(
        currentNetwork?.chainId
      );
      const isTestnet = networkInfo?.isTestnet;

      return {
        title: "Insufficient Funds",
        description: isTestnet
          ? "You don't have enough testnet ETH. Get free testnet tokens from a faucet."
          : "You don't have enough ETH to complete this transaction.",
        action: isTestnet ? "faucet" : null,
        faucetUrl:
          networkInfo?.key === "sepolia"
            ? "https://sepoliafaucet.com"
            : "https://faucet.polygon.technology",
      };
    }

    if (
      error.message?.includes("wrong network") ||
      error.code === "NETWORK_ERROR"
    ) {
      return {
        title: "Wrong Network",
        description: "Please switch to the correct network in your wallet.",
        action: "switch",
      };
    }

    if (
      error.message?.includes("timeout") ||
      error.message?.includes("congestion")
    ) {
      return {
        title: "Network Busy",
        description:
          "The network is congested. Please try again in a few moments.",
        action: "retry",
      };
    }

    if (error.message?.includes("Contract not initialized")) {
      return {
        title: "Contract Not Available",
        description:
          "The smart contract is not deployed on this network. Please switch networks or contact support.",
        action: null,
      };
    }

    if (error.message?.includes("Record already exists")) {
      return {
        title: "Already Verified",
        description:
          "This content has already been verified and stored on the blockchain.",
        action: null,
      };
    }

    return {
      title: "Transaction Failed",
      description:
        error.message || "An unexpected error occurred. Please try again.",
      action: "retry",
    };
  };

  useEffect(() => {
    const initializeContractForNetwork = async () => {
      const status = blockchainService.getConnectionStatus();
      setWalletConnected(status.isConnected);
      setCurrentNetwork(status.network);

      if (status.isConnected && status.network) {
        const networkKey = blockchainService.getNetworkInfo(
          status.network.chainId
        )?.key;
        const contractAddress = BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS[networkKey];

        if (contractAddress) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 100));
            blockchainService.initializeContract(CONTRACT_ABI, contractAddress);
          } catch (error) {
            console.error("Failed to initialize contract:", error);
            toast({
              title: "Contract Initialization Failed",
              description: "Please try reconnecting your wallet.",
              variant: "destructive",
            });
          }
        } else {
          console.warn(
            "No contract address configured for network:",
            networkKey
          );
        }
      }
    };

    initializeContractForNetwork();

    const handleAccountChanged = async () => {
      const status = blockchainService.getConnectionStatus();
      setWalletConnected(status.isConnected);
      setCurrentNetwork(status.network);

      // Reinitialize contract on account change
      if (status.isConnected && status.network) {
        const networkKey = blockchainService.getNetworkInfo(
          status.network.chainId
        )?.key;
        const contractAddress = BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS[networkKey];

        if (contractAddress) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 200));
            blockchainService.initializeContract(CONTRACT_ABI, contractAddress);
          } catch (error) {
            console.error("Failed to initialize contract:", error);
            toast({
              title: "Contract Initialization Failed",
              description: "Please try reconnecting your wallet.",
              variant: "destructive",
            });
          }
        } else {
          console.warn("No contract address for network:", networkKey);
        }      }
    };    const handleWalletDisconnected = () => {
      setWalletConnected(false);
      setCurrentNetwork(null);
      setTextStoreOnBlockchain(false);
      setImageStoreOnBlockchain(false);
    };

    window.addEventListener("accountChanged", handleAccountChanged);
    window.addEventListener("walletDisconnected", handleWalletDisconnected);

    return () => {
      window.removeEventListener("accountChanged", handleAccountChanged);
      window.removeEventListener(
        "walletDisconnected",
        handleWalletDisconnected
      );
    };
  }, [toast]);

  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [result]);

  const generateContentHash = async (content) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return "0x" + hashHex;
  };

  const handleTextSubmit = async () => {
    const validation = validateText(textContent);
    if (!validation.valid) {
      toast({
        title: "Invalid Input",
        description: validation.error,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setTextLoading(true);
    setTxStatus(null);
    setLoadingMessage("Analyzing content...");

    try {
      const contentHash = await generateContentHash(textContent);

      setLoadingMessage("Running AI detection...");
      toast({
        title: "Analyzing Text...",
        description: "Running AI detection analysis on your content.",
        variant: "info",
        duration: 3000,
      });

      const detectionResult = await aiDetectionService.detectText(textContent);

      const isAuthentic = !detectionResult.isAiGenerated;
      const confidence = detectionResult.confidence * 100;
      const modelName = detectionResult.modelName;
      const processingTime = detectionResult.processingTime;

      let blockchainData = null;

      if (textStoreOnBlockchain && walletConnected) {
        try {
          if (!blockchainService.contract) {
            throw new Error(
              "Contract not initialized. Please reconnect your wallet."
            );
          }

          setTxStatus("pending");
          setLoadingMessage("Preparing blockchain transaction...");

          const estimate = await blockchainService.estimateGasCost(
            contentHash,
            isAuthentic,
            confidence
          );
          setGasEstimate(estimate);

          setLoadingMessage("Waiting for wallet confirmation...");
          toast({
            title: "Confirm Transaction",
            description: "Please confirm the transaction in your wallet.",
          });

          setLoadingMessage("Storing on blockchain...");
          const txResult = await blockchainService.storeVerificationRecord(
            contentHash,
            isAuthentic,
            confidence
          );

          setTxStatus("confirmed");
          setLoadingMessage("Confirming transaction...");
          blockchainData = {
            transactionHash: txResult.transactionHash,
            blockNumber: txResult.blockNumber,
            gasUsed: txResult.gasUsed,
          };

          toast({
            title: "Blockchain Storage Successful",
            description: `Transaction confirmed in block ${txResult.blockNumber}`,
          });
        } catch (blockchainError) {
          setTxStatus("failed");

          const errorInfo = handleBlockchainError(blockchainError);

          toast({
            title: errorInfo.title,
            description: errorInfo.description,
            variant: "destructive",
            duration: 6000,
            action: errorInfo.faucetUrl ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(errorInfo.faucetUrl, "_blank")}
              >
                Get Testnet ETH
              </Button>
            ) : null,
          });
        }
      }

      const result = {
        isAuthentic,
        confidence,
        contentHash,
        blockchainTxHash: blockchainData?.transactionHash || null,
        blockNumber: blockchainData?.blockNumber || null,
        gasUsed: blockchainData?.gasUsed || null,
        timestamp: new Date().toISOString(),
        certificateId: Math.random().toString(36).substring(7),
        storedOnBlockchain: !!blockchainData,
        modelName: modelName || "AI Detection Model",
        processingTime: processingTime || 0,
      };

      setResult(result);
      toast({
        title: "Analysis Complete",
        description: `Content authentication ${
          result.isAuthentic ? "successful" : "flagged potential issues"
        }.`,
        variant: result.isAuthentic ? "success" : "default",
        duration: 5000,
      });
    } catch (error) {
      console.error("Analysis error:", error);

      let errorTitle = "Analysis Failed";
      let errorDescription =
        "Failed to authenticate content. Please try again.";

      if (
        error.message?.includes("Network") ||
        error.message?.includes("fetch")
      ) {
        errorTitle = "Connection Error";
        errorDescription =
          "Unable to reach the AI detection service. Please check your internet connection and try again.";
      } else if (error.message?.includes("timeout")) {
        errorTitle = "Request Timeout";
        errorDescription =
          "The analysis is taking longer than expected. Please try again with shorter content.";
      } else if (error.message?.includes("Contract not initialized")) {
        errorTitle = "Blockchain Error";
        errorDescription =
          "Smart contract not available. Please reconnect your wallet.";
      } else if (error.response?.status === 413) {
        errorTitle = "Content Too Large";
        errorDescription =
          "The content exceeds the maximum size limit. Please try with shorter text.";
      } else if (error.response?.status >= 500) {
        errorTitle = "Server Error";
        errorDescription =
          "The AI detection service is temporarily unavailable. Please try again in a few moments.";
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
        duration: 6000,
      });
      setTxStatus(null);
    }
    setTextLoading(false);
    setLoadingMessage("");
  };

  const generateFileHash = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          resolve("0x" + hashHex);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImageSubmit = async () => {
    if (!imageFile) {
      toast({
        title: "No File Selected",
        description: "Please select an image to authenticate.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    // Validate file before processing
    const validation = validateFile(imageFile);
    if (!validation.valid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setImageLoading(true);
    setTxStatus(null);
    setLoadingMessage("Processing image...");

    try {
      const contentHash = await generateFileHash(imageFile);

      setLoadingMessage("Running AI detection...");
      toast({
        title: "Analyzing Image...",
        description: "Running AI detection analysis on your image.",
      });

      const detectionResult = await aiDetectionService.detectImage(imageFile);

      const isAuthentic = !detectionResult.isAiGenerated;
      const confidence = detectionResult.confidence * 100;
      const modelName = detectionResult.modelName;
      const processingTime = detectionResult.processingTime;

      let blockchainData = null;

      if (imageStoreOnBlockchain && walletConnected) {
        try {
          if (!blockchainService.contract) {
            throw new Error(
              "Contract not initialized. Please reconnect your wallet."
            );
          }

          setTxStatus("pending");
          setLoadingMessage("Preparing blockchain transaction...");

          const estimate = await blockchainService.estimateGasCost(
            contentHash,
            isAuthentic,
            confidence
          );
          setGasEstimate(estimate);

          setLoadingMessage("Waiting for wallet confirmation...");
          toast({
            title: "Confirm Transaction",
            description: "Please confirm the transaction in your wallet.",
          });

          setLoadingMessage("Storing on blockchain...");
          const txResult = await blockchainService.storeVerificationRecord(
            contentHash,
            isAuthentic,
            confidence
          );

          setTxStatus("confirmed");
          setLoadingMessage("Confirming transaction...");
          blockchainData = {
            transactionHash: txResult.transactionHash,
            blockNumber: txResult.blockNumber,
            gasUsed: txResult.gasUsed,
          };

          toast({
            title: "Blockchain Storage Successful",
            description: `Transaction confirmed in block ${txResult.blockNumber}`,
          });
        } catch (blockchainError) {
          setTxStatus("failed");

          const errorInfo = handleBlockchainError(blockchainError);

          toast({
            title: errorInfo.title,
            description: errorInfo.description,
            variant: "destructive",
            duration: 6000,
            action: errorInfo.faucetUrl ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(errorInfo.faucetUrl, "_blank")}
              >
                Get Testnet ETH
              </Button>
            ) : null,
          });
        }
      }

      const result = {
        isAuthentic,
        confidence,
        contentHash,
        blockchainTxHash: blockchainData?.transactionHash || null,
        blockNumber: blockchainData?.blockNumber || null,
        gasUsed: blockchainData?.gasUsed || null,
        timestamp: new Date().toISOString(),
        certificateId: Math.random().toString(36).substring(7),
        storedOnBlockchain: !!blockchainData,
        modelName: modelName || "AI Detection Model",
        processingTime: processingTime || 0,
      };

      setResult(result);
      toast({
        title: "Analysis Complete",
        description: `Image authentication ${
          result.isAuthentic ? "successful" : "flagged potential issues"
        }.`,
        duration: 4000,
      });
    } catch (error) {
      console.error("Analysis error:", error);

      let errorTitle = "Analysis Failed";
      let errorDescription = "Failed to authenticate image. Please try again.";

      if (
        error.message?.includes("Network") ||
        error.message?.includes("fetch")
      ) {
        errorTitle = "Connection Error";
        errorDescription =
          "Unable to reach the AI detection service. Please check your internet connection and try again.";
      } else if (error.message?.includes("timeout")) {
        errorTitle = "Request Timeout";
        errorDescription =
          "The analysis is taking longer than expected. Please try again with a smaller image.";
      } else if (error.message?.includes("Contract not initialized")) {
        errorTitle = "Blockchain Error";
        errorDescription =
          "Smart contract not available. Please reconnect your wallet.";
      } else if (error.response?.status === 413) {
        errorTitle = "File Too Large";
        errorDescription =
          "The image exceeds the maximum size limit. Please try with a smaller file.";
      } else if (error.response?.status === 415) {
        errorTitle = "Unsupported Format";
        errorDescription =
          "This image format is not supported. Please use JPG, PNG, WEBP, or GIF.";
      } else if (error.response?.status >= 500) {
        errorTitle = "Server Error";
        errorDescription =
          "The AI detection service is temporarily unavailable. Please try again in a few moments.";
      } else if (error.message?.includes("Failed to read")) {
        errorTitle = "File Read Error";
        errorDescription =
          "Unable to read the image file. Please try selecting the file again.";
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
        duration: 6000,
      });
      setTxStatus(null);
    }
    setImageLoading(false);
    setLoadingMessage("");
  };

  return (
    <section id="upload-section" className="section-spacing px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Authenticate Your Content
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload text or images for AI-powered authenticity verification
          </p>
        </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="card-modern h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <FileText className="text-primary" size={28} />
                  Text Authentication
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Paste or type content to verify its authenticity using AI
                  detection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Enter your content here..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className={`min-h-[240px] resize-none rounded-lg border-2 transition-fast text-base ${
                      textContent.trim().length > 0 &&
                      textContent.trim().length < 10
                        ? "border-red-500 focus:border-red-500"
                        : "focus:border-primary"
                    }`}
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={`${
                        textContent.trim().length > 0 &&
                        textContent.trim().length < 10
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : textContent.trim().length >= 10
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {textContent.trim().length > 0 &&
                      textContent.trim().length < 10
                        ? `${
                            10 - textContent.trim().length
                          } more characters needed`
                        : textContent.trim().length >= 10
                        ? "Ready to authenticate"
                        : "Minimum 10 characters"}
                    </span>
                    <span
                      className={`${
                        textContent.length > 45000
                          ? "text-amber-600 dark:text-amber-400 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {textContent.length.toLocaleString()} / 50,000
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="blockchain-text"
                      checked={textStoreOnBlockchain}
                      onCheckedChange={(checked) =>
                        setTextStoreOnBlockchain(checked)
                      }
                      disabled={!walletConnected}
                    />
                    <label
                      htmlFor="blockchain-text"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Store verification on blockchain
                    </label>
                    {currentNetwork && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {blockchainService.getNetworkInfo(
                          currentNetwork.chainId
                        )?.key === "hardhat"
                          ? "Local"
                          : blockchainService.getNetworkInfo(
                              currentNetwork.chainId
                            )?.key === "sepolia"
                          ? "Sepolia"
                          : "Mainnet"}
                      </Badge>
                    )}
                  </div>

                  {!walletConnected && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <p>
                        Connect your wallet in the navbar to enable blockchain
                        storage
                      </p>
                    </div>
                  )}

                  {walletConnected &&
                    currentNetwork &&
                    !BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS[
                      blockchainService.getNetworkInfo(currentNetwork.chainId)
                        ?.key
                    ] && (
                      <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
                        <AlertCircle
                          size={16}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <div>
                          <p className="font-medium">Wrong Network</p>
                          <p className="mt-1">
                            Contract not deployed on{" "}
                            {
                              blockchainService.getNetworkInfo(
                                currentNetwork.chainId
                              )?.chainName
                            }
                            . Please switch to <strong>Hardhat Local</strong>{" "}
                            network in MetaMask (RPC: http://127.0.0.1:8545,
                            Chain ID: 31337).
                          </p>
                        </div>
                      </div>
                    )}

                  {textStoreOnBlockchain && walletConnected && gasEstimate && (
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">
                        Estimated gas cost:{" "}
                        <span className="font-medium text-foreground">
                          {gasEstimate.totalCostEth} ETH
                        </span>
                        {gasEstimate.totalCostUsd && (
                          <span className="text-muted-foreground">
                            {" "}
                            (~${gasEstimate.totalCostUsd})
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {txStatus === "pending" && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <Loader2 size={16} className="animate-spin" />
                      <p>Transaction pending...</p>
                    </div>
                  )}

                  {txStatus === "confirmed" && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <Wallet size={16} />
                      <p>Stored on blockchain successfully!</p>
                    </div>
                  )}

                  {txStatus === "failed" && (
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <AlertCircle size={16} />
                      <p>Transaction failed. Please try again.</p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleTextSubmit}
                  disabled={textLoading || !textContent.trim()}
                  className={`w-full py-6 text-base font-medium hover:scale-[1.02] active:scale-[0.98] transition-fast ${
                    textLoading ? "animate-pulse" : ""
                  }`}
                >
                  {textLoading ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={18} />
                      {loadingMessage || "Analyzing..."}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2" size={18} />
                      Authenticate Text
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="card-modern h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <ImageIcon className="text-primary" size={28} />
                  Image Authentication
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Upload images to detect AI-generated or manipulated content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center hover:border-primary hover:bg-muted/30 transition-fast cursor-pointer ${
                    fileError
                      ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                      : "border-border"
                  }`}
                >
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const validation = validateFile(file);
                        if (!validation.valid) {
                          setFileError(validation.error);
                          setImageFile(null);
                          toast({
                            title: "Invalid File",
                            description: validation.error,
                            variant: "destructive",
                            duration: 5000,
                          });
                        } else {
                          setFileError(null);
                          setImageFile(file);
                          toast({
                            title: "File Selected",
                            description: `${file.name} (${(
                              file.size /
                              1024 /
                              1024
                            ).toFixed(2)}MB)`,
                            duration: 3000,
                          });
                        }
                      } else {
                        setImageFile(null);
                        setFileError(null);
                      }
                    }}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer block"
                  >
                    <ImageIcon
                      className={`mx-auto mb-4 ${
                        fileError ? "text-red-500" : "text-muted-foreground"
                      }`}
                      size={56}
                    />
                    <p className="text-base text-foreground font-medium mb-2">
                      {imageFile ? imageFile.name : "Click to upload an image"}
                    </p>
                    <p
                      className={`text-sm ${
                        fileError
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {fileError || "Supports JPG, PNG, WEBP, GIF up to 10MB"}
                    </p>
                  </label>
                </div>

                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="blockchain-image"
                      checked={imageStoreOnBlockchain}
                      onCheckedChange={(checked) =>
                        setImageStoreOnBlockchain(checked)
                      }
                      disabled={!walletConnected}
                    />
                    <label
                      htmlFor="blockchain-image"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Store verification on blockchain
                    </label>
                    {currentNetwork && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {blockchainService.getNetworkInfo(
                          currentNetwork.chainId
                        )?.key === "hardhat"
                          ? "Local"
                          : blockchainService.getNetworkInfo(
                              currentNetwork.chainId
                            )?.key === "sepolia"
                          ? "Sepolia"
                          : "Mainnet"}
                      </Badge>
                    )}
                  </div>

                  {!walletConnected && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <p>
                        Connect your wallet in the navbar to enable blockchain
                        storage
                      </p>
                    </div>
                  )}

                  {walletConnected &&
                    currentNetwork &&
                    !BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS[
                      blockchainService.getNetworkInfo(currentNetwork.chainId)
                        ?.key
                    ] && (
                      <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
                        <AlertCircle
                          size={16}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <div>
                          <p className="font-medium">Wrong Network</p>
                          <p className="mt-1">
                            Contract not deployed on{" "}
                            {
                              blockchainService.getNetworkInfo(
                                currentNetwork.chainId
                              )?.chainName
                            }
                            . Please switch to <strong>Hardhat Local</strong>{" "}
                            network in MetaMask (RPC: http://127.0.0.1:8545,
                            Chain ID: 31337).
                          </p>
                        </div>
                      </div>
                    )}

                  {imageStoreOnBlockchain && walletConnected && gasEstimate && (
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">
                        Estimated gas cost:{" "}
                        <span className="font-medium text-foreground">
                          {gasEstimate.totalCostEth} ETH
                        </span>
                        {gasEstimate.totalCostUsd && (
                          <span className="text-muted-foreground">
                            {" "}
                            (~${gasEstimate.totalCostUsd})
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {txStatus === "pending" && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <Loader2 size={16} className="animate-spin" />
                      <p>Transaction pending...</p>
                    </div>
                  )}

                  {txStatus === "confirmed" && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <Wallet size={16} />
                      <p>Stored on blockchain successfully!</p>
                    </div>
                  )}

                  {txStatus === "failed" && (
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                      <AlertCircle size={16} />
                      <p>Transaction failed. Please try again.</p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleImageSubmit}
                  disabled={imageLoading || !imageFile}
                  className={`w-full py-6 text-base font-medium hover:scale-[1.02] active:scale-[0.98] transition-fast ${
                    imageLoading ? "animate-pulse" : ""
                  }`}
                >
                  {imageLoading ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={18} />
                      {loadingMessage || "Analyzing..."}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2" size={18} />
                      Authenticate Image
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {result && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <ResultCard result={result} />
          </motion.div>
        )}
      </div>
    </section>
  );
};
