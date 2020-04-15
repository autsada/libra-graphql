const path = require('path')
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const axios = require('axios')
const toBuffer = require('typedarray-to-buffer')

const protoPath = path.join(__dirname, './', 'proto/admission_control.proto')

class GrpcClient {
  constructor() {
    this.packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    })

    this.testnet = grpc.loadPackageDefinition(
      this.packageDefinition
    ).admission_control

    this.client = new this.testnet.AdmissionControl(
      'ac.testnet.libra.org:8000',
      grpc.credentials.createInsecure()
    )

    this.faucet = 'http://faucet.testnet.libra.org'
  }

  createGetAccountStateRequest(address) {
    return {
      get_account_state_request: {
        address: Uint8Array.from(Buffer.from(address, 'hex')),
      },
    }
  }

  createGetAccountTransactionBySequenceNumberRequest({
    address,
    sequenceNumber,
    fetchEvents = true,
  }) {
    return {
      get_account_transaction_by_sequence_number_request: {
        account: Uint8Array.from(Buffer.from(address, 'hex')),
        sequence_number: sequenceNumber,
        fetch_events: fetchEvents,
      },
    }
  }

  createGetEventsByEventAccessPathRequest({
    accessPath,
    // sequenceNumber = 2 ** (64 - 1),
    sequenceNumber = 0,
    ascending = true,
    limit = 100,
  }) {
    const request = {
      get_events_by_event_access_path_request: {
        access_path: {
          address: Uint8Array.from(Buffer.from(accessPath.address, 'hex')),
          path: Uint8Array.from(
            Buffer.concat([
              Buffer.from(accessPath.path, 'hex'),
              Buffer.from(accessPath.eventType),
            ])
          ),
        },
        start_event_seq_num: sequenceNumber,
        ascending,
        limit,
      },
    }

    return request
  }

  createGetTransactionRequest({ startVersion, limit, fetchEvents = true }) {
    return {
      get_transactions_request: {
        start_version: startVersion,
        limit,
        fetch_events: fetchEvents,
      },
    }
  }

  createRequestItem(requestedItem) {
    return { ...requestedItem }
  }

  createUpdateToLatestLedgerRequest(version, requestedItem) {
    return {
      client_known_version: version,
      requested_items: [requestedItem],
    }
  }

  queryAccountByAddress({ accountAddress }) {
    const address = this.createGetAccountStateRequest(accountAddress)
    const requestItem = this.createRequestItem(address)
    const updateToLatestLedgerRequest = this.createUpdateToLatestLedgerRequest(
      0,
      requestItem
    )

    const ledger = this.ledgerRequest(updateToLatestLedgerRequest)

    return ledger
  }

  queryAccountBySequenceNumber({ accountAddress, sequenceNumber }) {
    const sequenceNumberRequest = this.createGetAccountTransactionBySequenceNumberRequest(
      {
        address: accountAddress,
        sequenceNumber,
      }
    )
    const requestItem = this.createRequestItem(sequenceNumberRequest)
    const updateToLatestLedgerRequest = this.createUpdateToLatestLedgerRequest(
      0,
      requestItem
    )

    return this.ledgerRequest(updateToLatestLedgerRequest)
  }

  queryEventsByAccessPath({ accessPath }) {
    const request = this.createGetEventsByEventAccessPathRequest({
      accessPath,
    })
    const requestItem = this.createRequestItem(request)

    const updateToLatestLedgerRequest = this.createUpdateToLatestLedgerRequest(
      0,
      requestItem
    )

    return this.ledgerRequest(updateToLatestLedgerRequest)
  }

  queryOneTransaction(version) {
    const request = this.createGetTransactionRequest({
      limit: 1,
      startVersion: version,
    })
    const requestItem = this.createRequestItem(request)

    const updateToLatestLedgerRequest = this.createUpdateToLatestLedgerRequest(
      version,
      requestItem
    )

    return this.ledgerRequest(updateToLatestLedgerRequest)
  }

  queryTransactions() {
    const request = this.createGetTransactionRequest({
      limit: 50,
      startVersion: 0,
      fetch_events: true,
    })
    const requestItem = this.createRequestItem(request)

    const updateToLatestLedgerRequest = this.createUpdateToLatestLedgerRequest(
      0,
      requestItem
    )

    return this.ledgerRequest(updateToLatestLedgerRequest)
  }

  waitForMintConfirmation(address) {
    return new Promise((resolve, reject) => {
      let callCount = 0

      const query = setInterval(() => {
        callCount++

        this.queryAccountByAddress({
          accountAddress: address,
        }).then((res) => {
          if (res) {
            clearInterval(query)
            resolve(res)
          }
        })

        if (callCount > 60) {
          clearInterval(query)
          reject('Please try querying again.')
        }
      }, 1000)
    })
  }

  async mintCoins({ amount, address, authKey }) {
    try {
      // const url = `${this.faucet}?amount=${amount}&address=${address}`
      const url = `${this.faucet}?amount=${amount}&auth_key=${authKey}`
      const response = await axios({
        method: 'post',
        url,
      })

      if (response && response.status === 200) {
        return this.waitForMintConfirmation(address)
      }
    } catch (error) {
      throw new Error(error)
    }
  }

  createSubmitTransactionRequest(signedTxn) {
    const submitTxnRequest = { transaction: signedTxn }

    return submitTxnRequest
  }

  waitForTxnConfirmation({ address, sequenceNumber }) {
    return new Promise((resolve, reject) => {
      let callCount = 0

      const query = setInterval(() => {
        callCount++

        this.queryAccountBySequenceNumber({
          accountAddress: address,
          sequenceNumber: sequenceNumber,
        }).then((res) => {
          if (
            res.response_items[0]
              .get_account_transaction_by_sequence_number_response
              .transaction_with_proof
          ) {
            const {
              transaction: { transaction },
            } = res.response_items[0].get_account_transaction_by_sequence_number_response.transaction_with_proof
            if (transaction) {
              clearInterval(query)
              resolve(res)
            }
          }
        })

        if (callCount > 60) {
          clearInterval(query)
          reject('Transfer coins failed, please try again later.')
        }
      }, 1000)
    })
  }

  async transferMoney({ signedTxn, address, sequenceNumber }) {
    const request = this.createSubmitTransactionRequest(signedTxn)

    console.log('Signed Txn -->', toBuffer(signedTxn.txn_bytes).toString('hex'))

    const response = await this.submitTransaction(request)

    const { ac_status, vm_status, mempool_status } = response

    if (ac_status) {
      if (ac_status.code !== 'Accepted') {
        throw new Error('Transfer failed. Please try again later')
      }
      return this.waitForTxnConfirmation({
        address,
        sequenceNumber,
      })
    }

    if (vm_status) {
      if (vm_status.major_status !== '3') {
        throw new Error('Transfer failed. Please try again later')
      }
      return this.waitForTxnConfirmation({
        address,
        sequenceNumber,
      })
    }
  }

  submitTransaction(txnRequest) {
    return new Promise((resolve, reject) => {
      this.client.SubmitTransaction(txnRequest, (err, res) => {
        if (!err) {
          // console.log('Res -->', res)
          resolve(res)
        }
        // console.log('Error -->', err)
        reject(err)
      })
    })
  }

  ledgerRequest(request) {
    return new Promise((resolve, reject) => {
      this.client.UpdateToLatestLedger(request, (err, res) => {
        if (!err) {
          // console.log(
          //   'Res -->',
          //   res.response_items[0].get_account_state_response
          //     .account_state_with_proof
          // )
          resolve(res)
        } else {
          // console.log('Err -->', err)
          reject(err)
        }
      })
    })
  }
}

module.exports = GrpcClient
