const toBuffer = require('typedarray-to-buffer')
const {
  serializeU32,
  serializeU64,
  serializeString,
  serializeArgAddress,
  serializeArgU64,
  serializeArgString,
  serializeModules
} = require('../utils/lcs')
const { sign } = require('../utils/crypto')

class RawTransaction {
  constructor({ address, sequenceNumber, program }) {
    this.sender = address
    this.sequence_number = sequenceNumber
    this.payload = program
    this.max_gas_amount = 100000
    this.gas_unit_price = 0
    this.expiration_time = Math.floor(Date.now() / 1000) + 120
  }

  createRawTxnBytes() {
    const senderBytes = serializeString(this.sender)
    const sequenceNumberBytes = serializeU64(this.sequence_number)
    const payloadBytes = this.createScriptTxnPayloadBytes(this.payload)
    const maxGasAmountBytes = serializeU64(this.max_gas_amount)
    const gasUnitPriceBytes = serializeU64(this.gas_unit_price)
    const expirationTimeBytes = serializeU64(this.expiration_time)

    const rawTxnBytes = Buffer.concat([
      senderBytes,
      sequenceNumberBytes,
      payloadBytes,
      maxGasAmountBytes,
      gasUnitPriceBytes,
      expirationTimeBytes
    ])

    return rawTxnBytes
  }

  createScriptTxnPayloadBytes(program) {
    const payloadBytesArray = []

    const orderBytes = serializeU32(2) // Payload from script has 2 index in enum Transaction arguments
    payloadBytesArray.push(orderBytes)

    if (program.code) {
      const codeBytes = serializeString(program.code)
      payloadBytesArray.push(codeBytes)
    }

    if (program.args) {
      const { args } = program
      const argsLen = args.length
      const argsLenBytes = serializeU32(argsLen)
      payloadBytesArray.push(argsLenBytes)

      args.map(arg => {
        if (arg.amount) {
          const argU64Bytes = serializeArgU64(arg.amount)
          payloadBytesArray.push(argU64Bytes)
        }

        if (arg.address) {
          const argAddressBytes = serializeArgAddress(arg.address)
          payloadBytesArray.push(argAddressBytes)
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
    const signTxn = sign({ message: rawTxnBytes, secretKey })

    // Serialize public key
    const publicKeyBytes = toBuffer(signTxn.publicKey)
    const publicKeyBytesLen = serializeU32(publicKeyBytes.length)
    const publicKey = Buffer.concat([publicKeyBytesLen, publicKeyBytes])

    // Serialize signature
    const signatureBytes = toBuffer(signTxn.signature)
    const signatureBytesLen = serializeU32(signatureBytes.length)
    const signature = Buffer.concat([signatureBytesLen, signatureBytes])

    const signedTxnBytes = Buffer.concat([rawTxnBytes, publicKey, signature])

    return {
      signed_txn: Uint8Array.from(signedTxnBytes)
    }
  }
}

module.exports = RawTransaction
