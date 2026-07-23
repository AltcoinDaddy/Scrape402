import { config } from "dotenv";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { swaggerUI } from "@hono/swagger-ui";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { declareDiscoveryExtension, bazaarResourceServerExtension } from "@x402-avm/extensions";
import type { ResourceServerExtension } from "@x402/core/types";
import { ALGORAND_MAINNET_CAIP2 } from "@x402/avm";
import { chromium } from "playwright";
import TurndownService from "turndown";
import algosdk from "algosdk";

config();

const avmAddress = process.env.AVM_ADDRESS;
if (!avmAddress) {
    console.error("Missing AVM_ADDRESS environment variable");
    process.exit(1);
}

const avmMnemonic = process.env.AVM_MNEMONIC;
let serverAccount: algosdk.Account | null = null;

if (!avmMnemonic) {
    console.warn("⚠️ Missing AVM_MNEMONIC environment variable. Faucet endpoints will be disabled.");
} else {
    serverAccount = algosdk.mnemonicToSecretKey(avmMnemonic);
}
const algoClient = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", "");

// We will use the main GoPlausible Testnet facilitator
const facilitatorUrl = process.env.FACILITATOR_URL || "https://testnet.goplausible.com";

const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });
const server = new x402ResourceServer(facilitatorClient)
    .register(ALGORAND_MAINNET_CAIP2, new ExactAvmScheme());

// Register Bazaar discovery extension
server.registerExtension(bazaarResourceServerExtension as unknown as ResourceServerExtension);

const scrapeDiscovery = declareDiscoveryExtension({
    output: {
        example: {
            markdown: "# Extracted Title\n\nClean text content...",
            url: "https://example.com/article",
            timestamp: new Date().toISOString()
        },
    },
});

const app = new Hono();

// Serve static files (like the logo) from the 'public' directory
app.use('/public/*', serveStatic({ root: './' }));

