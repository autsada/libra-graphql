const Account = require('../classes/Account')
const RawTransaction = require('../classes/RawTransaction')
const Program = require('../classes/Program')
const peerToPeerCode = require('../utils/peerToPeerTxnHex')
const AccountState = require('../classes/AccountState')
const { decodeLedger } = require('../utils/deserialize')

const Mutation = {
  createAccount: (parent, args, { libra }, info) => {
    const user = new Account(args.email)
    user.generateKeys()

    return user
  },

  mintCoin: async (parent, { amount, address }, { libra }, info) => {
    // Amount is in libra, so need to convert to micro libra
    const response = await libra.mintCoin({
      amount: amount * 1000000,
      address: address
    })

    if (!response) {
      throw new Error('Mint coins failed, please try again later')
    }
    const ledger = decodeLedger(response)
    const accountState = new AccountState(ledger)

    return accountState
  },

  transferMoney: async (
    parent,
    { fromAddress, sequenceNumber, toAddress, amount, secretKey },
    { libra },
    info
  ) => {
    // Amount is in libra, so need to convert to micro libra
    const txnProgram = new Program({
      code: peerToPeerCode.code,
      args: [
        {
          address: toAddress
        },
        { amount: amount * 1000000 }
      ]
    })

    const transferTxn = new RawTransaction({
      address: fromAddress,
      sequenceNumber,
      program: txnProgram
    })

    const signedTxn = transferTxn.signTransaction(secretKey)

    const response = await libra.transferMoney({
      signedTxn,
      address: fromAddress,
      sequenceNumber
    })

    const ledger = decodeLedger(response)
    const accountState = new AccountState(ledger)

    const {
      signed_transaction_with_proof
    } = accountState.response_items[0].get_account_transaction_by_sequence_number_response

    if (!signed_transaction_with_proof) {
      throw new Error(
        `Something went wrong, please try query to check the transaction again.`
      )
    }

    const {
      signed_transaction: {
        signed_txn: { from_account, to_account }
      },
      events: { events }
    } = signed_transaction_with_proof

    events.map(event => {
      const { event_data } = event

      if (from_account === event_data.address) {
        event_data.event_type = 'sent'
      }

      if (to_account === event_data.address) {
        event_data.event_type = 'received'
      }
    })

    return signed_transaction_with_proof
  }
}

module.exports = Mutation
