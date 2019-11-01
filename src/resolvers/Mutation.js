const Account = require('../classes/Account')
const RawTransaction = require('../classes/RawTransaction')
const Program = require('../classes/Program')
const peerToPeerCode = require('../utils/peerToPeerTxnHex')
const AccountState = require('../classes/AccountState')
const { decodeLedger } = require('../utils/deserialize')

const { queryByAddress } = require('./Query')

const Mutation = {
  createAccount: (parent, args, { libra }, info) => {
    const user = new Account(args.email)
    user.generateKeys()

    return user
  },

  mintCoin: async (parent, { amount, address }, { libra }, info) => {
    // If amount is over than 1,000,000 libra, cannot process.
    if (amount * 1000000 > 1000000 * 1000000) {
      throw new Error('Too much amount, mint coins failed, ')
    }

    // Amount is in libra, so need to convert to micro libra
    const response = await libra.mintCoins({
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
    { libra, pubsub },
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

    // Check if the address has account in the testnet, and if it has, check if it has enough balance to transfer

    const rawAccountState = await libra.queryAccountByAddress({
      accountAddress: fromAddress
    })

    // Account does not exist
    if (!rawAccountState) {
      throw new Error(`Account does not exist in libra database.`)
    }

    const accountLedger = decodeLedger(rawAccountState)
    const account = new AccountState(accountLedger)

    const {
      blob: {
        blob: { balance, sequence_number }
      }
    } = account.response_items[0].get_account_state_response.account_state_with_proof

    // Wrong sequence number
    if (sequence_number !== sequenceNumber) {
      throw new Error('Wrong sequence number, transfer failed.')
    }

    // Not enough balance
    if (amount * 1000000 > balance) {
      throw new Error('Not enough balance.')
    }

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
      transaction_with_proof
    } = accountState.response_items[0].get_account_transaction_by_sequence_number_response

    if (!transaction_with_proof) {
      throw new Error(
        `Something went wrong, please try query to check the transaction again.`
      )
    } else {
      const {
        transaction: {
          transaction: { from_account, to_account, sequence_number }
        },
        events: { events }
      } = transaction_with_proof
      if (sequenceNumber !== sequence_number) {
        throw new Error(`Transfer coins failed.`)
      }

      events.map(event => {
        const { event_data } = event

        if (from_account === event_data.address) {
          event_data.event_type = 'sent'
        }

        if (to_account === event_data.address) {
          event_data.event_type = 'received'
        }
      })

      pubsub.publish('TRANSFERED', {
        receivedCoins: transaction_with_proof
      })

      return transaction_with_proof
    }
  }
}

module.exports = Mutation
