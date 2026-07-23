import algosdk from "algosdk";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { toClientAvmSigner, ExactAvmScheme, ALGORAND_MAINNET_CAIP2 } from "@x402/avm";

const algoClient = new algosdk.Algodv2("", "https://mainnet-api.algonode.cloud", "");

// Set to true to test against local server, false for production Vercel server
const LOCAL_TEST = false; 
const SERVER_URL = LOCAL_TEST ? "http://localhost:4021" : "https://api.scrape402.site";

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runIntegrationTest() {
    console.log(`🤖 Scheduled Integration Test Initializing...\n`);

    // 1. Generate a brand new, random Algorand wallet
    const account = algosdk.generateAccount();
    const address = account.addr.toString();
    console.log(`\n✅ Generated New Client Wallet: ${address}`);

    // 2. Call Faucet ALGO
    console.log(`\n🚰 Requesting 0.2 ALGO from Faucet for gas...`);
    const algoRes = await fetch(`${SERVER_URL}/faucet/algo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address })
    });
    const algoData = await algoRes.json();
    if (!algoData.success) {
        throw new Error(`ALGO Faucet failed: ${algoData.error}`);
    }
    console.log(`   Success! TX: ${algoData.txId}`);
    await algosdk.waitForConfirmation(algoClient, algoData.txId, 4);

    // 3. Opt-in to USDC
    console.log(`\n🔗 Opting in to Mainnet USDC (Asset 31566704)...`);
    const params = await algoClient.getTransactionParams().do();
    const optinTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: account.addr,
        receiver: account.addr,
        assetIndex: 31566704,
        amount: 0,
        suggestedParams: params,
    });
    const signedOptin = optinTxn.signTxn(account.sk);
    const { txid: optinId } = await algoClient.sendRawTransaction(signedOptin).do();
    console.log(`   Success! TX: ${optinId}`);
    await algosdk.waitForConfirmation(algoClient, optinId, 4);

    // 4. Call Faucet USDC
    console.log(`\n🚰 Requesting 0.2 USDC from Faucet for payment...`);
    const usdcRes = await fetch(`${SERVER_URL}/faucet/usdc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address })
    });
    const usdcData = await usdcRes.json();
    if (!usdcData.success) {
        throw new Error(`USDC Faucet failed: ${usdcData.error}`);
    }
    console.log(`   Success! TX: ${usdcData.txId}`);
    await algosdk.waitForConfirmation(algoClient, usdcData.txId, 4);

    // 5. Pay the API
    console.log(`\n🚀 Testing Scrape402 API and paying 0.1 USDC via x402...`);
    const secretKeyBase64 = Buffer.from(account.sk).toString("base64");
    const avmSigner = toClientAvmSigner(secretKeyBase64);
    const client = new x402Client();
    client.register(ALGORAND_MAINNET_CAIP2, new ExactAvmScheme(avmSigner));

    const fetchWithPayment = wrapFetchWithPayment(fetch, client);
    const response = await fetchWithPayment(`${SERVER_URL}/scrape?url=https://news.ycombinator.com`, { method: "GET" });
    
    if (response.ok) {
        const data = await response.json();
        console.log(`\n🎉 Success! Extracted ${data.markdown.length} bytes of markdown.`);
        console.log(`   The volume from ${address} has now been recorded on GoPlausible!`);
    } else {
        const text = await response.text();
        console.error(`\n❌ API Failed: ${response.status} - ${text}`);
    }
}

runIntegrationTest().catch(console.error);
