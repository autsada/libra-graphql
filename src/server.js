const { GraphQLServer } = require('graphql-yoga')

const resolvers = require('./resolvers')
const GrpcClient = require('./grpcClient/grpcClient')

const libra = new GrpcClient()

const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
  resolverValidationOptions: {
    requireResolversForResolveType: false
  },
  context: req => ({ ...req, libra })
})

module.exports = server
