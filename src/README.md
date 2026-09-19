# 🔐 ECLIPSE.AI Smart Contracts (Foundry)

The smart contracts layer manages decentralized model registration, tamper-proof execution verification, and native payment distribution on the **Monad Testnet** (Chain ID: `10143`).

Built with **Solidity 0.8.20** and compiled/deployed using **Foundry**.

---

## 📑 Table of Contents

- [Live Testnet Deployments](#-live-testnet-deployments)
- [Contract Specifications](#-contract-specifications)
- [On-Chain Revenue Split Flow](#-on-chain-revenue-split-flow)
- [Contract Interfaces](#-contract-interfaces)
  - [1. `PaymentManager.sol`](#1-paymentmanagersol)
  - [2. `ModelRegistry.sol`](#2-modelregistrysol)
  - [3. `PromptExecution.sol`](#3-promptexecutionsol)
- [Monad Testnet Configuration](#-monad-testnet-configuration)
- [Compilation & Testing](#-compilation--testing)
- [Deployment Guide](#-deployment-guide)

---

## 🌐 Live Testnet Deployments

The smart contracts are actively deployed on **Monad Testnet (`10143`)**:

| Contract | Address | Explorer Link |
|:---|:---|:---|
| **`ModelRegistry`** | `0x2f02861ff42c0d04823dadd08326de0b07f57dfe` | [View on Monad Explorer](https://testnet.monadexplorer.com/address/0x2f02861ff42c0d04823dadd08326de0b07f57dfe) |
| **`PaymentManager`** | `0xaa2499494b61d293a437c6bd31ca22b88d8aa9b2` | [View on Monad Explorer](https://testnet.monadexplorer.com/address/0xaa2499494b61d293a437c6bd31ca22b88d8aa9b2) |
| **`PromptExecution`**| `0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1` | [View on Monad Explorer](https://testnet.monadexplorer.com/address/0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1) |
| **Default Model Owner** | `0x75199c1aa8F21Eb583027BbB6763B7c79CC180D6` | [View on Monad Explorer](https://testnet.monadexplorer.com/address/0x75199c1aa8F21Eb583027BbB6763B7c79CC180D6) |

---

## 📜 Contract Specifications

| Contract | Purpose | State Variables / Key Features |
|:---|:---|:---|
| **`PaymentManager.sol`** | Native `MON` revenue router | Splits 85% to model owner, 10% to compute nodes, and 5% to platform treasury via native `msg.value`. Provides 1-click cashout in native MON. |
| **`ModelRegistry.sol`** | Decentralized model catalog | Maps `modelId` to IPFS CIDs, owner addresses, and single-digit MON pricing metadata. |
| **`PromptExecution.sol`** | Verifiable execution ledger | Emits on-chain proofs linking encrypted prompt IPFS CIDs to model inference output CIDs and token metrics. |

---

## 💰 On-Chain Revenue Split Flow

```mermaid
graph TD
    User["Consumer Wallet (MetaMask)"]
    Contract["PaymentManager.sol\n(payable subscribe / payPerUse)"]

    Owner["Model Creator Address\n(85% Native MON)"]
    ComputeNodes["Compute Node Rewards Pool\n(10% Native MON)"]
    Treasury["Platform Treasury\n(5% Native MON)"]

    User -->|Sends native MON via msg.value| Contract
    Contract -->|Allocated to ownerEarnings mapping| Owner
    Contract -->|Allocated to nodeRewards mapping| ComputeNodes
    Contract -->|Retained for treasury maintenance| Treasury
```

### Key Highlights:
1. **Zero ERC-20 Approvals Needed**: Because payments are in native `MON`, users only sign a single transaction to subscribe or execute models.
2. **Pure Native MON Cashouts**: Model creators withdraw 100% of their accumulated revenue in native `MON` directly to their wallet via `cashoutOwnerEarnings()`.

---

## 💻 Contract Interfaces

### 1. `PaymentManager.sol`

Handles subscriptions, pay-per-use payments, and creator cashouts in native `MON`:

```solidity
// Direct subscription with 85/10/5 native MON split
function subscribe(
    string calldata _modelId,
    address _modelOwner,
    uint256 _quota,
    uint256 _duration
) external payable;

// Per-use payment for on-demand inference
function payPerUse(
    string calldata _modelId,
    address _modelOwner,
    address _computeNode
) external payable;

// Model creators withdraw accumulated MON earnings
function cashoutOwnerEarnings() external;

// Compute nodes claim accumulated rewards
function claimNodeRewards() external;
```

---

### 2. `ModelRegistry.sol`

Maintains immutable registry of model metadata and IPFS encrypted weight hashes:

```solidity
function registerModel(
    bytes32 _modelId,
    string calldata _ipfsCID,
    uint256 _pricePerUse,
    uint256 _subscriptionPrice
) external;

function getModel(bytes32 _modelId) external view returns (Model memory);
```

---

### 3. `PromptExecution.sol`

Records prompt hashes and verifies AI execution on-chain:

```solidity
function createPrompt(
    bytes32 _promptId,
    bytes32 _modelId,
    string calldata _encryptedPromptCID
) external;

function submitResponse(
    bytes32 _promptId,
    string calldata _responseCID,
    bytes32 _responseHash
) external;
```

---

## 🌐 Monad Testnet Configuration

Foundry is configured in `foundry.toml` with Monad's high-speed RPC:

| Parameter | Value |
|:---|:---|
| **Network** | Monad Testnet |
| **Chain ID** | `10143` (`0x279f`) |
| **RPC URL** | `https://testnet-rpc.monad.xyz/` |
| **Block Explorer** | `https://testnet.monadexplorer.com` |
| **Official Faucet** | `https://testnet.monad.xyz/` |
| **Solidity Version**| `0.8.20` |

---

## 🔨 Compilation & Testing

Compile smart contracts using Foundry:
```bash
# From repository root
forge build
```

Clean build cache if needed:
```bash
forge clean && forge build
```

---

## 🚀 Deployment Guide

### 1. Fund Your Deployer Wallet
Ensure your deployer address has testnet `MON` using the [Monad Testnet Faucet](https://testnet.monad.xyz/).

### 2. Run the Deployment Script
```bash
forge script script/Deploy.s.sol \
  --rpc-url https://testnet-rpc.monad.xyz/ \
  --broadcast \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### 3. Copy Deployed Addresses
The script prints the deployed addresses:
```plaintext
=== Deployment on Monad Complete ===
Model Registry:   0x2f02861ff42c0d04823dadd08326de0b07f57dfe
Payment Manager:  0xaa2499494b61d293a437c6bd31ca22b88d8aa9b2
Prompt Execution: 0x70dcf4d82c8e1b989d2a7a3c2303fa48a348d6c1
Deployer:         0x...
```
Update these values in [.env](file:///Users/arpitdoshi/monadhacks/.env) under:
- `MODEL_REGISTRY_ADDRESS`
- `PAYMENT_MANAGER_ADDRESS`
- `PROMPT_EXECUTION_ADDRESS`
