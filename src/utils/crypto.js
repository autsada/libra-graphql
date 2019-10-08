const nacl = require('tweetnacl')
const { sha3_256 } = require('js-sha3')
const toBuffer = require('typedarray-to-buffer')

const { salt } = require('../utils/salt')

// Generate key pair
const generateKeyPair = () => {
  const keyPair = nacl.sign.keyPair()

  // Encode publicKey to hex
  const publicKeyBytes = toBuffer(keyPair.publicKey)
  // const publicKey = publicKeyBytes.toString('hex')
  const secretKey = toBuffer(keyPair.secretKey).toString('hex')

  // Generate address (hash public key) --> Update takes Buffer, Uint8Array and String only
  const address = sha3_256.update(publicKeyBytes).hex()

  return { address, secretKey }
}

// Sign message
const sign = ({ message, secretKey }) => {
  // const salt = Buffer.from('RawTransaction@@$$LIBRA$$@@')
  const saltBytes = Buffer.from(salt, 'hex')

  const hash = sha3_256
    .update(saltBytes)
    .update(message)
    .digest()

  const signKey = nacl.sign.keyPair.fromSecretKey(
    Uint8Array.from(Buffer.from(secretKey, 'hex'))
  )
  const publicKey = signKey.publicKey

  const signature = nacl.sign.detached(Uint8Array.from(hash), signKey.secretKey)

  return {
    publicKey,
    signature
  }
}

module.exports = { generateKeyPair, sign }
