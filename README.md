# Scrape402: The Unblockable Web API for AI Agents

## Project Description

**Scrape402** is a pay-per-request infrastructure API that solves one of the biggest bottlenecks in the AI industry: giving autonomous agents reliable access to the internet. 

When AI agents (like AutoGPT, custom LLM tools, or trading bots) attempt to browse the web to gather data or read articles, they are immediately blocked by Cloudflare, reCAPTCHAs, and paywalls. Setting up proxy networks and headless browser infrastructure to bypass these blocks is a massive, expensive headache for AI developers. 

**Scrape402** solves this by providing a clean, single-endpoint API. An AI agent simply sends a target URL to the API, and the server returns the clean, markdown-formatted text of that webpage—handling all proxying and CAPTCHA bypassing in the background.

Instead of requiring developers to sign up for expensive $50/month API subscriptions with a credit card, **Scrape402 uses the x402 payment protocol on the Algorand blockchain.** 

When an agent hits the API, it receives an HTTP `402 Payment Required` challenge. The agent instantly signs and broadcasts a micro-transaction (e.g., 0.1 ALGO / ~$0.01) on Algorand. Once the payment settles in seconds, the API fulfills the request. 

By leveraging Algorand's fraction-of-a-cent fees and lightning-fast finality, Scrape402 makes programmatic micro-transactions economically viable, unlocking true "agentic commerce" where AIs can seamlessly pay their own way across the web.
 
