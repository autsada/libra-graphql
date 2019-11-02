require('dotenv').config({ path: 'config/dev.env' })
const server = require('./server')

console.log(process.env.NODE_ENV)

server.start(
  {
    port: process.env.PORT
    // subscriptions: {
    //   path: 'wss://libra-graphql.herokuapp.com/'
    // }
  },
  deets => {
    console.log(`Server is now running on port http://localhost:${deets.port}`)
  }
)
