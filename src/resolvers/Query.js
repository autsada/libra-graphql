const AccountState = require('../classes/AccountState')
const { decodeLedger } = require('../utils/deserialize')
const accessPath = require('../utils/path')

const Query = {
  // Return the account state (Ledger) of a specified account address
  queryByAddress: async (parent, { address }, { libra }, info) => {
    // Check if user provide address for query
    if (!address) {
      throw new Error(`Please provide account address.`)
    }

    // Check if provided adress is in correct format
    if (typeof address !== 'string' || address.length !== 64) {
      throw new Error(`Please provide a valide account address.`)
    }

    const res = await libra.queryAccountByAddress({
      accountAddress: address
    })

    if (
      !res.response_items[0].get_account_state_response.account_state_with_proof
        .blob
    ) {
      throw new Error(`Account does not exist in libra database.`)
    }

    const ledger = decodeLedger(res)
    const accountState = new AccountState(ledger)

    return accountState
  },

  // Return the transaction for a specified sequence number with events emitted from this transaction
  queryBySequenceNumber: async (
    parent,
    { address, sequenceNumber },
    { libra },
    info
  ) => {
    // Check if all arguments provided
    if (!address || (sequenceNumber === null || sequenceNumber === undefined)) {
      throw new Error(`Please provide all required arguments.`)
    }

    if (typeof address !== 'string' || address.length !== 64) {
      throw new Error(`Please provide a valid account address.`)
    }

    if (typeof sequenceNumber !== 'number') {
      throw new Error(`Please provide a valid sequence number.`)
    }

    const res = await libra.queryAccountBySequenceNumber({
      accountAddress: address,
      sequenceNumber: sequenceNumber
    })

    const ledger = decodeLedger(res)
    const accountState = new AccountState(ledger)

    const {
      transaction_with_proof
    } = accountState.response_items[0].get_account_transaction_by_sequence_number_response

    if (!transaction_with_proof) {
      throw new Error(`Transacton not found.`)
    }

    const {
      transaction: {
        transaction: { from_account, to_account }
      },
      events: { events }
    } = transaction_with_proof

    events.map(event => {
      const { event_data } = event

      if (from_account === event_data.address) {
        event_data.event_type = 'sent'
      }

      if (to_account === event_data.address) {
        event_data.event_type = 'received'
      }
    })

    return transaction_with_proof
  },

  // Return sent events for specified account address
  querySentEvents: async (parent, { address }, { libra }, info) => {
    // Check if user provide address for query
    if (!address) {
      throw new Error(`Please provide account address.`)
    }

    // Check if provided adress is in correct format
    if (typeof address !== 'string' || address.length !== 64) {
      throw new Error(`Please provide a valide account address.`)
    }

    const res = await libra.queryEventsByAccessPath({
      accessPath: {
        address: address,
        path: accessPath,
        eventType: '/sent_events_count/'
      }
    })

    const ledger = decodeLedger(res)
    const accountState = new AccountState(ledger)

    const {
      events_with_proof
    } = accountState.response_items[0].get_events_by_event_access_path_response

    events_with_proof.map(event => {
      event.event.event_data.event_type = 'sent'
    })

    return events_with_proof
  },

  // Return received events for specified account address
  queryReceivedEvents: async (parent, { address }, { libra }, info) => {
    // Check if user provide address for query
    if (!address) {
      throw new Error(`Please provide account address.`)
    }

    // Check if provided adress is in correct format
    if (typeof address !== 'string' || address.length !== 64) {
      throw new Error(`Please provide a valide account address.`)
    }

    const res = await libra.queryEventsByAccessPath({
      accessPath: {
        address,
        path: accessPath,
        eventType: '/received_events_count/'
      }
    })

    const ledger = decodeLedger(res)
    const accountState = new AccountState(ledger)

    const {
      events_with_proof
    } = accountState.response_items[0].get_events_by_event_access_path_response

    events_with_proof.map(event => {
      event.event.event_data.event_type = 'received'
    })

    return events_with_proof
  }

  // querySingleTransaction: async (parent, { version }, { libra }, info) => {
  //   const res = await libra.queryOneTransaction(version)

  //   const ledger = decodeLedger(res)
  //   const accountState = new AccountState(ledger)

  //   const {
  //     transactions,
  //     events_for_versions: { events_for_version }
  //   } = accountState.response_items[0].get_transactions_response.txn_list_with_proof

  //   return transactions[0].signed_txn
  // }

  // queryManyTransactions: async (parent, { address }, { libra }, info) => {
  //   const res = await libra.queryTransactions()

  //   const ledger = decodeLedger(res)
  //   const accountState = new AccountState(ledger)

  //   const {
  //     transactions,
  //     events_for_versions: { events_for_version }
  //   } = accountState.response_items[0].get_transactions_response.txn_list_with_proof

  //   events_for_version.map(eventData => {
  //     const { from_account, to_account } = transactions[0].signed_txn
  //     eventData.events.map(event => {
  //       if (event.event_data.address === from_account) {
  //         event.event_data.event_type = 'sent'
  //       }
  //       if (event.event_data.address === to_account) {
  //         event.event_data.event_type = 'received'
  //       }
  //     })
  //   })

  //   return transactions
  // }
}

module.exports = Query
