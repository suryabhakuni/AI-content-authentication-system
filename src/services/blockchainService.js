import { ethers } from "ethers";

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.currentAccount = null;
    this.currentNetwork = null;
    this.isConnected = false;
    this.mockMode = false;
    this.mockData = {};

    this.NETWORKS = {
      hardhat: {
        chainId: "0x7a69",
        chainName: "Hardhat Local",
        rpcUrl: "http://127.0.0.1:8545",
        blockExplorer: null,
        isTestnet: true,
      },
      sepolia: {
        chainId: "0xaa36a7",
        chainName: "Sepolia Testnet",
        rpcUrl: "https://rpc.sepolia.org",
        blockExplorer: "https://sepolia.etherscan.io",
        isTestnet: true,
      },
      mainnet: {
        chainId: "0x1",
        chainName: "Ethereum Mainnet",
        rpcUrl: "https://eth.llamarpc.com",
        blockExplorer: "https://etherscan.io",
        isTestnet: false,
      },
    };
  }

  async connectWallet() {
    try {
      if (!window.ethereum) {
        throw new Error(
          "MetaMask is not installed. Please install MetaMask to use blockchain features."
        );
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please unlock MetaMask.");
      }

      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.currentAccount = accounts[0];
      this.isConnected = true;

      const network = await this.provider.getNetwork();
      this.currentNetwork = {
        chainId: "0x" + network.chainId.toString(16),
        name: network.name,
      };

      this._setupEventListeners();

      return {
        success: true,
        address: this.currentAccount,
        network: this.currentNetwork,
      };
    } catch (error) {
      console.error("Error connecting wallet:", error);
      throw error;
    }
  }

  disconnectWallet() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.currentAccount = null;
    this.currentNetwork = null;
    this.isConnected = false;

    if (window.ethereum) {
      window.ethereum.removeAllListeners("accountsChanged");
      window.ethereum.removeAllListeners("chainChanged");
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      account: this.currentAccount,
      network: this.currentNetwork,
    };
  }

  _setupEventListeners() {
    if (!window.ethereum) return;

    window.ethereum.on("accountsChanged", async (accounts) => {
      if (accounts.length === 0) {
        this.disconnectWallet();
        window.dispatchEvent(new CustomEvent("walletDisconnected"));
      } else {
        this.currentAccount = accounts[0];

        try {
          this.signer = await this.provider.getSigner();

          if (this.contract) {
            const contractAddress = this.contract.target || this.contract.address;
            const contractInterface = this.contract.interface;
            this.contract = new ethers.Contract(
              contractAddress,
              contractInterface,
              this.signer
            );
          }
        } catch (error) {
          console.error("Error updating signer after account change:", error);
        }

        window.dispatchEvent(
          new CustomEvent("accountChanged", {
            detail: { account: accounts[0] },
          })
        );
      }
    });

    window.ethereum.on("chainChanged", () => {
      window.location.reload();
    });
  }

  getNetworkInfo(chainId) {
    for (const [key, network] of Object.entries(this.NETWORKS)) {
      if (network.chainId === chainId) {
        return { ...network, key };
      }
    }
    return null;
  }

  isTestnet() {
    if (!this.currentNetwork) return false;
    const networkInfo = this.getNetworkInfo(this.currentNetwork.chainId);
    return networkInfo ? networkInfo.isTestnet : false;
  }

  async switchNetwork(networkKey) {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    const network = this.NETWORKS[networkKey];
    if (!network) {
      throw new Error(`Unknown network: ${networkKey}`);
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: network.chainId }],
      });
      return true;
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: network.chainId,
                chainName: network.chainName,
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: network.blockExplorer
                  ? [network.blockExplorer]
                  : null,
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error("Error adding network:", addError);
          throw addError;
        }
      }
      console.error("Error switching network:", error);
      throw error;
    }
  }

  initializeContract(contractABI, contractAddress) {
    if (!this.signer) {
      throw new Error("Wallet not connected. Please connect wallet first.");
    }

    this.contract = new ethers.Contract(contractAddress, contractABI, this.signer);
  }

  async storeVerificationRecord(contentHash, isAuthentic, confidence) {
    if (!this.contract) {
      throw new Error("Contract not initialized. Please initialize contract first.");
    }

    try {
      const hashBytes32 = contentHash.startsWith("0x")
        ? contentHash
        : "0x" + contentHash;

      const tx = await this.contract.storeRecord(
        hashBytes32,
        isAuthentic,
        Math.round(confidence)
      );

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        from: receipt.from,
        contentHash: hashBytes32,
      };
    } catch (error) {
      console.error("Error storing verification record:", error);
      throw error;
    }
  }

  async getVerificationRecord(contentHash) {
    if (!this.contract) {
      throw new Error("Contract not initialized. Please initialize contract first.");
    }

    try {
      const hashBytes32 = contentHash.startsWith("0x")
        ? contentHash
        : "0x" + contentHash;

      const result = await this.contract.getRecord(hashBytes32);

      const exists = result[5] || result.exists;

      if (!exists) {
        return null;
      }

      return {
        contentHash: result[0] || result.contentHash,
        isAuthentic: result[1] !== undefined ? result[1] : result.isAuthentic,
        confidence: Number(result[2] !== undefined ? result[2] : result.confidence),
        timestamp: Number(result[3] !== undefined ? result[3] : result.timestamp),
        verifier: result[4] || result.verifier,
        exists: true,
      };
    } catch (error) {
      console.error("Error getting verification record:", error);
      throw error;
    }
  }

  async getRecordsByAddress(address) {
    if (!this.contract) {
      throw new Error("Contract not initialized. Please initialize contract first.");
    }

    try {
      const records = await this.contract.getUserRecords(address);
      return records.map((hash) => hash.toString());
    } catch (error) {
      console.error("Error getting records by address:", error);
      throw error;
    }
  }

  async estimateGasCost(contentHash, isAuthentic, confidence) {
    if (!this.contract) {
      throw new Error("Contract not initialized. Please initialize contract first.");
    }

    try {
      const hashBytes32 = contentHash.startsWith("0x")
        ? contentHash
        : "0x" + contentHash;

      const gasEstimate = await this.contract.storeRecord.estimateGas(
        hashBytes32,
        isAuthentic,
        Math.round(confidence)
      );

      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      const totalCost = gasEstimate * gasPrice;

      return {
        gasLimit: gasEstimate.toString(),
        gasPrice: ethers.formatUnits(gasPrice, "gwei"),
        totalCostWei: totalCost.toString(),
        totalCostEth: ethers.formatEther(totalCost),
      };
    } catch (error) {
      console.error("Error estimating gas cost:", error);
      throw error;
    }
  }

  async getCurrentNetworkInfo() {
    if (!this.provider) {
      throw new Error("Provider not initialized. Please connect wallet first.");
    }

    try {
      const network = await this.provider.getNetwork();
      const chainIdHex = "0x" + network.chainId.toString(16);
      const networkConfig = this.getNetworkInfo(chainIdHex);

      return {
        chainId: chainIdHex,
        chainIdDecimal: Number(network.chainId),
        name: network.name,
        isTestnet: networkConfig ? networkConfig.isTestnet : false,
        blockExplorer: networkConfig ? networkConfig.blockExplorer : null,
      };
    } catch (error) {
      console.error("Error getting network info:", error);
      throw error;
    }
  }

  enableMockMode(options = {}) {
    this.mockMode = true;
    this.mockData = {
      account: options.account || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      network: options.network || {
        chainId: "0xaa36a7",
        name: "sepolia",
      },
      records: options.records || {},
      ...options,
    };

    this.isConnected = true;
    this.currentAccount = this.mockData.account;
    this.currentNetwork = this.mockData.network;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("accountChanged", {
          detail: { account: this.mockData.account },
        })
      );
    }

    const mockStoreRecord = async () => {
      await this._mockDelay(2000);
      return {
        wait: async () => ({
          hash: "0x" + Math.random().toString(16).substr(2, 64),
          blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
          gasUsed: "21000",
          from: this.mockData.account,
        }),
      };
    };

    mockStoreRecord.estimateGas = async () => {
      await this._mockDelay(500);
      return BigInt(21000);
    };

    this.contract = {
      storeRecord: mockStoreRecord,
      getRecord: async () => {
        await this._mockDelay(1000);
        return {
          exists: false,
          contentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          isAuthentic: false,
          confidence: 0,
          timestamp: 0,
          verifier: "0x0000000000000000000000000000000000000000",
        };
      },
      getUserRecords: async () => {
        await this._mockDelay(1000);
        return [];
      },
    };

    this.provider = {
      getFeeData: async () => ({
        gasPrice: BigInt(20000000000),
      }),
    };
  }

  disableMockMode() {
    this.mockMode = false;
    this.mockData = {};
    this.isConnected = false;
    this.currentAccount = null;
    this.currentNetwork = null;
  }

  _generateMockTransaction() {
    return {
      success: true,
      transactionHash: "0x" + Math.random().toString(16).substr(2, 64),
      blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
      gasUsed: "21000",
      from: this.mockData.account,
    };
  }

  _mockDelay(ms = 1000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getMockData() {
    return {
      ...this.mockData,
      isMockMode: this.mockMode,
    };
  }
}

const blockchainService = new BlockchainService();
export default blockchainService;
