const { GraphQLServer, PubSub } = require('graphql-yoga')

const resolvers = require('./resolvers')
const GrpcClient = require('./grpcClient/grpcClient')

const libra = new GrpcClient()
const pubsub = new PubSub()

const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
  resolverValidationOptions: {
    requireResolversForResolveType: false
  },
  context: req => ({ ...req, libra, pubsub })
})

module.exports = server
