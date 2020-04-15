const toBuffer = require('typedarray-to-buffer')
const leb = require('leb128')

const {
  serializeU8,
  serializeU32,
  serializeU64,
  serializeString,
  serializeAddress,
  serializeArgAddress,
  serializeArgAuthPrefix,
  serializeArgU64,
  serializeArgString,
  serializeModules,
} = require('../utils/lcs')
const { sign } = require('../utils/crypto-nacl')
const { signTxn } = require('../utils/crypto')

class RawTransaction {
  constructor({ address, sequenceNumber, program }) {
    this.sender = address
    this.sequence_number = sequenceNumber
    this.payload = program
    this.max_gas_amount = 1000000
    this.gas_unit_price = 0
    this.expiration_time = Math.floor(Date.now() / 1000) + 240
  }

  createRawTxnBytes() {
    const rawTxnPrefixBytes = leb.unsigned.encode(0)
    const senderBytes = serializeAddress(this.sender)
    const sequenceNumberBytes = serializeU64(this.sequence_number)
    const payloadBytes = this.createScriptTxnPayloadBytes(this.payload)
    const maxGasAmountBytes = serializeU64(this.max_gas_amount)
    const gasUnitPriceBytes = serializeU64(this.gas_unit_price)
    const unknowBytes = Buffer.from(
      '0600000000000000000000000000000000034c4252015400',
      'hex'
    )
    const expirationTimeBytes = serializeU64(this.expiration_time)

    const rawTxnBytes = Buffer.concat([
      rawTxnPrefixBytes,
      senderBytes,
      sequenceNumberBytes,
      payloadBytes,
      maxGasAmountBytes,
      gasUnitPriceBytes,
      unknowBytes,
      expirationTimeBytes,
    ])

    return rawTxnBytes
  }

  createScriptTxnPayloadBytes(program) {
    const payloadBytesArray = []

    // const orderBytes = serializeU32(2) // Payload from script has 2 index in enum Transaction arguments
    const orderBytes = leb.unsigned.encode(2) // Payload from script has 2 index in enum Transaction arguments

    payloadBytesArray.push(orderBytes)

    if (program.code) {
      const codeBytes = serializeString(program.code)
      payloadBytesArray.push(codeBytes)
    }

    if (program.args) {
      const { args } = program
      const argsLen = args.length
      // const argsLenBytes = serializeU32(argsLen)
      const argsLenBytes = leb.unsigned.encode(argsLen)
      payloadBytesArray.push(argsLenBytes)

      args.map((arg) => {
        if (arg.address) {
          const argAddressBytes = serializeArgAddress(arg.address)
          payloadBytesArray.push(argAddressBytes)
        }

        if (arg.authPrefix) {
          const argAuthPrefixBytes = serializeArgAuthPrefix(arg.authPrefix)

          payloadBytesArray.push(argAuthPrefixBytes)
        }

        if (arg.amount) {
          const argU64Bytes = serializeArgU64(arg.amount)
          payloadBytesArray.push(argU64Bytes)
        }

        if (arg.string) {
          const argStringBytes = serializeArgString(arg.string, 'utf8')
          payloadBytesArray.push(argStringBytes)
        }
      })
    }

    if (program.modules) {
      const modulesBytes = serializeModules(program.modules)
      payloadBytesArray.push(modulesBytes)
    }

    const payloadBytes = Buffer.concat(payloadBytesArray)

    return payloadBytes
  }

  signTransaction(secretKey) {
    // Serialize rawTransaction
    const rawTxnBytes = this.createRawTxnBytes()

    // Sign transaction
    const signedTxn = sign({ message: rawTxnBytes, secretKey })

    // Serialize public key
    const publicKeyBytes = toBuffer(signedTxn.publicKey)
    const publicKeyBytesLen = serializeU32(publicKeyBytes.length)
    const publicKey = Buffer.concat([publicKeyBytesLen, publicKeyBytes])

    // Serialize signature
    const signatureBytes = toBuffer(signedTxn.signature)
    const signatureBytesLen = serializeU32(signatureBytes.length)
    const signature = Buffer.concat([signatureBytesLen, signatureBytes])

    const signedTxnBytes = Buffer.concat([rawTxnBytes, publicKey, signature])
    return {
      txn_bytes: Uint8Array.from(signedTxnBytes),
    }
  }

  signTxnWithMnemonic(mnemonic) {
    // Serialize rawTransaction
    const rawTxnBytes = this.createRawTxnBytes()

    // Sign transaction
    const signedTxn = signTxn({ message: rawTxnBytes, mnemonic })

    // Serialize scheme id
    const schemeIdBytes = leb.unsigned.encode(0)

    // Serialize public key
    const publicKeyBytes = toBuffer(signedTxn.publicKey)
    // const publicKeyBytesLen = serializeU32(publicKeyBytes.length)
    const publicKeyBytesLen = leb.unsigned.encode(publicKeyBytes.length)
    const publicKey = Buffer.concat([publicKeyBytesLen, publicKeyBytes])

    // Serialize signature
    const signatureBytes = toBuffer(signedTxn.signature)
    // const signatureBytesLen = serializeU32(signatureBytes.length)
    const signatureBytesLen = leb.unsigned.encode(signatureBytes.length)
    const signature = Buffer.concat([signatureBytesLen, signatureBytes])

    const signedTxnBytes = Buffer.concat([
      rawTxnBytes,
      schemeIdBytes,
      publicKey,
      signature,
    ])

    return {
      txn_bytes: Uint8Array.from(signedTxnBytes),
    }
  }
}

module.exports = RawTransaction
