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

config();

const avmAddress = process.env.AVM_ADDRESS;
if (!avmAddress) {
    console.error("Missing AVM_ADDRESS environment variable");
    process.exit(1);
}

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
        <html>
            <head>
                <title>Scrape402 API</title>
                <meta property="og:title" content="Scrape402" />
                <meta property="og:description" content="Scrape402 is a pay-per-request infrastructure API that solves one of the biggest bottlenecks in the AI industry: giving autonomous agents reliable access to the internet." />
                <meta property="og:image" content="https://api.scrape402.site/public/logo.jpg" />
                <style>
                    body { font-family: system-ui, sans-serif; padding: 40px; background: #000; color: #fff; line-height: 1.6; }
                    h1 { color: #00ff88; }
                    a { color: #00aaff; }
                </style>
            </head>
            <body>
                <h1>🤖 Scrape402 API is live!</h1>
                <p>This is an x402-gated autonomous web scraping endpoint on the Algorand blockchain.</p>
                <p>To use this API, you must send an HTTP GET request to <code>/scrape?url=...</code> and pay the required 0.1 USDC via the x402 protocol.</p>
                <p>Server Wallet: <code>${avmAddress}</code></p>
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
            description: 'Autonomous x402-gated web scraping API'
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
            }
        }
    });
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
