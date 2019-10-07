class AccountState {
  constructor(ledger) {
    this.response_items = ledger.responsedItems
    this.validator_change_events = ledger.validator_change_events
    this.ledger_info_with_sigs = ledger.ledgerInfoWithSigs
  }
}

module.exports = AccountState
