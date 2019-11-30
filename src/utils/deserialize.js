const { SmartBuffer } = require("smart-buffer")

const decodeBlob = blob => {
  const blobReader = SmartBuffer.fromBuffer(blob)
  const state = {}
  state.pathCount = blobReader.readUInt32LE()
  state.pathLen = blobReader.readUInt32LE()
  state.path = blobReader.readString(state.pathLen, "hex")

  if (state.pathCount > 1) {
    for (let i = 1; i < state.pathCount; i++) {
      state.addedValueLen = blobReader.readUInt32LE()
      state.addedValueLen1 = blobReader.readUInt32LE()
      state.addedValueLen2 = blobReader.readUInt32LE()
      state.addedPathLen = blobReader.readUInt32LE()
      state.addedPath = blobReader.readString(state.addedPathLen, "hex")
    }
  }

  state.valueLen = blobReader.readUInt32LE()
  state.authLen = blobReader.readUInt32LE()
  const authentication_key = blobReader.readString(state.authLen, "hex")
  const balance = Number(blobReader.readBigUInt64LE()).toString()
  const delegated_key_rotation_capability =
    Number(blobReader.readUInt8()) === 1 ? true : false
  const delegated_withdrawal_capability =
    Number(blobReader.readUInt8()) === 1 ? true : false
  const received_events_count = Number(blobReader.readBigUInt64LE())
  const receiveEventKeyLen = Number(blobReader.readUInt32LE())
  const receiveEventKey = blobReader.readString(receiveEventKeyLen, "hex")
  const sent_events_count = Number(blobReader.readBigUInt64LE())
  const sendEventKeyLen = Number(blobReader.readUInt32LE())
  const sendEventKey = blobReader.readString(sendEventKeyLen, "hex")
  const sequence_number = Number(blobReader.readBigUInt64LE())

  state.value = {
    authentication_key,
    balance,
    delegated_key_rotation_capability,
    delegated_withdrawal_capability,
    received_events_count,
    // receiveEventKeyLen,
    receiveEventKey,
    sent_events_count,
    // sendEventKeyLen,
    sendEventKey,
    sequence_number
  }
  const blobState = {
    blob: { ...state.value }
  }

  return blobState
}

const decodeSignedTxn = signedTxnBytes => {
  const signedTxnReader = SmartBuffer.fromBuffer(signedTxnBytes)
  const senderAddressLen = signedTxnReader.readUInt32LE()
  const senderAddress = signedTxnReader.readString(32, "hex")
  const sequence_number = Number(signedTxnReader.readBigUInt64LE())
  const payloadType = signedTxnReader.readUInt32LE()
  const codeLen = signedTxnReader.readUInt32LE()
  const code = signedTxnReader.readString(codeLen, "hex")
  const argsLen = signedTxnReader.readUInt32LE()
  const argAddress = signedTxnReader.readUInt32LE()
  const receiverAddress = signedTxnReader.readString(32, "hex")
  const argAmount = signedTxnReader.readUInt32LE()
  const amount = Number(signedTxnReader.readBigUInt64LE()).toString()
  const max_gas_amount = Number(signedTxnReader.readBigUInt64LE())
  const gas_unit_price = Number(signedTxnReader.readBigUInt64LE())

  if (payloadType === 0) {
    const addedRead = signedTxnReader.readUInt32LE()
  }

  const expiration_time = Number(signedTxnReader.readBigUInt64LE()).toString()

  const senderPubKeyLen = signedTxnReader.readUInt32LE()
  const sender_public_key = signedTxnReader.readString(senderPubKeyLen, "hex")
  const signatureLen = signedTxnReader.readUInt32LE()
  const signature = signedTxnReader.readString(signatureLen, "hex")

  const signedTxn = {
    sequence_number,
    from_account: senderAddress,
    to_account: receiverAddress,
    amount,
    max_gas_amount,
    gas_unit_price,
    expiration_time,
    sender_public_key,
    signature
  }

  return signedTxn
}

