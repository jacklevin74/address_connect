# Matrix Wallet Message Signing

## Project Overview

This project provides a web application where users can connect their Ethereum wallet (MetaMask), sign a message, and associate their Ethereum address with a Solana-compatible (SVM) public key. The purpose is to allow users to verify their ownership of an Ethereum address by signing a message and link it to their Solana-compatible address.

### Key Features:
- **Ethereum Wallet Connection**: Users connect via MetaMask.
- **Message Signing**: Users sign a message to verify ownership of their Ethereum address.
- **SVM Address Association**: Users can input their Solana-compatible public key and associate it with their Ethereum address.
- **Backend Verification**: A NodeJs express backend verifies the signed message and logs the association of Ethereum and Solana addresses.

## Prerequisites

- **Node.js**: Ensure NodeJs is installed on your machine. You can download it from [here](https://nodejs.org).
- **MetaMask**: MetaMask should be installed in your browser for wallet connection.

## Getting Started

### 1. Clone the Repository

First, clone this repository to your local machine.

```bash
git clone https://github.com/jacklevin74/matrix-wallet-message-signing.git
cd matrix-wallet-message-signing
npm i ethers cors http-server
nohup node server.js &
http-server .

