require("dotenv").config({ path: "../../config/dev.env" })
const EdDSA = require("elliptic").eddsa
const { sha3_256, sha3_512 } = require("js-sha3")
const toBuffer = require("typedarray-to-buffer")
const bip39 = require("bip39")

const { salt } = require("./salt")

// Generate address and mnemonic
const generateAccount = () => {
  const ec = new EdDSA("ed25519")
  const mnemonic = bip39.generateMnemonic()

  const hashedMnemonic = sha3_512
    .update(process.env.SALT_BEFORE)
    .update(mnemonic)
    .update(process.env.SALT_AFTER)
    .hex()

  const keyPair = ec.keyFromSecret(hashedMnemonic)

  const publicKeyBytes = toBuffer(keyPair.getPublic())
  const publicKey = publicKeyBytes.toString("hex")

  const address = sha3_256.update(publicKeyBytes).hex()

  return {
    address,
    publicKey,
    mnemonic
  }
}

// From mnemonic to private key
const generateKeyPair = mnemonic => {
  const ec = new EdDSA("ed25519")

  const hashedMnemonic = sha3_512
    .update(process.env.SALT_BEFORE)
    .update(mnemonic)
    .update(process.env.SALT_AFTER)
    .hex()

  const keyPair = ec.keyFromSecret(hashedMnemonic)

  return keyPair
}

// Sign message
const signTxn = ({ message, mnemonic }) => {
  const keyPair = generateKeyPair(mnemonic)

  const hash = sha3_256
    .update(Buffer.from(salt, "hex"))
    .update(message)
    .digest()

  const publicKey = Uint8Array.from(toBuffer(keyPair.getPublic()))

  const signature = Uint8Array.from(
    Buffer.from(keyPair.sign(hash).toHex(), "hex")
  )

  return {
    publicKey,
    signature
  }
}

module.exports = {
  generateAccount,
  generateKeyPair,
  signTxn
}
