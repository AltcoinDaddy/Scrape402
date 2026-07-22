import { config } from "dotenv";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { toClientAvmSigner, ExactAvmScheme, ALGORAND_TESTNET_CAIP2 } from "@x402/avm";
import algosdk from "algosdk";

config();

const avmMnemonic = process.env.AVM_MNEMONIC as string;

if (!avmMnemonic) {
    throw new Error(
        "Missing AVM_MNEMONIC environment variable. Please add it to your .env file.",
    );
}

const targetUrl = "https://scrape402.vercel.app/scrape?url=https://example.com";

async function main(): Promise<void> {
    const account = algosdk.mnemonicToSecretKey(avmMnemonic);
    const secretKeyBase64 = Buffer.from(account.sk).toString("base64");
    const avmSigner = toClientAvmSigner(secretKeyBase64);
    const client = new x402Client();

    client.register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(avmSigner));
    console.info(`🤖 AI Agent Wallet Address: ${account.addr}`);
    console.info(`🎯 Requesting URL: ${targetUrl}`);

    const fetchWithPayment = wrapFetchWithPayment(fetch, client);
    const response = await fetchWithPayment(targetUrl, { method: "GET" });

    if (response.ok) {
        const paymentResponse = new x402HTTPClient(client).getPaymentSettleResponse((name) =>
            response.headers.get(name),
        );
        console.log("\n💳 Payment confirmed by GoPlausible!");
        console.log("Transaction details:", JSON.stringify(paymentResponse, null, 2));

        const body = await response.json();
        console.log("\n✅ Markdown Content Extracted Successfully:\n");
        console.log("--------------------------------------------------");
        console.log(body.markdown);
        console.log("--------------------------------------------------");
        
    } else {
        console.error("❌ Request failed with status:", response.status);
        const error = await response.text();
        console.error("Error Response:", error);
    }
}

main().catch((error: Error) => {
    console.error("Fatal Error:", error.message);
    process.exit(1);
});
