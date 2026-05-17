export const BLOCKCHAIN_CONFIG = {
  CONTRACT_ADDRESS: {
    localhost: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    hardhat: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    sepolia: "0x065b3EBe17754c8d1B9bf63316538Aa942B11b4A",
    mainnet: "",
  },
};

export const CONTRACT_ABI = [
  "function storeRecord(bytes32 _contentHash, bool _isAuthentic, uint8 _confidence) external",
  "function getRecord(bytes32 _contentHash) external view returns (bytes32 contentHash, bool isAuthentic, uint8 confidence, uint256 timestamp, address verifier, bool exists)",
  "function getUserRecords(address _userAddress) external view returns (bytes32[] memory)",
  "event RecordStored(bytes32 indexed contentHash, address indexed verifier, bool isAuthentic, uint8 confidence, uint256 timestamp)",
];
