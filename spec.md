# Scrape402: Specification & Acceptance Criteria

## Project Overview
**Scrape402** is a pay-per-request API endpoint designed for autonomous AI agents. It allows an agent to bypass common web blocks (Cloudflare, reCAPTCHA, paywalls) and extract clean, markdown-formatted text from any given URL. The API is gated by the **x402 protocol** and requires a micro-payment (e.g., 0.1 USDC) on the Algorand blockchain per request.

## Architecture & Tech Stack
- **Backend Framework**: TypeScript and Hono
- **Scraping Engine**: Playwright (headless browser) with Turndown (HTML to Markdown conversion)
- **Blockchain Integration**: `@x402/hono` leveraging the **GoPlausible facilitator** for transaction verification, alongside `algosdk`.
- **Demo Client**: A TypeScript/Node script simulating an AI agent, capable of signing Algorand transactions programmatically.

## API Specification
### Endpoint: `GET /scrape`
**Query Parameters:**
- `url` (string, required): The target webpage to scrape.

**Flow 1: Request without Payment**
- **Condition**: Header `Authorization: L402 <txid>` is missing or invalid.
- **Response**: `402 Payment Required`
- **Headers**:
  - `x-payment-required: amount=0.1, currency=USDC, address=<SERVER_ALGO_WALLET_ADDRESS>`
- **Body**: JSON response detailing the required payment.

**Flow 2: Request with Valid Payment**
- **Condition**: Header `Authorization: L402 <txid>` contains a valid Algorand transaction ID. The backend, via GoPlausible, verifies the transaction:
  - Is sent to the server's wallet address.
  - Has an amount >= 0.1 USDC (ASA 10458941 on Testnet).
  - Has not been used for a previous request (prevent replay attacks).
- **Response**: `200 OK`
- **Body**: 
  ```json
  {
    "markdown": "# Article Title\n\nArticle content...",
    "url": "https://example.com"
  }
  ```

## Acceptance Criteria

### 1. The x402 Payment Flow
- [ ] When a client requests `/scrape?url=...` without a transaction ID, the server returns an HTTP 402 status code.
- [ ] The 402 response includes the exact USDC amount and the destination wallet address in the headers.
- [ ] When a client provides a valid Algorand transaction ID, the server successfully verifies the transaction via the GoPlausible facilitator (confirming recipient, USDC amount, and uniqueness).
- [ ] The server has the Bazaar discovery extension enabled and the `x402-global-challenge` tag in its configuration.
- [ ] The server rejects invalid, reused, or underpaid transaction IDs with an appropriate error (e.g., 401 Unauthorized or 400 Bad Request).

### 2. The Scraping Engine
- [ ] The server can successfully load a given URL using a headless browser (Playwright).
- [ ] The server extracts the main body content of the webpage, stripping away unnecessary navigation and scripts.
- [ ] The extracted HTML is converted into clean, readable Markdown format.
- [ ] The server handles basic errors (e.g., invalid URL, timeout) gracefully and returns a 500 or 400 status.

### 3. The AI Agent Demo (Client)
- [ ] The `client/index.ts` script can automatically detect the 402 response.
- [ ] The script programmatically creates, signs, and broadcasts an Algorand transaction to the Testnet to pay the requested fee.
- [ ] The script waits for blockchain confirmation, retrieves the `txid`, and retries the API request automatically using the `Authorization: L402 <txid>` header.
- [ ] The script prints the final returned Markdown content to the terminal.
