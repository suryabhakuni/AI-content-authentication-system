import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Network,
  Link as LinkIcon,
  ExternalLink,
  CheckCircle2,
  XCircle,
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import blockchainService from "@/services/blockchainService";
import { BLOCKCHAIN_CONFIG } from "@/config/blockchain";
import { getRecommendedFaucet, TESTNETS } from "@/utils/testnetHelpers";

export const BlockchainSettings = ({ onClose }) => {
  const [settings, setSettings] = useState({
    network: "hardhat",
    mockMode: false,
  });
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  // Network options
  const networks = [
    { key: "hardhat", name: "Hardhat Local", isTestnet: true },
    { key: "sepolia", name: "Sepolia Testnet", isTestnet: true },
    { key: "mainnet", name: "Ethereum Mainnet", isTestnet: false },
  ];

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("blockchainSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error("Failed to parse saved settings:", error);
      }
    }

    // Check current connection status
    checkConnectionStatus();
  }, []);

  // Check blockchain connection status
  const checkConnectionStatus = async () => {
    setIsChecking(true);
    try {
      const status = blockchainService.getConnectionStatus();
      setConnectionStatus(status);
    } catch (error) {
      console.error("Failed to check connection:", error);
    } finally {
      setIsChecking(false);
    }
  };

  // Save settings to localStorage
  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem("blockchainSettings", JSON.stringify(newSettings));
  };

  // Handle network change
  const handleNetworkChange = async (networkKey) => {
    const newSettings = { ...settings, network: networkKey };
    saveSettings(newSettings);

    toast({
      title: "Network Changed",
      description: `Switched to ${
        networks.find((n) => n.key === networkKey)?.name
      }`,
    });

    // Refresh connection status
    await checkConnectionStatus();
  };

  // Handle mock mode toggle
  const handleMockModeToggle = (enabled) => {
    const newSettings = { ...settings, mockMode: enabled };
    saveSettings(newSettings);

    if (enabled) {
      blockchainService.enableMockMode();
      toast({
        title: "Mock Mode Enabled",
        description: "Blockchain operations will be simulated",
      });
    } else {
      blockchainService.disableMockMode();
      toast({
        title: "Mock Mode Disabled",
        description: "Using real blockchain connection",
      });
    }
  };

  // Get current contract address
  const getCurrentContractAddress = () => {
    return (
      BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS[settings.network] || "Not deployed"
    );
  };

  // Get network info
  const getCurrentNetwork = () => {
    return networks.find((n) => n.key === settings.network);
  };

  // Get faucet for current network
  const getFaucetInfo = () => {
    const network = getCurrentNetwork();
    if (!network?.isTestnet) return null;

    return getRecommendedFaucet(settings.network);
  };

  // Get RPC status
  const getRpcStatus = () => {
    if (settings.mockMode) {
      return { status: "mock", icon: AlertCircle, color: "text-yellow-500" };
    }

    if (connectionStatus?.isConnected) {
      return {
        status: "connected",
        icon: CheckCircle2,
        color: "text-green-500",
      };
    }

    return { status: "disconnected", icon: XCircle, color: "text-red-500" };
  };

  const contractAddress = getCurrentContractAddress();
  const currentNetwork = getCurrentNetwork();
  const faucetInfo = getFaucetInfo();
  const rpcStatus = getRpcStatus();
  const StatusIcon = rpcStatus.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Blockchain Settings</CardTitle>
          </div>
          <CardDescription>
            Configure blockchain network and connection settings
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="network" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Network
            </Label>
            <Select
              value={settings.network}
              onValueChange={handleNetworkChange}
            >
              <SelectTrigger id="network">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {networks.map((network) => (
                  <SelectItem key={network.key} value={network.key}>
                    <div className="flex items-center gap-2">
                      {network.name}
                      {network.isTestnet && (
                        <Badge variant="secondary" className="text-xs">
                          Testnet
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Contract Address
            </Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono">
                {contractAddress === "Not deployed" ? (
                  <span className="text-muted-foreground">
                    {contractAddress}
                  </span>
                ) : (
                  contractAddress
                )}
              </code>
              {contractAddress !== "Not deployed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(contractAddress);
                    toast({
                      title: "Copied!",
                      description: "Contract address copied to clipboard",
                    });
                  }}
                >
                  Copy
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Connection Status</Label>
            <div className="flex items-center gap-2 rounded bg-muted px-3 py-2">
              <StatusIcon className={`h-4 w-4 ${rpcStatus.color}`} />
              <span className="text-sm capitalize">{rpcStatus.status}</span>
              {connectionStatus?.network && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {connectionStatus.network.name}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="mock-mode" className="text-base">
                Mock Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Simulate blockchain operations for testing
              </p>
            </div>
            <Switch
              id="mock-mode"
              checked={settings.mockMode}
              onCheckedChange={handleMockModeToggle}
            />
          </div>

          {faucetInfo && (
            <div className="space-y-2">
              <Label>Need Test Tokens?</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(faucetInfo.url, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Get {currentNetwork?.name} Tokens
              </Button>
              <p className="text-xs text-muted-foreground">
                {faucetInfo.description}
              </p>
            </div>
          )}

          {currentNetwork && (
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h4 className="text-sm font-medium">Network Information</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Network:</span>
                  <span className="font-mono">{currentNetwork.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span>
                    {currentNetwork.isTestnet ? "Testnet" : "Mainnet"}
                  </span>
                </div>
                {connectionStatus?.address && (
                  <div className="flex justify-between">
                    <span>Wallet:</span>
                    <span className="font-mono">
                      {connectionStatus.address.slice(0, 6)}...
                      {connectionStatus.address.slice(-4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button
            variant="secondary"
            className="w-full"
            onClick={checkConnectionStatus}
            disabled={isChecking}
          >
            {isChecking ? "Checking..." : "Refresh Status"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
