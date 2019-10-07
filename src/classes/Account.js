const { generateKeyPair } = require('../utils/crypto')

class Account {
  constructor() {}

  generateKeys() {
    // Generate key pair
    const keys = generateKeyPair()

    this.publicKey = keys.publicKey
    this.secretKey = keys.secretKey
    this.address = keys.address
  }
}

module.exports = Account
