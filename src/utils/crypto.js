require('dotenv').config({ path: '../../config/dev.env' })
const EdDSA = require('elliptic').eddsa
const { sha3_256, sha3_512 } = require('js-sha3')
const toBuffer = require('typedarray-to-buffer')
const bip39 = require('bip39')
const leb = require('leb128')

const { salt } = require('./salt')

// Generate address and mnemonic
const generateAccount = () => {
  const ec = new EdDSA('ed25519')
  const mnemonic = bip39.generateMnemonic()

  const hashedMnemonic = sha3_512
    .update(process.env.SALT_BEFORE)
    .update(mnemonic)
    .update(process.env.SALT_AFTER)
    .hex()

  const keyPair = ec.keyFromSecret(hashedMnemonic)

  const publicKeyBytes = toBuffer(keyPair.getPublic())

  const publicKey = publicKeyBytes.toString('hex')

  // auth-key = sha3-256(public-key + 0/1) // 0 means ed25519; 1 means multi-ed25519
  const schemebytes = leb.unsigned.encode(0)
  // auth-key-prefix = auth-key[:16]  // first half 16 bytes
  // address = auth-key[16:]  // second half 16 bytes

  const authKey = sha3_256
    .update(Buffer.concat([publicKeyBytes, schemebytes]))
    .hex()

  const address = authKey.slice(32, 64)

  return {
    address,
    publicKey,
    mnemonic,
    authKey,
  }
}

// From mnemonic to private key
const generateKeyPair = (mnemonic) => {
  const ec = new EdDSA('ed25519')

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
    .update(Buffer.from(salt, 'hex'))
    .update(message)
    .digest()

  const publicKey = Uint8Array.from(toBuffer(keyPair.getPublic()))

  const signature = Uint8Array.from(
    Buffer.from(keyPair.sign(hash).toHex(), 'hex')
  )

  return {
    publicKey,
    signature,
  }
}

module.exports = {
  generateAccount,
  generateKeyPair,
  signTxn,
}