const decodeTxnInfos = infos => {
  const {
    transaction_hash,
    state_root_hash,
    event_root_hash,
    gas_used,
    major_status
  } = infos

  const signedHashReader = SmartBuffer.fromBuffer(transaction_hash)
  const stateRootHashReader = SmartBuffer.fromBuffer(state_root_hash)
  const eventRootHashReader = SmartBuffer.fromBuffer(event_root_hash)

  return {
    transaction_hash: signedHashReader.readString("hex"),
    state_root_hash: stateRootHashReader.readString("hex"),
    event_root_hash: eventRootHashReader.readString("hex"),
    gas_used: +gas_used,
    major_status
  }
}

const decodeProof = proof => {
  const {
    ledger_info_to_transaction_info_proof: { siblings },
    transaction_info,
    transaction_info_to_account_proof
  } = proof

  if (!transaction_info_to_account_proof) {
    return {
      ledger_info_to_transaction_info_proof: {
        siblings: siblings.map(item => item.toString("hex"))
      },
      transaction_info: decodeTxnInfos(transaction_info)
    }
  }

  return {
    ledger_info_to_transaction_info_proof: {
      siblings: siblings.map(item => item.toString("hex"))
    },
    transaction_info: decodeTxnInfos(transaction_info),
    transaction_info_to_account_proof: {
      siblings: transaction_info_to_account_proof.siblings.map(item =>
        item.toString("hex")
      ),
      leaf: transaction_info_to_account_proof.leaf.toString("hex")
    }
  }
}

const decodeEventData = eventData => {
  const eventReader = SmartBuffer.fromBuffer(eventData)
  const amount = Number(eventReader.readBigInt64LE()).toString()
  const address = eventReader.readString(32, "hex")

  return {
    amount,
    address
  }
}

// const decodeTypeTag = typeTag => {
//   const typeTagReader = SmartBuffer.fromBuffer(typeTag)
//   const amount = typeTagReader.readUInt32LE()

//   const addressLen = typeTagReader.readString(32, 'hex')

//   const amount1 = typeTagReader.readUInt32LE()
//   // console.log('Amount -->', amount1)
//   const address = typeTagReader.readString(32, 'hex')
//   console.log('Address -->', address)

//   // return {
//   //   amount,
//   //   address
//   // }
// }

const decodeEvent = event => {
  const { key, sequence_number, event_data, type_tag } = event

  return {
    key: key.toString("hex"),
    sequence_number: +sequence_number,
    event_data: decodeEventData(event_data)
  }
}

const decodeEvents = events => {
  const eventsDetails = events.map(event => {
    const { transaction_version, event_index, proof } = event

    const eventDetail = {
      transaction_version: +transaction_version,
      event_index: +event_index,
      event: decodeEvent(event.event),
      proof: decodeProof(proof)
    }

    return eventDetail
  })

  return eventsDetails
}

