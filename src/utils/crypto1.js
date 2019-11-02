require('dotenv').config({ path: '../../config/dev.env' })
const nacl = require('tweetnacl')
const { sha3_256, sha3_512 } = require('js-sha3')
const toBuffer = require('typedarray-to-buffer')
const bip39 = require('bip39')

const { salt } = require('../utils/salt')

// Generate address and mnemonic
const generateAccount = () => {
  const mnemonic = bip39.generateMnemonic()
  const mnemonicBytes = Buffer.from(mnemonic)
  const saltBefore = Buffer.from(process.env.SALT_BEFORE, 'hex')
  const saltAfter = Buffer.from(process.env.SALT_AFTER, 'hex')
  const hashedMnemonic = sha3_512
    .update(saltBefore)
    .update(mnemonicBytes)
    .update(saltAfter)
    .digest()

  const keyPair = nacl.sign.keyPair.fromSecretKey(
    Uint8Array.from(hashedMnemonic)
  )

  const publicKey = toBuffer(keyPair.publicKey).toString('hex')
  // const secretKey = toBuffer(keyPair.secretKey).toString('hex')

  const address = sha3_256.update(keyPair.publicKey).hex()

  return {
    address,
    publicKey,
    mnemonic
  }
}

// From mnemonic to private key
const generateKeyPair = mnemonic => {
  const mnemonicBytes = Buffer.from(mnemonic)
  const saltBefore = Buffer.from(process.env.SALT_BEFORE, 'hex')
  const saltAfter = Buffer.from(process.env.SALT_AFTER, 'hex')
  const hashedMnemonic = sha3_512
    .update(saltBefore)
    .update(mnemonicBytes)
    .update(saltAfter)
    .digest()

  const keyPair = nacl.sign.keyPair.fromSecretKey(
    Uint8Array.from(hashedMnemonic)
  )

  return keyPair
}

// Sign message
const sign = ({ message, mnemonic }) => {
  const keyPair = generateKeyPair(mnemonic)

  const saltBytes = Buffer.from(salt, 'hex')
  const hash = sha3_256
    .update(saltBytes)
    .update(message)
    .digest()

  const publicKey = keyPair.publicKey

  const signature = nacl.sign.detached(Uint8Array.from(hash), keyPair.secretKey)

  return {
    publicKey,
    signature
  }
}

generateKeyPair(
  'action salon often exist luxury fat ticket either rotate call move cup'
)

module.exports = { sign, generateAccount }

// 'slogan wine mass share vibrant leopard velvet mechanic about eagle core ice'
// const private =
//   '251de469df2677194f6bdea8bdb7fc6e5cfcea145a9a061fbe10946782b8c426b2c97d56043f6c1b4954ab27069b9b7d10476fce23bb105331941ceed5bb3efb'
// const address = '9826f4742af5b728c9339c64ff7aa1227bb4562fd0225a00e8e289703f3b9a67'

// 'blast between siege void visual elite gun timber awful work end hole'
// 'f7ca4ea77876caa5ab8855564e08129dc5a5cd555b09c83921f9661fa9d87785'

// "createAccount": {
//   "publicKey": "5d250d2b761f45b03e53640e5699c504ea49f6d363d1aad17615d14f67097299",
//   "address": "1326007c9ba867a9ac8526bf39292cd8dfe865d9f75ce8b6c57feffa635aed28",
//   "mnemonic": "prepare cannon antique lava play bar item width artwork sister blast execute"
// }

// 'c03e28256043b52f88e7436b4b314a1952bd63d0fe2f377c886ecbdd6b98e5fa5d250d2b761f45b03e53640e5699c504ea49f6d363d1aad17615d14f67097299'

// "createAccount": {
//   "address": "17405d1822bbe4dc63d41fb3ba39ab525cab44072b7671add1e868e6d1bcda80",
//   "secretKey": "192440199fdf1dcff628e0234eb2eb38381316e54f4bf30813aab7e9f32ef1b8e2f5edf00e7ff8ff34b2f252c0384f77285faa085dda63c8c68abcac863504c4"
// }

// ----------------------
// secret = 'dfca43d4d6662d15f710b3a3410a70d11b1c20565bad9e7fcbdac171b55c678501b899d7549b761e61d6c33b1fdead77661a4d35c72ce47a48aad25a065bc707'

// "createAccount": {
//   "publicKey": "01b899d7549b761e61d6c33b1fdead77661a4d35c72ce47a48aad25a065bc707",
//   "address": "a5c07a3109c13554e173fbe23222cccacccfc522c757368eaf297519c698f25c",
//   "mnemonic": "canoe layer warfare thunder all glare maze loud inherit oak defense differ"
// }

//signature
// '69db6919a5bf339d4e15c5c60113f6166325f0d06a7a59540c9ebfca724673092f903576918f658f9e3cba6e1eedb9d4224021ffcd74e2763c7b43c113faa209'

//'c0e1d30a7ec95922c1c963e52ef44e5c66e21bf4b1cc78a9a911f36cf23e2a8ef8907257e9b77d4b6904fb911b5e9843d11d1167c52c03fec298871fd9892c05'

// receiver address 'f824b6683fc861891eca082701e133713eac68c7c9d939ff6723876715a7728a'

// '5e41150d4c33091487ed81e920729b70db2db633d1731b1fd15389477da08dc27c6f7f507cafae683fa063f54a993ddf8d5816c41c619129d8a798e76ba97cf3'

// '80ec77965072d52b863bd7d231b861aa1ad4f93292b15be176202b43a3832d9e000000000000000002000000b80000004c49425241564d0a010007014a00000004000000034e000000060000000d54000000060000000e5a0000000600000005600000002900000004890000002000000008a90000000f00000000000001000200010300020002040200030204020300063c53454c463e0c4c696272614163636f756e74046d61696e0f7061795f66726f6d5f73656e6465720000000000000000000000000000000000000000000000000000000000000000000100020004000c000c01130101020200000001000000f824b6683fc861891eca082701e133713eac68c7c9d939ff6723876715a7728a0000000000e1f50500000000a08601000000000000000000000000008d48bc5d00000000200000007c6f7f507cafae683fa063f54a993ddf8d5816c41c619129d8a798e76ba97cf3400000005f00e794ca1778cacd497f14c5c46b760f1f3dc6d8d0bcf2a595e4ffd857fcf2302c76778c3e259cd0533eeaa892128f26c6facaaec39b410c58ef035d78dd0b'

// '80ec77965072d52b863bd7d231b861aa1ad4f93292b15be176202b43a3832d9e000000000000000002000000b80000004c49425241564d0a010007014a00000004000000034e000000060000000d54000000060000000e5a0000000600000005600000002900000004890000002000000008a90000000f00000000000001000200010300020002040200030204020300063c53454c463e0c4c696272614163636f756e74046d61696e0f7061795f66726f6d5f73656e6465720000000000000000000000000000000000000000000000000000000000000000000100020004000c000c01130101020200000001000000f824b6683fc861891eca082701e133713eac68c7c9d939ff6723876715a7728a0000000000e1f50500000000a0860100000000000000000000000000ed49bc5d00000000200000007c6f7f507cafae683fa063f54a993ddf8d5816c41c619129d8a798e76ba97cf3400000003a380bc280a1fcac3c9ee80ccddbd4bea88e35c04d5dfa798ae552121f7feae2c30e44d89a51484dd2c6cc7ae9cc0633753c5e8f1c89142f2d2753781edf2f0e'
