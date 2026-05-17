export const TESTNETS = {
  sepolia: {
    name: "Sepolia",
    chainId: "0xaa36a7",
    faucets: [
      {
        name: "Sepolia Faucet",
        url: "https://sepoliafaucet.com/",
        description: "Get free Sepolia ETH for testing",
      },
      {
        name: "Alchemy Sepolia Faucet",
        url: "https://sepoliafaucet.com/",
        description: "Alternative Sepolia faucet",
      },
    ],
  },
  hardhat: {
    name: "Hardhat Local",
    chainId: "0x7a69",
    faucets: [],
  },
};

export const getRecommendedFaucet = (networkKey) => {
  const network = TESTNETS[networkKey];
  if (!network || !network.faucets || network.faucets.length === 0) {
    return null;
  }
  return network.faucets[0];
};

export const getAllFaucets = (networkKey) => {
  const network = TESTNETS[networkKey];
  return network?.faucets || [];
};

export const isTestnet = (networkKey) => {
  return networkKey !== "mainnet";
};