const decodeLedger = ledger => {
  const {
    response_items,
    validator_change_events,
    ledger_info_with_sigs
  } = ledger

  let responsedItems

  // Case of AccountStateRequest
  if (response_items[0].response_items === "get_account_state_response") {
    const {
      version,
      blob,
      proof
    } = response_items[0].get_account_state_response.account_state_with_proof

    // Deserialize account state
    responsedItems = [
      {
        get_account_state_response: {
          account_state_with_proof: {
            version: +version,
            blob: blob ? decodeBlob(blob && blob.blob) : null,
            proof: decodeProof(proof)
          }
        },
        response_items: response_items[0].response_items
      }
    ]
  }

  // Case of SequenceNumberRequest
  if (
    response_items[0].response_items ===
    "get_account_transaction_by_sequence_number_response"
  ) {
    const {
      transaction_with_proof,
      proof_of_current_sequence_number
    } = response_items[0].get_account_transaction_by_sequence_number_response

    // Got signed_transaction_with_proof
    if (transaction_with_proof) {
      const {
        version,
        transaction: { transaction },
        proof,
        events
      } = transaction_with_proof

      // Deserialize signed txn with proof
      responsedItems = [
        {
          get_account_transaction_by_sequence_number_response: {
            transaction_with_proof: {
              version: +version,
              transaction: { transaction: decodeSignedTxn(transaction) },
              proof: decodeProof(proof),
              events: {
                events: events.events.map(event => decodeEvent(event))
              }
            }
          },
          response_items: response_items[0].response_items
        }
      ]
    }

    // Got proof_of_current_sequence_number
    if (proof_of_current_sequence_number) {
      const { version, blob, proof } = proof_of_current_sequence_number

      responsedItems = [
        {
          get_account_transaction_by_sequence_number_response: {
            proof_of_current_sequence_number: {
              version: +version,
              blob: blob ? decodeBlob(blob && blob.blob) : null,
              proof: decodeProof(proof)
            }
          },
          response_items: response_items[0].response_items
        }
      ]
    }
  }

  // Case of EventAccessPathREquest
  if (
    response_items[0].response_items ===
    "get_events_by_event_access_path_response"
  ) {
    const {
      events_with_proof,
      proof_of_latest_event: { version, blob, proof }
    } = response_items[0].get_events_by_event_access_path_response

    responsedItems = [
      {
        get_events_by_event_access_path_response: {
          events_with_proof: decodeEvents(events_with_proof).reverse(),
          proof_of_latest_event: {
            version: +version,
            blob: blob ? decodeBlob(blob && blob.blob) : null,
            proof: decodeProof(proof)
          }
        },
        response_items: response_items[0].response_items
      }
    ]
  }

  // Case of TransactionsRequest
  if (response_items[0].response_items == "get_transactions_response") {
    const {
      transactions,
      events_for_versions: { events_for_version },
      first_transaction_version: { value },
      proof: { transaction_infos, ledger_info_to_transaction_info_proof }
    } = response_items[0].get_transactions_response.txn_list_with_proof

    // transactions.reverse()
    const last50Txn = transactions.slice(0, 20)

    responsedItems = [
      {
        get_transactions_response: {
          txn_list_with_proof: {
            transactions: last50Txn.map(transaction => {
              return { signed_txn: decodeSignedTxn(transaction.signed_txn) }
            }),
            infos: infos.map(info => decodeTxnInfos(info)),
            events_for_versions: {
              events_for_version: events_for_version.map(item => {
                return {
                  events: item.events.map(event => decodeEvent(event))
                }
              })
            },
            first_transaction_version: { value: +value },
            proof_of_first_transaction: {
              non_default_siblings: non_default_siblings.map(i =>
                i.toString("hex")
              ),
              bitmap: bitmap
            },
            proof_of_last_transaction
          }
        },
        response_items: response_items[0].response_items
      }
    ]
  }

  const {
    signatures,
    ledger_info: {
      version,
      transaction_accumulator_hash,
      consensus_data_hash,
      consensus_block_id,
      epoch_num,
      timestamp_usecs
    }
  } = ledger_info_with_sigs

  const ledgerInfoWithSigs = {
    signatures: signatures.map(item => {
      return {
        validator_id: item.validator_id.toString("hex"),
        signature: item.signature.toString("hex")
      }
    }),
    ledger_info: {
      version: +version,
      transaction_accumulator_hash: transaction_accumulator_hash.toString(
        "hex"
      ),
      consensus_data_hash: consensus_data_hash.toString("hex"),
      consensus_block_id: consensus_block_id.toString("hex"),
      epoch_num,
      timestamp_usecs
    }
  }

  // Return decoded ledger
  return {
    responsedItems,
    validator_change_events,
    ledgerInfoWithSigs
  }
}

module.exports = {
  decodeLedger,
  decodeEvent,
  decodeEvents,
  decodeBlob,
  decodeSignedTxn
}
