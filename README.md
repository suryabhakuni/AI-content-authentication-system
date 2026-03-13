# AI Authentic Guard

AI-powered content authentication system with blockchain verification.

## Features

- AI Detection for text and images
- Blockchain verification on Ethereum (Sepolia testnet)
- Immutable certificate generation
- Content verification and validation
- Modern, responsive UI with dark mode

## Tech Stack

**Frontend:**

- React + Vite
- TailwindCSS + shadcn/ui
- Framer Motion
- ethers.js

**Backend:**

- FastAPI (Python)
- Transformers (Hugging Face)
- AI detection models

**Blockchain:**

- Solidity smart contracts
- Hardhat development environment
- Sepolia testnet deployment

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- MetaMask wallet

### Installation

1. **Install frontend dependencies:**

```bash
npm install
```

2. **Install backend dependencies:**

```bash
cd backend
pip install -r requirements.txt
```

3. **Install blockchain dependencies:**

```bash
cd blockchain
npm install
```

### Configuration

1. **Frontend:** Create `.env` file:

```env
VITE_API_URL=http://localhost:8000
```

2. **Backend:** Create `backend/.env` file:

```env
# Add your API keys if needed
```

3. **Blockchain:** Create `blockchain/.env` file:

```env
SEPOLIA_RPC_URL=your_alchemy_or_infura_url
PRIVATE_KEY=your_wallet_private_key
```

### Running the Application

1. **Start backend:**

```bash
cd backend
python main.py
```

2. **Start frontend:**

```bash
npm run dev
```

3. **Deploy smart contract (if needed):**

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network sepolia
```

## Usage

1. Connect your MetaMask wallet
2. Upload text or image content
3. Run AI detection analysis
4. Optionally store verification on blockchain
5. Download authentication certificate
6. Verify certificates using content hash

## Smart Contract

Deployed on Sepolia testnet. Contract handles:

- Storing verification records
- Retrieving verification data
- Immutable blockchain storage

## Licence

MIT License. See [LICENSE](./LICENSE) for details.
