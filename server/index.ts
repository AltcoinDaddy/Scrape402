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

let avmAddress = process.env.AVM_ADDRESS as string;
const avmMnemonic = process.env.AVM_MNEMONIC;
let serverAccount: algosdk.Account | null = null;

if (avmMnemonic) {
    serverAccount = algosdk.mnemonicToSecretKey(avmMnemonic);
    avmAddress = serverAccount.addr.toString(); // Force API payments to go to the Faucet wallet
} else if (!avmAddress) {
    console.error("Fatal Error: Missing both AVM_ADDRESS and AVM_MNEMONIC.");
    process.exit(1);
} else {
    console.warn("⚠️ Missing AVM_MNEMONIC environment variable. Faucet endpoints will be disabled.");
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
        <html lang="en" class="dark">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Scrape402 | APIs for scalable web intelligence</title>
            <meta property="og:title" content="Scrape402" />
            <meta property="og:description" content="Pay-per-request infrastructure API that solves one of the biggest bottlenecks in the AI industry: giving autonomous agents reliable access to the internet." />
            
            <script>
                // Theme initialization
                if (localStorage.theme === 'light' || (!('theme' in localStorage) && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.remove('dark')
                } else {
                    document.documentElement.classList.add('dark')
                }
                function toggleTheme() {
                    if (document.documentElement.classList.contains('dark')) {
                        document.documentElement.classList.remove('dark');
                        localStorage.theme = 'light';
                    } else {
                        document.documentElement.classList.add('dark');
                        localStorage.theme = 'dark';
                    }
                }
            </script>
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
                tailwind.config = {
                    darkMode: 'class',
                    theme: {
                        extend: {
                            fontFamily: {
                                sans: ['Geist', 'sans-serif'],
                                mono: ['Geist Mono', 'monospace'],
                            }
                        }
                    }
                }
            </script>
            <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Geist', sans-serif; }
                .bento-shadow { box-shadow: 0 24px 80px -12px rgba(0,0,0,0.25); }
                .dark .bento-shadow { box-shadow: 0 24px 80px -12px rgba(0,0,0,0.8); }
            </style>
        </head>
        <body class="bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 transition-colors duration-200 antialiased min-h-screen selection:bg-teal-500/30">
            
            <!-- Navigation -->
            <nav class="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-md">
                <div class="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
                    <div class="flex items-center gap-2 font-semibold text-lg tracking-tight">
                        <img src="/public/logo.jpg" alt="Scrape402 Logo" class="w-8 h-8 object-contain mix-blend-multiply dark:mix-blend-screen" />
                        Scrape402
                    </div>
                    <div class="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    </div>
                    <div class="flex items-center gap-4">
                        <button onclick="toggleTheme()" class="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">
                            <!-- Theme Icon -->
                            <svg class="w-5 h-5 block dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                            <svg class="w-5 h-5 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        </button>
                        <a href="/docs" class="text-sm font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2 rounded-full hover:opacity-90 transition-opacity">Get started</a>
                    </div>
                </div>
            </nav>

            <!-- Hero Section -->
            <main class="max-w-[1400px] mx-auto px-6 pt-24 pb-32 text-center">

                
                <h1 class="text-5xl md:text-7xl font-semibold tracking-tighter leading-[1.1] max-w-4xl mx-auto mb-6">
                    Turn any webpage into <br class="hidden md:block" /> clean markdown for AI
                </h1>
                
                <p class="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                    Extract clean, structured markdown from any URL while bypassing common anti-bot protections. Paid natively via the Algorand x402 protocol.
                </p>
                
                <div class="flex items-center justify-center gap-4">
                    <a href="/docs" class="text-sm font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-6 py-3 rounded-full hover:opacity-90 transition-opacity">
                        Request API access
                    </a>
                    <a href="https://www.npmjs.com/package/scrape402-langchain" target="_blank" class="text-sm font-medium bg-transparent text-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800 px-6 py-3 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        NPM Package
                    </a>
                </div>

                <!-- Dashboard Mockup (Bento) -->
                <div class="mt-20 relative mx-auto max-w-6xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 bento-shadow overflow-hidden flex text-left h-[700px]">
                    
                    <!-- Sidebar -->
                    <div class="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-6 flex-col gap-8 hidden md:flex">

                        <div class="space-y-8">
                            <div>
                                <div class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">API Playground</div>
                                <div class="space-y-1">
                                    <div class="flex items-center gap-3 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800/80 text-sm font-medium text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200 dark:border-zinc-700">
                                        <svg class="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> 
                                        Extract
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Main Dashboard Panel -->
                    <div class="flex-1 min-w-0 bg-white dark:bg-zinc-900 p-8 md:p-12 overflow-y-auto relative">
                        <h2 class="text-2xl font-semibold tracking-tight mb-10">Web Data Infrastructure for AI Applications</h2>
                        
                        <h3 class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Our Endpoints</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                            <!-- Discovery/Extract API Card -->
                            <div class="rounded-[1rem] border border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-900/10 p-5 flex flex-col justify-between h-40 group hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
                                <div>
                                    <div class="text-teal-700 dark:text-teal-400 font-semibold mb-1">Extraction API</div>
                                    <div class="text-xs text-teal-600/80 dark:text-teal-400/70 leading-relaxed pr-4">Returns webpage contents as clean markdown, bypassing standard anti-bot protections.</div>
                                </div>
                                <div class="flex items-center justify-between mt-4">
                                    <code class="text-[11px] font-mono text-teal-800 dark:text-teal-200 bg-teal-100/50 dark:bg-teal-900/30 px-2 py-1 rounded">GET /scrape?url=...</code>
                                    <a href="/docs" class="text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-white dark:bg-zinc-800 px-4 py-1.5 rounded-full border border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">Explore API</a>
                                </div>
                            </div>
                            
                            <!-- Faucet Card -->
                            <div class="rounded-[1rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col justify-between h-40 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                                <div>
                                    <div class="text-zinc-900 dark:text-zinc-100 font-semibold mb-1">Developer Faucet</div>
                                    <div class="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pr-4">Instantly receive free Mainnet ALGO and USDC test funds for x402 payment testing.</div>
                                </div>
                                <div class="flex items-center gap-2 mt-4">
                                    <a href="/docs" class="flex-1 text-center text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 px-4 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">Get ALGO</a>
                                    <a href="/docs" class="flex-1 text-center text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 px-4 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">Get USDC</a>
                                </div>
                            </div>
                        </div>

                        <h3 class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Get Started</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Payment Wallet -->
                            <div class="flex items-center gap-4 p-4 rounded-[1rem] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                <div class="w-10 h-10 shrink-0 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"></path></svg>
                                </div>
                                <div class="min-w-0">
                                    <div class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Merchant Wallet</div>
                                    <div class="text-[11px] text-zinc-500 font-mono mt-0.5 break-all pr-2">${avmAddress}</div>
                                </div>
                            </div>
                            
                            <!-- Usage -->
                            <div class="flex items-center gap-4 p-4 rounded-[1rem] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                <div class="w-10 h-10 shrink-0 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 13h2.625L7.5 9.25l2.25 10.5L14.25 6l2.25 10.5L18.375 13H21"></path></svg>
                                </div>
                                <div>
                                    <div class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Usage Cost</div>
                                    <div class="text-xs text-zinc-500 mt-0.5">Fixed rate: 0.1 USDC / request</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- AI Input Chat Bar -->
                        <div class="mt-12 mb-8 relative max-w-3xl mx-auto">
                            <!-- Fades bottom -->
                            <div class="p-4 pl-5 pr-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm flex items-center gap-3">
                                <span class="text-sm text-zinc-400 flex-1">Ask about endpoints, schema design, or workflow orchestration...</span>
                                <div class="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-400">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
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
