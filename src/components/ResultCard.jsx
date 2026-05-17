import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  Download,
  Shield,
  Blocks,
  Search,
  Loader2,
  Network,
  Clock,
  Fuel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import blockchainService from "@/services/blockchainService";

export const ResultCard = ({ result }) => {
  const { toast } = useToast();
  const [verifying, setVerifying] = React.useState(false);
  const [blockchainRecord, setBlockchainRecord] = React.useState(null);
  const [confirmations, setConfirmations] = React.useState(0);

  const getNetworkInfo = () => {
    const status = blockchainService.getConnectionStatus();
    if (!status.network) return null;

    return blockchainService.getNetworkInfo(status.network.chainId);
  };

  const getExplorerUrl = () => {
    if (!result.blockchainTxHash || !result.storedOnBlockchain) return null;

    const status = blockchainService.getConnectionStatus();
    if (!status.network)
      return `https://etherscan.io/tx/${result.blockchainTxHash}`;

    const networkInfo = blockchainService.getNetworkInfo(
      status.network.chainId
    );
    if (!networkInfo || !networkInfo.blockExplorer) return null;

    return `${networkInfo.blockExplorer}/tx/${result.blockchainTxHash}`;
  };

  React.useEffect(() => {
    if (result.storedOnBlockchain && result.blockNumber) {
      const interval = setInterval(() => {
        setConfirmations((prev) => (prev < 12 ? prev + 1 : prev));
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [result.storedOnBlockchain, result.blockNumber]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
      variant: "success",
      duration: 3000,
    });
  };

  const verifyOnBlockchain = async () => {
    setVerifying(true);
    try {
      const record = await blockchainService.getVerificationRecord(
        result.contentHash
      );

      if (record.exists) {
        setBlockchainRecord(record);
        toast({
          title: "Blockchain Record Found",
          description: `Verified by ${record.verifier.slice(
            0,
            6
          )}...${record.verifier.slice(-4)} on ${new Date(
            record.timestamp * 1000
          ).toLocaleDateString()}`,
          variant: "success",
          duration: 5000,
        });
      } else {
        toast({
          title: "No Blockchain Record",
          description:
            "This content has not been verified on the blockchain yet.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Blockchain verification error:", error);
      toast({
        title: "Verification Failed",
        description:
          error.message || "Failed to query blockchain. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const downloadCertificate = () => {
    const networkInfo = getNetworkInfo();

    const certificate = {
      certificateId: result.certificateId,
      certificateVersion: "1.0",
      issuedAt: result.timestamp,
      issuer: "AI Authentic Guard",

      contentHash: result.contentHash,
      hashAlgorithm: "SHA-256",

      verification: {
        isAuthentic: result.isAuthentic,
        authenticity: result.isAuthentic ? "Authentic" : "Potentially Modified",
        confidence: `${result.confidence.toFixed(1)}%`,
        confidenceScore: result.confidence,
        verificationMethod: "AI Detection",
        ...(result.modelName && {
          aiDetection: {
            modelUsed: result.modelName,
            processingTime: result.processingTime
              ? `${result.processingTime.toFixed(3)}s`
              : "N/A",
            detectionDate: result.timestamp,
            confidenceLevel:
              result.confidence >= 80
                ? "High"
                : result.confidence >= 50
                ? "Medium"
                : "Low",
          },
        }),
      },

      ...(result.storedOnBlockchain && {
        blockchain: {
          stored: true,
          network: networkInfo
            ? {
                name: networkInfo.chainName,
                chainId: networkInfo.chainId,
                isTestnet: networkInfo.isTestnet,
              }
            : null,
          transaction: {
            hash: result.blockchainTxHash,
            blockNumber: result.blockNumber,
            confirmations: confirmations,
            status: confirmations >= 12 ? "Confirmed" : "Pending",
          },
          gas: {
            used: result.gasUsed,
            cost: result.gasCost || "~0.0001 ETH",
          },
          explorer: {
            url: getExplorerUrl(),
            transactionUrl: getExplorerUrl(),
          },
          timestamp: result.timestamp,
        },
      }),

      ...(blockchainRecord &&
        blockchainRecord.exists && {
          blockchainVerification: {
            recordExists: true,
            verifiedBy: blockchainRecord.verifier,
            verificationTimestamp: new Date(
              blockchainRecord.timestamp * 1000
            ).toISOString(),
            onChainAuthenticity: blockchainRecord.isAuthentic,
            onChainConfidence: blockchainRecord.confidence,
            matchesLocalVerification:
              blockchainRecord.isAuthentic === result.isAuthentic &&
              blockchainRecord.confidence === Math.round(result.confidence),
          },
        }),

      validity: {
        validFrom: result.timestamp,
        validUntil: "Permanent (Blockchain Immutable)",
        canBeVerified: result.storedOnBlockchain,
      },

      verificationInstructions: result.storedOnBlockchain
        ? {
            method: "Blockchain Verification",
            steps: [
              "1. Visit the blockchain explorer URL provided above",
              "2. Verify the transaction hash matches this certificate",
              "3. Check the transaction input data contains the content hash",
              "4. Confirm the transaction is confirmed on the blockchain",
            ],
            note: "This certificate is cryptographically secured on the blockchain and cannot be tampered with.",
          }
        : {
            method: "Local Verification Only",
            note: "This certificate was not stored on blockchain. Verification is based on local authentication only.",
          },
    };

    const blob = new Blob([JSON.stringify(certificate, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-authentic-guard-certificate-${result.certificateId}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Certificate Downloaded",
      description: result.storedOnBlockchain
        ? "Blockchain-verified certificate saved to your device."
        : "Authentication certificate saved to your device.",
      variant: "success",
      duration: 4000,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="rounded-xl border-2 shadow-lg border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {result.isAuthentic ? (
                <CheckCircle
                  className="text-green-500 flex-shrink-0"
                  size={36}
                />
              ) : (
                <AlertTriangle
                  className="text-yellow-500 flex-shrink-0"
                  size={36}
                />
              )}
              <div>
                <CardTitle
                  className={`text-2xl ${
                    result.isAuthentic
                      ? "text-green-600 dark:text-green-500"
                      : "text-yellow-600 dark:text-yellow-500"
                  }`}
                >
                  {result.isAuthentic
                    ? "Content Verified"
                    : "Potential Issues Detected"}
                </CardTitle>
                <CardDescription className="text-base mt-1 flex items-center gap-2 flex-wrap">
                  <span>Confidence: {result.confidence.toFixed(1)}%</span>
                  {result.confidence >= 80 && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                    >
                      High Confidence
                    </Badge>
                  )}
                  {result.confidence >= 50 && result.confidence < 80 && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300"
                    >
                      Medium Confidence
                    </Badge>
                  )}
                  {result.confidence < 50 && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300"
                    >
                      Low Confidence
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge
                variant={result.isAuthentic ? "default" : "destructive"}
                className="text-sm px-3 py-1"
              >
                {result.isAuthentic ? "Authentic" : "Flagged"}
              </Badge>
              {result.storedOnBlockchain && (
                <Badge
                  variant="outline"
                  className="text-sm px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                >
                  <Shield size={14} className="mr-1" />
                  Verified on Blockchain
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pt-6">
          {(result.modelName || result.processingTime) && (
            <div className="p-5 bg-purple-50 dark:bg-purple-900/10 rounded-lg border-2 border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-4">
                <Shield
                  className="text-purple-600 dark:text-purple-400"
                  size={20}
                />
                <h4 className="font-semibold text-purple-800 dark:text-purple-200 text-base">
                  AI Detection Analysis
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.modelName && (
                  <div>
                    <label className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1 block">
                      Detection Model
                    </label>
                    <div className="p-2 bg-white dark:bg-purple-950/30 rounded text-xs font-mono text-purple-900 dark:text-purple-100">
                      {result.modelName}
                    </div>
                  </div>
                )}

                {result.processingTime && (
                  <div>
                    <label className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
                      <Clock size={12} />
                      Processing Time
                    </label>
                    <div className="p-2 bg-white dark:bg-purple-950/30 rounded text-xs text-purple-900 dark:text-purple-100">
                      {result.processingTime.toFixed(2)}s
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1 block">
                    Confidence Level
                  </label>
                  <div className="p-2 bg-white dark:bg-purple-950/30 rounded">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-purple-200 dark:bg-purple-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            result.isAuthentic
                              ? result.confidence >= 80
                                ? "bg-green-500"
                                : result.confidence >= 50
                                ? "bg-yellow-500"
                                : "bg-orange-500"
                              : result.confidence >= 80
                              ? "bg-red-500"
                              : result.confidence >= 50
                              ? "bg-orange-500"
                              : "bg-yellow-500"
                          }`}
                          style={{ width: `${result.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-purple-900 dark:text-purple-100">
                        {result.confidence.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
                <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
                  {result.confidence >= 80 && (
                    <>
                      <strong>High Confidence:</strong> The AI detection model
                      is very confident in this assessment.
                      {result.isAuthentic
                        ? " This content shows strong indicators of being human-created or authentic."
                        : " This content shows strong indicators of being AI-generated."}
                    </>
                  )}
                  {result.confidence >= 50 && result.confidence < 80 && (
                    <>
                      <strong>Medium Confidence:</strong> The AI detection model
                      has moderate confidence in this assessment.
                      {result.isAuthentic
                        ? " This content shows some indicators of being authentic, but may have mixed characteristics."
                        : " This content shows some indicators of being AI-generated, but may have mixed characteristics."}
                    </>
                  )}
                  {result.confidence < 50 && (
                    <>
                      <strong>Low Confidence:</strong> The AI detection model
                      has low confidence in this assessment. The content
                      characteristics are ambiguous and may require manual
                      review for accurate determination.
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {result.storedOnBlockchain && (
            <div className="p-5 bg-blue-50 dark:bg-blue-900/10 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Blocks
                    className="text-blue-600 dark:text-blue-400"
                    size={20}
                  />
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 text-base">
                    Blockchain Verification
                  </h4>
                </div>
                {getNetworkInfo() && (
                  <Badge
                    variant="outline"
                    className="bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200"
                  >
                    <Network size={12} className="mr-1" />
                    {getNetworkInfo().chainName}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 block">
                    Transaction Hash
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-white dark:bg-blue-950/30 rounded text-xs font-mono break-all text-blue-900 dark:text-blue-100">
                      {result.blockchainTxHash}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          result.blockchainTxHash,
                          "Transaction hash"
                        )
                      }
                      className="flex-shrink-0 h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                    <Blocks size={12} />
                    Block Number
                  </label>
                  <div className="p-2 bg-white dark:bg-blue-950/30 rounded text-xs font-mono text-blue-900 dark:text-blue-100">
                    {result.blockNumber
                      ? `#${result.blockNumber.toLocaleString()}`
                      : "Pending..."}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                    <Clock size={12} />
                    Confirmations
                  </label>
                  <div className="p-2 bg-white dark:bg-blue-950/30 rounded text-xs font-mono text-blue-900 dark:text-blue-100">
                    {result.blockNumber ? (
                      <span className="flex items-center gap-1">
                        {confirmations}
                        {confirmations < 12 && (
                          <Loader2 size={10} className="animate-spin" />
                        )}
                      </span>
                    ) : (
                      "Pending..."
                    )}
                  </div>
                </div>

                {result.gasUsed && (
                  <div>
                    <label className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                      <Fuel size={12} />
                      Gas Used
                    </label>
                    <div className="p-2 bg-white dark:bg-blue-950/30 rounded text-xs font-mono text-blue-900 dark:text-blue-100">
                      {parseInt(result.gasUsed).toLocaleString()} units
                    </div>
                  </div>
                )}

                {result.gasUsed && (
                  <div>
                    <label className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                      <Fuel size={12} />
                      Transaction Cost
                    </label>
                    <div className="p-2 bg-white dark:bg-blue-950/30 rounded text-xs font-mono text-blue-900 dark:text-blue-100">
                      {result.gasCost || "~0.0001 ETH"}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                  <Shield size={14} />
                  <span className="font-medium">
                    {confirmations >= 12
                      ? "Fully Confirmed - Immutably Stored"
                      : confirmations > 0
                      ? `Confirming... (${confirmations}/12 blocks)`
                      : "Pending Confirmation"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Content Hash
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-muted/50 rounded-md text-sm font-mono break-all">
                    {result.contentHash}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(result.contentHash, "Content hash")
                    }
                    className="flex-shrink-0 h-10 w-10 p-0 hover:scale-110 transition-fast"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Certificate ID
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-muted/50 rounded-md text-sm font-mono break-all">
                    {result.certificateId}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(result.certificateId, "Certificate ID")
                    }
                    className="flex-shrink-0 h-10 w-10 p-0 hover:scale-110 transition-fast"
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Timestamp
                </label>
                <div className="p-3 bg-muted/50 rounded-md text-sm font-medium">
                  {new Date(result.timestamp).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                  Verification Status
                </label>
                <div className="p-3 bg-muted/50 rounded-md text-sm font-medium">
                  {result.storedOnBlockchain ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-2">
                      <Shield size={16} />
                      Immutably Stored
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Local Verification Only
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {blockchainRecord && blockchainRecord.exists && (
            <div className="p-5 bg-green-50 dark:bg-green-900/10 rounded-lg border-2 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-4">
                <Shield
                  className="text-green-600 dark:text-green-400"
                  size={20}
                />
                <h4 className="font-semibold text-green-800 dark:text-green-200 text-base">
                  Blockchain Record Found
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1 block">
                    Verified By
                  </label>
                  <code className="block p-2 bg-white dark:bg-green-950/30 rounded text-xs font-mono text-green-900 dark:text-green-100">
                    {blockchainRecord.verifier}
                  </code>
                </div>
                <div>
                  <label className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1 block">
                    Verification Date
                  </label>
                  <div className="p-2 bg-white dark:bg-green-950/30 rounded text-xs text-green-900 dark:text-green-100">
                    {new Date(
                      blockchainRecord.timestamp * 1000
                    ).toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1 block">
                    Authenticity
                  </label>
                  <div className="p-2 bg-white dark:bg-green-950/30 rounded text-xs text-green-900 dark:text-green-100">
                    {blockchainRecord.isAuthentic ? "Authentic" : "Flagged"}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1 block">
                    Confidence
                  </label>
                  <div className="p-2 bg-white dark:bg-green-950/30 rounded text-xs text-green-900 dark:text-green-100">
                    {blockchainRecord.confidence}%
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
            <Button
              onClick={downloadCertificate}
              className="flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-fast"
            >
              <Download size={18} />
              Download Certificate
            </Button>
            {result.storedOnBlockchain && getExplorerUrl() && (
              <Button
                variant="outline"
                onClick={() => window.open(getExplorerUrl(), "_blank")}
                className="flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-fast"
              >
                <ExternalLink size={18} />
                View on Blockchain Explorer
              </Button>
            )}
            {!result.storedOnBlockchain && (
              <Button
                variant="outline"
                onClick={verifyOnBlockchain}
                disabled={verifying}
                className="flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-fast"
              >
                {verifying ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Checking Blockchain...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Verify on Blockchain
                  </>
                )}
              </Button>
            )}
          </div>

          {!result.isAuthentic && (
            <div className="p-5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3 text-base">
                Detection Notes
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 leading-relaxed">
                Our AI system has detected patterns suggesting this content may
                have been generated or significantly modified by artificial
                intelligence. This does not necessarily mean the content is
                inauthentic, but warrants further review.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
