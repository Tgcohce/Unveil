# Unveil

**Privacy Protocol Benchmarking Platform for Solana**

Unveil is an open-source research tool that quantifies the privacy guarantees of mixing protocols and privacy-preserving systems on Solana. Through on-chain analysis, timing correlation attacks, and transaction graph analysis, Unveil measures the actual anonymity provided by these protocols versus their theoretical claims.

---

## Table of Contents

- [Overview](#overview)
- [Key Findings](#key-findings)
- [Methodology](#methodology)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Protocol Analysis](#protocol-analysis)
  - [Privacy Cash](#privacy-cash)
  - [ShadowWire](#shadowwire)
  - [SilentSwap](#silentswap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Privacy protocols on Solana promise anonymity through various mechanisms including zero-knowledge proofs, confidential transfers, and cross-chain routing. However, the effectiveness of these mechanisms varies significantly in practice.

Unveil provides:

- **Quantitative Privacy Scores**: Numerical assessment (0-100) of actual privacy provided
- **Deanonymization Attack Simulation**: Implementation of timing correlation, amount matching, and graph analysis attacks
- **Transaction Linkability Analysis**: Measurement of how many transactions can be linked to their origins
- **Comparative Benchmarking**: Side-by-side comparison of multiple privacy protocols

---

## Key Findings

| Protocol | Privacy Score | Linkability Rate | Confirmed Deanonymizations | Primary Vulnerability |
|----------|---------------|------------------|---------------------------|----------------------|
| Privacy Cash | 5/100 | 95.3% | 221 of 232 withdrawals | Timing + amount correlation |
| ShadowWire | 47/100 | 46.3% | 37 of 80 transfers | Visible addresses on-chain |
| SilentSwap | 67/100 | 9.6% | 10 of 104 inputs | Round-trip wallet exposure |

### Summary

- **Privacy Cash**: Despite using Groth16 ZK proofs for address privacy, visible amounts and low anonymity sets (average 2.13) enable timing correlation attacks with 95% success rate.

- **ShadowWire**: Bulletproofs successfully hide transfer amounts, but sender and recipient addresses remain plaintext visible on-chain, enabling direct transaction graph analysis.

- **SilentSwap**: Cross-chain routing through Secret Network provides the strongest privacy, though users who both send and receive through the protocol expose themselves via wallet graph analysis.

---

## Methodology

### Attack Vectors Implemented

1. **Timing Correlation Attack**
   - Match deposits to withdrawals based on temporal proximity
   - Effective when anonymity sets are small
   - Combined with amount matching for higher confidence

2. **Amount Correlation Attack**
   - Link transactions with unique or similar amounts
   - Account for protocol fees (typically 0-5%)
   - Identify unique amount fingerprints

3. **Address Reuse Detection**
   - Identify addresses used for both deposits and withdrawals
   - Direct deanonymization with 100% confidence

4. **Round-Trip Wallet Analysis**
   - Detect wallets appearing as both input source and output destination
   - Reveals entity relationships across privacy boundaries

5. **Transaction Graph Analysis**
   - Build directed graphs from visible address links
   - Cluster related addresses
   - Trace fund flows through the protocol

### Privacy Score Calculation

The privacy score (0-100) is computed based on:

```
Score = 100 - (Linkability Penalty) - (Timing Entropy Penalty) - (Anonymity Set Penalty)

Where:
- Linkability Penalty = (Linked Transactions / Total Transactions) * 40
- Timing Entropy Penalty = (1 - Entropy) * 20
- Anonymity Set Penalty = f(Average Anonymity Set)
```

---

## Architecture

```
unveil/
├── src/
│   ├── api/              # REST API server
│   │   └── server.ts     # Express endpoints
│   ├── analysis/         # Attack implementations
│   │   ├── timing-attack.ts
│   │   ├── shadowwire-attack.ts
│   │   └── silentswap-attack.ts
│   ├── indexer/          # Blockchain data indexing
│   │   ├── index.ts      # Privacy Cash indexer
│   │   ├── shadowwire.ts # ShadowWire indexer
│   │   ├── silentswap.ts # SilentSwap indexer
│   │   └── db.ts         # SQLite database layer
│   └── dashboard/        # React frontend
│       ├── src/
│       │   ├── pages/    # Protocol-specific views
│       │   └── components/
│       └── public/data/  # Static analysis results
├── package.json
└── tsconfig.json
```

### Technology Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite (better-sqlite3)
- **Blockchain**: Solana Web3.js, Helius RPC
- **Frontend**: React, Vite, TailwindCSS, TanStack Query
- **Analysis**: Custom correlation algorithms

---

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Helius API key (for blockchain data)

### Setup

```bash
# Clone the repository
git clone https://github.com/Tgcohce/Unveil.git
cd unveil

# Install dependencies
npm install
cd src/dashboard && npm install && cd ../..

# Configure environment
cp .env.example .env
# Edit .env with your Helius API key
```

### Environment Variables

```env
HELIUS_API_KEY=your_helius_api_key
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
DATABASE_PATH=./data/unveil.db
PORT=3000
```

---

## Usage

### Development

```bash
# Start both API and dashboard
npm run dev

# Or start individually
npm run api        # Backend on port 3000
npm run dashboard  # Frontend on port 5173
```

### Indexing Blockchain Data

```bash
# Index all protocols
npm run index:all

# Or index individually
npm run index:privacy-cash
npm run index:shadowwire
npm run index:silentswap
```

### Running Analysis

```bash
npm run analyze
```

---

## API Reference

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metrics` | GET | Privacy Cash protocol metrics |
| `/api/compare` | GET | Comparative analysis of all protocols |
| `/api/shadowwire/analysis` | GET | ShadowWire vulnerability analysis |
| `/api/silentswap/analysis` | GET | SilentSwap vulnerability analysis |
| `/api/transactions` | GET | Recent indexed transactions |

### Example Response

```json
GET /api/compare

{
  "privacyCash": {
    "protocol": "Privacy Cash",
    "privacyScore": 5,
    "totalWithdrawals": 232,
    "attackSuccessRate": 95.3,
    "hidesAmounts": false,
    "hidesAddresses": true
  },
  "shadowWire": {
    "protocol": "ShadowWire",
    "privacyScore": 47,
    "totalTransfers": 80,
    "linkabilityRate": 46.25,
    "hidesAmounts": true,
    "hidesAddresses": false
  },
  "silentSwap": {
    "protocol": "SilentSwap",
    "privacyScore": 67,
    "totalInputs": 104,
    "matchedPairs": 10,
    "linkabilityRate": 9.6
  }
}
```

---

## Protocol Analysis

### Privacy Cash

**Mechanism**: ZK mixing pool using Groth16 proofs

**Claimed Privacy**: Complete unlinkability between deposits and withdrawals

**Actual Privacy**: 5/100

**Vulnerabilities Identified**:
- Amounts are visible on-chain, enabling correlation attacks
- Average anonymity set of 2.13 provides minimal cover
- 76 transactions linked via timing + amount correlation
- 19 addresses reused for both deposit and withdrawal

**Attack Implementation**: `src/analysis/timing-attack.ts`

---

### ShadowWire

**Mechanism**: Bulletproofs for confidential amounts

**Claimed Privacy**: Hidden transfer amounts

**Actual Privacy**: 47/100

**Vulnerabilities Identified**:
- Sender and recipient addresses visible in 46.3% of transfers
- Transaction graph fully analyzable despite hidden amounts
- Bulletproofs provide amount privacy but zero address privacy

**Attack Implementation**: `src/analysis/shadowwire-attack.ts`

---

### SilentSwap

**Mechanism**: Cross-chain routing through Secret Network TEE

**Claimed Privacy**: Unlinkable swaps via cross-chain obfuscation

**Actual Privacy**: 67/100

**Vulnerabilities Identified**:
- 10 wallets exposed via round-trip usage pattern
- Users who both send and receive are linkable
- Timing correlation ineffective due to cross-chain delay variance

**Attack Implementation**: `src/analysis/silentswap-attack.ts`

---

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-attack-vector`)
3. Commit changes with clear messages
4. Submit a pull request with detailed description

### Areas for Contribution

- Additional attack vector implementations
- Support for new privacy protocols
- Improved statistical analysis methods
- Documentation and research papers

---

## License

MIT License

Copyright (c) 2024-2025

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## Acknowledgments

This research was conducted as part of privacy protocol analysis on Solana. The findings are intended to improve the security and privacy guarantees of blockchain systems.

**Disclaimer**: This tool is for research and educational purposes. The deanonymization techniques demonstrated should only be used for security auditing with proper authorization.
