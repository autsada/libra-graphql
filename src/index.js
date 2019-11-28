require("dotenv").config({ path: "config/dev.env" })
const server = require("./server")

server.start(
  {
    port: process.env.PORT
  },
  deets => {
    console.log(`Server is now running on port http://localhost:${deets.port}`)
  }
)
