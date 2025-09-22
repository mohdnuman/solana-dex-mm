# Solana DEX Market Maker

A sophisticated market making and trading automation platform for Solana DEXs, featuring automated trading strategies, volume generation, and wallet management capabilities.

## 🚀 Features

### Trading Automation
- **Volume Generation**: Programmatic trading to enhance token liquidity metrics
- **Token Mixing**: Advanced transaction mixing for privacy and distribution
- **Sweep Operations**: Automated token consolidation across wallets
- **Holder Simulation**: Automated wallet creation and token distribution

### Platform Integration
- **Raydium CLMM**: Full integration with Raydium's Concentrated Liquidity Market Maker

### Web Interface
- **Real-time Dashboard**: Monitor trading performance and wallet balances
- **Task Management**: Configure and control automated trading strategies
- **Wallet Analytics**: Track performance across multiple wallets

## 🏗️ Architecture

```
├── backend/           # Node.js/TypeScript trading engine
│   ├── src/
│   │   ├── api/       # REST API endpoints
│   │   ├── dex/       # DEX integrations (Raydium)
│   │   ├── task/      # Trading strategy implementations
│   │   ├── lib/       # Core libraries (Solana, Jito, MongoDB)
│   │   └── wallet/    # Wallet management
└── frontend/          # React dashboard
    ├── src/
    │   ├── components/
    │   ├── pages/
    └── services/
```

## 📋 Prerequisites

- Node.js 18+
- MongoDB instance
- Solana RPC endpoint

## ⚙️ Setup

### Backend Configuration

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Environment setup**:
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables**:
   ```env
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   JITO_API_UUID=your_jito_uuid
   JWT_SECRET=your_jwt_secret
   MONGO_URL=mongodb://localhost:27017/solana-mm
   NATS_URL=nats://localhost:4222
   NATS_USER=your_nats_user
   NATS_PASSWORD=your_nats_password
   NATS_SUBJECT=trading
   ```

4. **Build and run**:
   ```bash
   npm run build
   npm start
   ```

### Frontend Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Development server**:
   ```bash
   npm run dev
   ```

3. **Production build**:
   ```bash
   npm run build
   ```

## 🔧 Trading Strategies

### Volume Generation (`volume.task.ts`)
- Programmatic buy/sell operations
- Natural trading pattern simulation
- Configurable volume targets

### SOL Mixing (`mixer.task.ts`)
- Privacy-preserving sol transfers

### Sweep Operations (`sweep.task.ts`)
- Automated SOL consolidation

### Holder Simulation (`holder.task.ts`)
- Holder count enhancement
- Realistic holding patterns

### Makers Simulation (`maker.task.ts`)
- Maker count enhancement


## 🔐 Security Features

- **Encrypted Wallet Storage**: Private keys encrypted using industry-standard encryption
- **JWT Authentication**: Secure API access control
- **Environment Isolation**: Sensitive configuration separated from codebase
- **Transaction Validation**: Multi-layer validation before execution

## 📊 Monitoring & Analytics

- **Wallet Balance Monitoring**: Automated balance updates and alerts
- **Task Orchestration**: Centralized management of all trading strategies
- **Error Handling & Logging**: Comprehensive error tracking and recovery