const bigInt = require('big-integer')
const { Uint64LE } = require('int64-buffer')
const toBuffer = require('any-to-buffer')
const BufferMaker = require('buffermaker')

const serializeBoolean = bool => toBuffer(bool)

// const serializeU16 = num => {
//   const u16Buffer = Buffer.from(
//     Number(num)
//       .toString(4)
//       .padStart(4, '0')
//       .slice(0, 4),
//     'hex'
//   )
//   u16Buffer.reverse()
//   // const buf = Buffer.allocUnsafe(4)
//   // buf.writeUInt16LE(num)
//   return u16Buffer
// }

const serializeU32 = num => new BufferMaker().UInt32LE(num).make()

const serializeU64 = num => {
  // const u64Buffer = Buffer.from(
  //   Number(num)
  //     .toString(16)
  //     .padStart(16, '0')
  //     .slice(0, 16),
  //   'hex'
  // )
  // u64Buffer.reverse()
  const u64 = Number(bigInt(num))
  const writeU64 = new Uint64LE(u64)
  const buffer = writeU64.toBuffer()

  return buffer
}

const serializeString = (str, encode = 'hex') => {
  const strBuffer = Buffer.from(str, encode)
  const bufferLen = strBuffer.length
  const prefix = serializeU32(bufferLen)

  return Buffer.concat([prefix, strBuffer])
}

const serializeAddress = (str, encode = 'hex') => Buffer.from(str, encode)

// Serialization for transaction arguments
const serializeArgU64 = int64 => {
  const order = serializeU32(0)
  const u64Buffer = serializeU64(int64)

  return Buffer.concat([order, u64Buffer])
}

const serializeArgAddress = address => {
  const order = serializeU32(1)
  // const addressBuffer = serializeString(address)
  const addressBuffer = serializeAddress(address)

  return Buffer.concat([order, addressBuffer])
}

const serializeArgString = str => {
  const order = serializeU32(2)
  const strBuffer = serializeString(str, 'utf8')

  return Buffer.concat([order, strBuffer])
}

const serializeArgByteArray = byteArr => {
  const order = serializeU32(3)
  const byteArrayBuffer = serializeString(byteArr)

  return Buffer.concat([order, byteArrayBuffer])
}

// Serialization for modules
const serializeModules = modules => {
  const allBytesArray = []
  const modulesBytesLen = serializeU32(modules.length)

  allBytesArray.push(modulesBytesLen)

  if (modules.length > 0) {
    for (let i = 0; i < modules.length; i++) {
      for (let j = 0; j < modules[i].length; j++) {
        const buff = serializeString(modules[i][j])
        allBytesArray.push(buff)
      }
    }
  }

  return Buffer.concat(allBytesArray)
}

module.exports = {
  serializeBoolean,
  serializeU32,
  serializeU64,
  serializeString,
  serializeAddress,
  serializeArgU64,
  serializeArgAddress,
  serializeArgString,
  serializeArgByteArray,
  serializeModules
}
