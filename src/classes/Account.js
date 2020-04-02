// const { generateKeyPair } = require("../utils/crypto-nacl")
const { generateAccount } = require('../utils/crypto')

// class Account {
//   constructor() {}

//   generateKeys() {
//     // Generate key pair
//     const keys = generateKeyPair()

//     this.address = keys.address
//     this.secretKey = keys.secretKey
//     this.publicKey = keys.publicKey
//   }
// }

class Account {
  constructor() {}

  getAccount() {
    // Generate key pair
    const keys = generateAccount()

    this.address = keys.address
    this.mnemonic = keys.mnemonic
    this.publicKey = keys.publicKey
    this.authKey = keys.authKey
  }
}

module.exports = Account
