import algosdk from "algosdk";
import { config } from "dotenv";
config();

const algodToken = "";
const algodServer = "https://testnet-api.algonode.cloud";
const algodPort = "";
const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

const USDC_ASA_ID = 10458941;

async function run() {
    const serverMnemonic = "escape animal gym dove hill inject buzz exist amazing whisper pulp side term once other unique ocean armed light twist elegant emotion possible able rocket";
    const serverAccount = algosdk.mnemonicToSecretKey(serverMnemonic);

    const clientMnemonic = process.env.AVM_MNEMONIC || "";
    const clientAccount = algosdk.mnemonicToSecretKey(clientMnemonic);

    const params = await algodClient.getTransactionParams().do();

    console.log("Funding server wallet with 1 ALGO from client wallet...");
    try {
        const fundTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender: clientAccount.addr,
            receiver: serverAccount.addr,
            amount: 1000000, // 1 ALGO
            suggestedParams: params
        });
        const signedFund = fundTxn.signTxn(clientAccount.sk);
        const { txId } = await algodClient.sendRawTransaction(signedFund).do();
        await algosdk.waitForConfirmation(algodClient, txId, 4);
        console.log("✅ Server wallet funded!");
    } catch (e: any) {
        console.log("Could not fund server wallet (maybe already funded or insufficient client ALGO).", e.message);
    }

    async function optIn(account: any, name: string) {
        console.log(`Checking ${name} wallet: ${account.addr}`);
        try {
            const accountInfo = await algodClient.accountInformation(account.addr).do();
            const assets = accountInfo.assets || [];
            const isOptedIn = assets.some((a: any) => a['asset-id'] === USDC_ASA_ID);
            
            if (isOptedIn) {
                console.log(`✅ ${name} is already opted into USDC.`);
                return;
            }

            console.log(`⏳ Opting ${name} into USDC (ASA ${USDC_ASA_ID})...`);
            const optInParams = await algodClient.getTransactionParams().do();
            const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                sender: account.addr,
                receiver: account.addr,
                assetIndex: USDC_ASA_ID,
                amount: 0,
                suggestedParams: optInParams
            });

            const signedTxn = txn.signTxn(account.sk);
            const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
            console.log(`Broadcasted opt-in tx: ${txId}. Waiting for confirmation...`);
            await algosdk.waitForConfirmation(algodClient, txId, 4);
            console.log(`✅ ${name} successfully opted into USDC!`);
        } catch (e: any) {
            console.error(`❌ Failed to opt in ${name}:`, e.message);
        }
    }

    await optIn(serverAccount, "Server API");
    await optIn(clientAccount, "Client AI Agent");
}

run();
