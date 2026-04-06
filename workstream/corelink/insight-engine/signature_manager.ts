export class SigningEngine {
  private keyPair?: CryptoKeyPair

  /**
   * Generate a new keypair when creating the engine.
   * Call await SigningEngine.create() instead of new SigningEngine().
   */
  private constructor(keyPair: CryptoKeyPair) {
    this.keyPair = keyPair
  }

  /**
   * Factory method to create an initialized instance.
   */
  static async create(): Promise<SigningEngine> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    )
    return new SigningEngine(keyPair)
  }

  async sign(data: string): Promise<string> {
    if (!this.keyPair?.privateKey) throw new Error("Keypair not initialized")
    const enc = new TextEncoder().encode(data)
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", this.keyPair.privateKey, enc)
    return Buffer.from(sig).toString("base64")
  }

  async verify(data: string, signature: string): Promise<boolean> {
    if (!this.keyPair?.publicKey) throw new Error("Keypair not initialized")
    const enc = new TextEncoder().encode(data)
    const sig = Buffer.from(signature, "base64")
    return crypto.subtle.verify("RSASSA-PKCS1-v1_5", this.keyPair.publicKey, sig, enc)
  }

  async exportPublicKey(): Promise<JsonWebKey> {
    if (!this.keyPair?.publicKey) throw new Error("No public key available")
    return crypto.subtle.exportKey("jwk", this.keyPair.publicKey)
  }

  async exportPrivateKey(): Promise<JsonWebKey> {
    if (!this.keyPair?.privateKey) throw new Error("No private key available")
    return crypto.subtle.exportKey("jwk", this.keyPair.privateKey)
  }
}
