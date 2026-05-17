import { useState } from "react";
import { motion } from "framer-motion";
import { Search, FileText, Hash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ResultCard } from "./ResultCard";
import blockchainService from "@/services/blockchainService";

export const VerifyForm = () => {
  const [certificateId, setCertificateId] = useState("");
  const [contentHash, setContentHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [validationErrors, setValidationErrors] = useState({
    certificateId: "",
    contentHash: "",
  });
  const { toast } = useToast();

  const validateCertificateId = (value) => {
    if (!value.trim()) return "";

    if (value.length < 3) {
      return "Certificate ID too short (minimum 3 characters)";
    }

    return "";
  };

  const validateContentHash = (value) => {
    if (!value.trim()) return "";

    if (!value.startsWith("0x")) {
      return "Content hash must start with '0x'";
    }

    const hexPattern = /^0x[0-9a-fA-F]+$/;
    if (!hexPattern.test(value)) {
      return "Invalid hash format (must be hexadecimal)";
    }

    if (value.length < 10) {
      return "Hash too short";
    }

    return "";
  };

  const handleVerificationError = (error) => {
    console.error("Verification error:", error);

    if (
      error.message?.includes("wallet") ||
      error.message?.includes("MetaMask") ||
      error.code === 4001
    ) {
      toast({
        title: "Wallet Connection Required",
        description:
          "Please connect your wallet to verify certificates. Click the 'Connect Wallet' button in the navigation bar.",
        variant: "destructive",
        duration: 6000,
      });
      return;
    }

    if (
      error.message?.includes("network") ||
      error.message?.includes("fetch") ||
      error.code === "NETWORK_ERROR"
    ) {
      toast({
        title: "Network Connection Error",
        description:
          "Unable to connect to the blockchain. Check your internet connection and try again.",
        variant: "destructive",
        duration: 6000,
        action: (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleVerify()}
            className="ml-2"
          >
            Retry
          </Button>
        ),
      });
      return;
    }

    if (
      error.message?.includes("chain") ||
      error.message?.includes("network") ||
      error.code === -32603
    ) {
      const networkInfo = blockchainService.getNetworkInfo();
      toast({
        title: "Wrong Network",
        description: `Please switch to ${networkInfo.name} network in your wallet to verify certificates.`,
        variant: "destructive",
        duration: 6000,
      });
      return;
    }

    if (error.code === -32603 || error.message?.includes("RPC")) {
      toast({
        title: "Blockchain Connection Error",
        description:
          "Unable to connect to the blockchain RPC. The network may be experiencing issues. Please try again in a moment.",
        variant: "destructive",
        duration: 6000,
        action: (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleVerify()}
            className="ml-2"
          >
            Retry
          </Button>
        ),
      });
      return;
    }

    // Generic error with retry
    toast({
      title: "Verification Failed",
      description:
        error.message ||
        "An unexpected error occurred. Please try again or contact support if the issue persists.",
      variant: "destructive",
      duration: 6000,
      action: (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleVerify()}
          className="ml-2"
        >
          Retry
        </Button>
      ),
    });
  };

  const handleVerify = async () => {
    if (!certificateId.trim() && !contentHash.trim()) {
      toast({
        title: "Missing Information",
        description:
          "Please enter either a Certificate ID or Content Hash to verify.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    const certError = validateCertificateId(certificateId);
    const hashError = validateContentHash(contentHash);

    if (certError || hashError) {
      setValidationErrors({
        certificateId: certError,
        contentHash: hashError,
      });

      toast({
        title: "Invalid Input",
        description: certError || hashError,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setValidationErrors({ certificateId: "", contentHash: "" });

    setLoading(true);
    try {
      const hashToVerify = contentHash.trim() || certificateId.trim();

      console.log("Verifying hash:", hashToVerify);

      const record = await blockchainService.getVerificationRecord(
        hashToVerify
      );

      if (record && record.exists) {
        const networkInfo = await blockchainService.getCurrentNetworkInfo();

        const result = {
          isAuthentic: record.isAuthentic,
          confidence: Number(record.confidence),
          contentHash: record.contentHash,
          timestamp: new Date(Number(record.timestamp) * 1000).toISOString(),
          certificateId: certificateId || hashToVerify.substring(0, 10),
          verifier: record.verifier,
          network: networkInfo.name,
          blockExplorer: networkInfo.blockExplorer,
        };

        console.log("Verification result:", result);
        setResult(result);
        toast({
          title: "Verification Complete",
          description: `Certificate found on blockchain! Content is ${
            record.isAuthentic ? "AUTHENTIC" : "AI-GENERATED"
          } (${record.confidence}% confidence)`,
          variant: "success",
          duration: 5000,
        });
      } else {
        const networkInfo = await blockchainService.getCurrentNetworkInfo();
        toast({
          title: "Certificate Not Found",
          description: `No matching certificate found on ${networkInfo.name}. Common issues:
• Certificate may be on a different network
• Content hash may be incorrect
• Certificate may not have been created yet`,
          variant: "destructive",
          duration: 7000,
        });
        setResult(null);
      }
    } catch (error) {
      handleVerificationError(error);
      setResult(null);
    }
    setLoading(false);
  };

  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold mb-4">
            Verify Authentication Certificate
          </h2>
          <p className="text-xl text-muted-foreground">
            Check the blockchain for existing authentication certificates
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-12"
        >
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="text-primary" size={24} />
                Certificate Verification
              </CardTitle>
              <CardDescription>
                Enter a Certificate ID or Content Hash to verify its
                authenticity on the blockchain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileText size={16} />
                    Certificate ID
                  </label>
                  <Input
                    placeholder="e.g., abc123def"
                    value={certificateId}
                    onChange={(e) => {
                      setCertificateId(e.target.value);
                      if (validationErrors.certificateId) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          certificateId: "",
                        }));
                      }
                    }}
                    className={`font-mono ${
                      validationErrors.certificateId
                        ? "border-red-500 focus:border-red-500 animate-shake"
                        : ""
                    }`}
                  />
                  <p
                    className={`text-xs ${
                      validationErrors.certificateId
                        ? "text-red-600 dark:text-red-400 font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {validationErrors.certificateId ||
                      "The unique identifier from your authentication certificate"}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Hash size={16} />
                    Content Hash
                  </label>
                  <Input
                    placeholder="e.g., 0x1a2b3c4d..."
                    value={contentHash}
                    onChange={(e) => {
                      setContentHash(e.target.value);
                      if (validationErrors.contentHash) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          contentHash: "",
                        }));
                      }
                    }}
                    className={`font-mono ${
                      validationErrors.contentHash
                        ? "border-red-500 focus:border-red-500 animate-shake"
                        : ""
                    }`}
                  />
                  <p
                    className={`text-xs ${
                      validationErrors.contentHash
                        ? "text-red-600 dark:text-red-400 font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {validationErrors.contentHash ||
                      "The cryptographic hash of your content"}
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={handleVerify}
                  disabled={
                    loading || (!certificateId.trim() && !contentHash.trim())
                  }
                  size="lg"
                  className={`min-w-[200px] ${loading ? "animate-pulse" : ""}`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={16} />
                      Verifying on blockchain...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2" size={16} />
                      Verify Certificate
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground space-y-1">
                <p>
                  All verifications are performed directly on the blockchain
                </p>
                <p>No personal information is stored or transmitted</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {result && (
          <motion.div
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
