const nacl = require('tweetnacl')
const { sha3_256, sha3_512 } = require('js-sha3')
const toBuffer = require('typedarray-to-buffer')
const bip39 = require('bip39')

const { salt, accountSalt } = require('../utils/salt')

// Generate keyPair
const generateKeyPair = mnemonic => {
  const mnemonicBytes = Buffer.from(mnemonic)
  const accountSaltBytes = Buffer.from(accountSalt, 'hex')
  const hashedMnemonic = sha3_512
    .update(accountSaltBytes)
    .update(mnemonicBytes)
    .digest()

  const privateKey = Buffer.from(hashedMnemonic).toString('hex')
  const keyPair = nacl.sign.keyPair.fromSecretKey(
    Uint8Array.from(Buffer.from(privateKey, 'hex'))
  )

  return keyPair
}

// Generate mnemonic words and address
const generateAddress = () => {
  const mnemonic = bip39.generateMnemonic()

  const keyPair = generateKeyPair(mnemonic)
  const publicKey = keyPair.publicKey

  // Generate address (hash public key) --> Update takes Buffer, Uint8Array and String only
  const address = sha3_256.update(toBuffer(publicKey)).hex()

  return { mnemonic, address }
}

// Sign message
const sign = ({ message, mnemonic }) => {
  // const salt = Buffer.from('RawTransaction@@$$LIBRA$$@@')
  const saltBytes = Buffer.from(salt, 'hex')

  const hash = sha3_256
    .update(saltBytes)
    .update(message)
    .digest()

  // Receive privateKey as mnemonic words
  const keyPair = generateKeyPair(mnemonic)
  const publicKey = keyPair.publicKey

  const signature = nacl.sign.detached(Uint8Array.from(hash), keyPair.secretKey)

  return {
    publicKey,
    signature
  }
}

module.exports = { generateAddress, sign }
