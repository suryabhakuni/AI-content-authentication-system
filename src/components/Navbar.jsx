import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, Wallet, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import blockchainService from "@/services/blockchainService";
import { BlockchainSettings } from "@/components/BlockchainSettings";
import { BLOCKCHAIN_CONFIG, CONTRACT_ABI } from "@/config/blockchain";
import logo from "@/assets/img.png";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const { toast } = useToast();

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Upload", path: "/upload" },
    { name: "Verify", path: "/verify" },
    { name: "About", path: "/about" },
  ];

  useEffect(() => {
    const status = blockchainService.getConnectionStatus();
    if (status.isConnected) {
      setAccount(status.account);
      setNetwork(status.network);

      const networkKey =
        blockchainService.getNetworkInfo(status.network?.chainId)?.key ||
        "sepolia";
      const contractAddress = BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS[networkKey];

      if (contractAddress && contractAddress !== "") {
        blockchainService.initializeContract(CONTRACT_ABI, contractAddress);
      }
    }

    const handleAccountChanged = (event) => {
      setAccount(event.detail.account);
      toast({
        title: "Account Changed",
        description: `Switched to ${event.detail.account.slice(
          0,
          6
        )}...${event.detail.account.slice(-4)}`,
      });
    };

    const handleWalletDisconnected = () => {
      setAccount(null);
      setNetwork(null);
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected.",
      });
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

  const connectWallet = async () => {
    if (account) {
      // If already connected, disconnect
      blockchainService.disconnectWallet();
      setAccount(null);
      setNetwork(null);
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected.",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const result = await blockchainService.connectWallet();
      setAccount(result.address);
      setNetwork(result.network);

      const networkKey =
        blockchainService.getNetworkInfo(result.network.chainId)?.key ||
        "sepolia";
      const contractAddress = BLOCKCHAIN_CONFIG.CONTRACT_ADDRESS[networkKey];

      if (contractAddress && contractAddress !== "") {
        blockchainService.initializeContract(CONTRACT_ABI, contractAddress);
      }

      window.dispatchEvent(
        new CustomEvent("accountChanged", {
          detail: { account: result.address },
        })
      );

      toast({
        title: "Wallet Connected",
        description: `Connected to ${result.address.slice(
          0,
          6
        )}...${result.address.slice(-4)}`,
      });
    } catch (error) {
      if (error.message.includes("MetaMask is not installed")) {
        toast({
          title: "MetaMask Not Found",
          description: "Please install MetaMask to connect your wallet.",
          variant: "destructive",
        });
      } else if (error.code === 4001) {
        toast({
          title: "Connection Rejected",
          description: "You rejected the connection request.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection Failed",
          description:
            error.message || "Failed to connect wallet. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const getNetworkBadge = () => {
    if (!network) return null;

    const networkInfo = blockchainService.getNetworkInfo(network.chainId);
    if (!networkInfo) return null;

    return (
      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
        {networkInfo.key === "hardhat"
          ? "Local"
          : networkInfo.key === "sepolia"
          ? "Sepolia"
          : "Mainnet"}
      </span>
    );
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <Link
            to="/"
            className="flex items-center gap-3 text-lg font-semibold text-foreground hover:text-primary transition-fast"
          >
            <img src={logo} alt="Logo" className="h-8 w-8 object-contain" />
            <span className="hidden sm:inline">AI Content Authenticator</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`text-sm font-medium transition-fast relative ${
                  isActive(item.path)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.name}
                {isActive(item.path) && (
                  <motion.div
                    layoutId="navbar-indicator"
                    className="absolute -bottom-[1.15rem] left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-3">
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 transition-fast hover:scale-105"
                >
                  <Settings size={18} />
                </Button>
              </DialogTrigger>
              <DialogContent className="p-0 max-w-md">
                <BlockchainSettings onClose={() => setSettingsOpen(false)} />
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={connectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2 h-9 px-4 transition-fast hover:scale-105"
            >
              <Wallet size={16} />
              <span className="text-sm">
                {isConnecting
                  ? "Connecting..."
                  : account
                  ? `${account.slice(0, 6)}...${account.slice(-4)}`
                  : "Connect"}
              </span>
              {account && getNetworkBadge()}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0 transition-fast hover:scale-105"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden h-9 w-9 p-0"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md md:hidden z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-sm border-l-2 border-gray-300 dark:border-gray-700 md:hidden z-50 shadow-2xl overflow-y-auto"
              style={{
                backgroundColor: "#ffffff",
              }}
            >
              <div className="absolute top-4 right-4 z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9 p-0 text-gray-900 hover:bg-gray-100"
                >
                  <X size={20} />
                </Button>
              </div>

              <div className="flex flex-col h-full pt-20 px-6 bg-white dark:bg-[#272935]">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`py-4 text-lg font-medium transition-fast flex items-center min-h-[44px] ${
                        isActive(item.path)
                          ? "text-[#4f46e5]"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}

                <div className="mt-8 space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSettingsOpen(true);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 h-11"
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-center gap-2 h-11"
                  >
                    <Wallet size={16} />
                    <span>
                      {isConnecting
                        ? "Connecting..."
                        : account
                        ? `${account.slice(0, 6)}...${account.slice(-4)}`
                        : "Connect Wallet"}
                    </span>
                    {account && getNetworkBadge()}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-center gap-2 h-11"
                  >
                    {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                    <span>
                      {theme === "light" ? "Dark Mode" : "Light Mode"}
                    </span>
                  </Button>
                </div>

                <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                  <DialogContent className="p-0 max-w-md">
                    <BlockchainSettings
                      onClose={() => setSettingsOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};
