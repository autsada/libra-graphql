const { generateKeyPair } = require('../utils/crypto')
const { generateAccount } = require('../utils/crypto1')

class Account {
  constructor() {}

  generateKeys() {
    // Generate key pair
    const keys = generateKeyPair()

    this.publicKey = keys.publicKey
    this.secretKey = keys.secretKey
    this.address = keys.address
  }

  // generateAddress() {
  //   // Generate key pair
  //   const account = generateAccount()

  //   this.publicKey = account.publicKey
  //   this.address = account.address
  //   this.mnemonic = account.mnemonic
  // }
}

module.exports = Account
