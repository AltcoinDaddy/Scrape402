import { config } from "dotenv";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { declareDiscoveryExtension, bazaarResourceServerExtension } from "@x402-avm/extensions";
import type { ResourceServerExtension } from "@x402/core/types";
import { ALGORAND_TESTNET_CAIP2, USDC_TESTNET_ASA_ID } from "@x402/avm";
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
    .register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme());

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

// Apply x402 payment middleware
app.use(
    paymentMiddleware(
        {
            "GET /scrape": {
                accepts: [
                    {
                        scheme: "exact",
                        price: "0.1",
                        network: ALGORAND_TESTNET_CAIP2,
                        payTo: avmAddress,
                        extra: { 
                            asset: USDC_TESTNET_ASA_ID,
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
