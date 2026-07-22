# Scrape402: AI Agent Instructions & Guidelines

This file serves as the strict operating manual for any AI agent or developer working on the **Scrape402** codebase. Do not deviate from these rules without explicit user permission.

## 1. Project Goal
Build a "Standard Entry" for the Algorand Global x402 Challenge: a pay-per-request API that uses headless browsers (Playwright) to scrape webpages and convert them to Markdown, gated by the x402 payment protocol.

## 2. Core Tech Stack (No Exceptions)
- **Language**: TypeScript (Node.js 20+)
- **Backend Framework**: Hono (run via `@hono/node-server`)
- **Scraping**: `playwright` (Node API) and `turndown` (HTML to Markdown conversion)
- **Blockchain**: `@x402/hono`, `@x402/core`, `@x402/avm` (official GoPlausible facilitator integration) and `algosdk`

## 3. The Golden Rules of the x402 Challenge
When writing code for this project, you must enforce the following hackathon constraints:
1. **USDC Only**: The payment asset is strictly USDC. Do NOT hardcode ALGO as the payment currency. 
   - **Testnet USDC ASA ID**: `10458941`
   - **Mainnet USDC ASA ID**: `31566704`
2. **Network Configurations**:
   - Testnet: `ALGORAND_Testnet_CAIP2`
   - Mainnet: `ALGORAND_Mainnet_CAIP2`
3. **Facilitator Integration**: Use the official `@x402/hono` package to interact with the GoPlausible facilitator. Do not write custom transaction verification from scratch if the SDK handles it.
4. **Bazaar Discovery**: The `x402-global-challenge` tag MUST be present in the `extra` field of the route configuration to ensure the project appears on the leaderboard.
5. **Public HTTPS Deployment**: The final server MUST be deployed to a public domain with HTTPS enabled. Localhost is only acceptable for Phase 1-4 testing.

## 4. Development Workflow
- Always refer back to `spec.md` for API contract details.
- Always check off tasks in `task.md` as they are completed.
- Write modular, asynchronous TypeScript code.
- All environment variables (Wallet Mnemonics, API keys if any) must be loaded via `dotenv`. Never hardcode secrets.
