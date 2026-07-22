from algosdk import account, mnemonic

def create_wallet(name):
    private_key, address = account.generate_account()
    passphrase = mnemonic.from_private_key(private_key)
    print(f"=== {name} Wallet ===")
    print(f"Address: {address}")
    print(f"Mnemonic: {passphrase}\n")
    return address, passphrase

if __name__ == "__main__":
    create_wallet("Server (API)")
    create_wallet("Client (AI Agent)")
