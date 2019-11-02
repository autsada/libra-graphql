const { withFilter } = require('graphql-yoga')

const Subscription = {
  receivedCoins: {
    subscribe: withFilter(
      (parent, args, { libra, pubsub }, info) =>
        pubsub.asyncIterator('TRANSFERED'),
      (payload, { receiverAddress }) => {
        return (
          payload.receivedCoins.transaction.transaction.to_account ===
          receiverAddress
        )
      }
    )
  }
}

module.exports = Subscription