// Root route for browsers and judges
app.get('/', (c) => {
    return c.html(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Scrape402 API</title>
            <meta property="og:title" content="Scrape402" />
            <meta property="og:description" content="Scrape402 is a pay-per-request infrastructure API that solves one of the biggest bottlenecks in the AI industry: giving autonomous agents reliable access to the internet." />
            <meta property="og:image" content="https://api.scrape402.site/public/logo.png" />
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Fira+Code:wght@400;600&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    background-color: #0f172a;
                    background-image: 
                        radial-gradient(at 0% 0%, hsla(160, 100%, 30%, 0.15) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, hsla(200, 100%, 30%, 0.15) 0px, transparent 50%);
                    color: #f8fafc;
                }
                .glass-card {
                    background: rgba(30, 41, 59, 0.7);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .code-font {
                    font-family: 'Fira Code', monospace;
                }
                .gradient-text {
                    background: linear-gradient(to right, #2dd4bf, #3b82f6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
            </style>
        </head>
        <body class="min-h-screen flex items-center justify-center p-6">
            <div class="max-w-3xl w-full">
                <!-- Header -->
                <div class="text-center mb-12 animate-float">
                    <img src="/public/logo.png" alt="Scrape402 Logo" class="w-32 h-32 mx-auto rounded-full shadow-[0_0_40px_rgba(45,212,191,0.3)] mb-6 border-2 border-teal-400/30">
                    <h1 class="text-5xl font-extrabold tracking-tight mb-4"><span class="gradient-text">Scrape402</span> API</h1>
                    <p class="text-xl text-slate-400 font-medium">Unblockable internet access for autonomous AI agents.</p>
                </div>

                <!-- Main Card -->
                <div class="glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-blue-500"></div>
                    
                    <div class="space-y-8">
                        <!-- Endpoint -->
                        <div>
                            <h3 class="text-sm uppercase tracking-widest text-slate-500 font-semibold mb-2">Endpoint</h3>
                            <div class="bg-slate-900/80 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between">
                                <code class="code-font text-teal-400 text-lg">GET /scrape?url=...</code>
                                <span class="bg-teal-500/10 text-teal-400 text-xs px-3 py-1 rounded-full font-bold border border-teal-500/20">0.1 USDC</span>
                            </div>
                        </div>

                        <!-- Wallet -->
                        <div>
                            <h3 class="text-sm uppercase tracking-widest text-slate-500 font-semibold mb-2">Merchant Wallet (Algorand)</h3>
                            <div class="bg-slate-900/80 rounded-xl p-4 border border-slate-700/50">
                                <code class="code-font text-blue-400 text-sm break-all">${avmAddress}</code>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                            <a href="/docs" class="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl transition-all duration-200 border border-slate-600 hover:border-teal-500 group">
                                <svg class="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                <span class="font-semibold">View OpenAPI Docs</span>
                            </a>
                            <a href="https://www.npmjs.com/package/scrape402-langchain" target="_blank" class="flex items-center justify-center gap-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 p-4 rounded-xl transition-all duration-200 border border-teal-500/30 group">
                                <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                                <span class="font-semibold">LangChain SDK</span>
                            </a>
                        </div>

                        <!-- Faucet -->
                        <div class="mt-6 p-4 bg-teal-500/5 rounded-xl border border-teal-500/20">
                            <h3 class="text-sm font-bold text-teal-400 mb-1 flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                                Developer Faucet Live
                            </h3>
                            <p class="text-xs text-slate-400 leading-relaxed">
                                Testing our API? Call <code class="text-teal-300">POST /faucet/algo</code> and <code class="text-teal-300">POST /faucet/usdc</code> with your wallet address to instantly receive free Mainnet ALGO and USDC test funds! See our <a href="/docs" class="text-teal-400 hover:underline">Swagger Docs</a> for details.
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div class="text-center mt-8 text-slate-500 text-sm">
                    Powered by the <a href="https://x402.org" target="_blank" class="text-slate-400 hover:text-white transition-colors underline decoration-slate-600 underline-offset-4">x402 Protocol</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Swagger UI and OpenAPI Spec
app.get('/docs', swaggerUI({ url: '/openapi.json' }));
app.get('/openapi.json', (c) => {
    return c.json({
        openapi: '3.0.0',
        info: {
            title: 'Scrape402 API',
            version: '1.0.0',
            description: 'Autonomous x402-gated web scraping API with built-in Developer Faucet'
        },
        paths: {
            '/scrape': {
                get: {
                    summary: 'Scrape a URL to Markdown',
                    parameters: [
                        {
                            name: 'url',
                            in: 'query',
                            required: true,
                            schema: { type: 'string' },
                            description: 'The URL to scrape'
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Successful scraping',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            markdown: { type: 'string' },
                                            url: { type: 'string' },
                                            timestamp: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        '402': {
                            description: 'Payment Required via x402 protocol'
                        }
                    }
                }
            },
            '/faucet/algo': {
                post: {
                    summary: 'Get free ALGO gas (0.2 ALGO)',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        address: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': { description: 'Success' }
                    }
                }
            },
            '/faucet/usdc': {
                post: {
                    summary: 'Get free USDC test funds (0.2 USDC)',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        address: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': { description: 'Success' }
                    }
                }
            }
        }
    });
});

app.post("/faucet/algo", async (c) => {
    try {
        if (!serverAccount) return c.json({ error: "Faucet is disabled on this server." }, 503);
        const body = await c.req.json();
        const { address } = body;
        if (!address) return c.json({ error: "Missing address" }, 400);

        const params = await algoClient.getTransactionParams().do();
        const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: serverAccount.addr,
            receiver: address,
            amount: 250_000, // 0.25 ALGO to cover Min Balance (0.2) + Fees
            suggestedParams: params,
        });
        const signedTxn = txn.signTxn(serverAccount.sk);
        const { txid: txId } = await algoClient.sendRawTransaction(signedTxn).do();
        return c.json({ success: true, txId });
    } catch (e: any) {
        console.error("Faucet ALGO error:", e);
        return c.json({ error: e.message }, 500);
    }
});

app.post("/faucet/usdc", async (c) => {
    try {
        if (!serverAccount) return c.json({ error: "Faucet is disabled on this server." }, 503);
        const body = await c.req.json();
        const { address } = body;
        if (!address) return c.json({ error: "Missing address" }, 400);

        const params = await algoClient.getTransactionParams().do();
        const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: serverAccount.addr,
            receiver: address,
            assetIndex: 31566704, // Mainnet USDC
            amount: 100_000, // 0.1 USDC (6 decimals) - Exact cost of API
            suggestedParams: params,
        });
        const signedTxn = txn.signTxn(serverAccount.sk);
        const { txid: txId } = await algoClient.sendRawTransaction(signedTxn).do();
        return c.json({ success: true, txId });
    } catch (e: any) {
        console.error("Faucet USDC error:", e);
        return c.json({ error: e.message }, 500);
    }
});

// Apply x402 payment middleware
app.use(
    paymentMiddleware(
        {
            "GET /scrape": {
                accepts: [
                    {
                        scheme: "exact",
                        price: "0.1",
                        network: ALGORAND_MAINNET_CAIP2,
                        payTo: avmAddress,
                        extra: { 
                            asset: 31566704,
                            tag: "x402-global-challenge"
                        },
                    },
                ],
                description: "Extract clean, markdown-formatted text from any given URL, bypassing common web blocks.",
                mimeType: "application/json",
                extensions: scrapeDiscovery,
            },
        },
        server,
    ),
);

app.get("/scrape", async (c) => {
    const targetUrl = c.req.query("url");
    if (!targetUrl) {
        return c.json({ error: "Missing 'url' query parameter" }, 400);
    }

    let browser;
    try {
        // Launch headless browser
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        });
        const page = await context.newPage();
        
        // Wait until network is mostly idle to ensure dynamic content loads
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
        
        // Extract body HTML
        const html = await page.evaluate(() => document.body.innerHTML);
        
        // Convert to Markdown
        const turndownService = new TurndownService({ headingStyle: 'atx' });
        // Strip out noisy tags
        turndownService.remove(['script', 'noscript', 'style', 'header', 'footer', 'nav', 'iframe']);
        const markdown = turndownService.turndown(html);

        return c.json({
            markdown,
            url: targetUrl,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("Scraping error:", error);
        return c.json({ error: "Failed to scrape URL", details: error.message }, 500);
    } finally {
        if (browser) await browser.close();
    }
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 4021;
serve({ fetch: app.fetch, port }, () => {
    console.log(`x402 Scrape402 Server listening at port ${port}`);
    console.log(`Payment Wallet: ${avmAddress}`);
});
