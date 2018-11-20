const FIBOS = require('fibos.js')
const http = require('http')
const config = require('./config.json');

const httpClient = new http.Client()

const producer = {
  'private-key': config.wif, //private key
  'account': config.producerName,
}

const fibos = FIBOS({
  chainId: '6aa7bd33b6b45192465afa3553dedb531acaaff8928cf64b70bd4c5e49b7ec6a',
  keyProvider: producer['private-key'],
  httpEndpoint: 'http://api.fibos.rocks',
  verbose: false,
  logger: {
    log: null,
    error: null
  }
})

const getRewards = (account) => {
  return new Promise((resolve, reject) => {
    console.log(`-------- Try claimRewards ---------`)
    let res = fibos.claimrewardsSync(account)
    console.log(res)
    try {
      console.log(`-------- claimRewards ---------`)
      let balance = 0 // total rewards
      let inline_traces = res.processed.action_traces[0].inline_traces
      let inline_traces_length = inline_traces.length

      let payObj = inline_traces[inline_traces_length -1]
      let payActData =  payObj && payObj.act && payObj.act.data || null
      let pay = +((payActData.quantity || '0 FO').replace(' FO', ''))


      if (payActData.to === account) {
        balance = balance + pay
      }

      let payObj2 = inline_traces[inline_traces_length -2]
      let payActData2 =  payObj2 && payObj2.act && payObj2.act.data || null
      let pay2 = +((payActData2.quantity || 0).replace(' FO', ''))

      if (payActData2.to === account) {
        balance = balance + pay2
      }

      return resolve(balance)

    } catch (error) {
      console.log(error)
      return reject(error)
    }
  })
}

const transferFO = (from, to, amount, memo = '') => {
  var account = from
  var value = amount.toFixed(4) + ' FO@eosio'
  var ctx = fibos.contractSync('eosio.token')

  var result = ctx.transferSync(account, to, value, memo)
  if (result && result.broadcast) {
    console.log(`${to} got ${value}`)
  } else {
    console.error('Transfer Failed')
  }
}

const queryBalance = (account) => {
  return new Promise((resolve, reject) => {
    let rs = fibos.getTableRowsSync(true, 'eosio.token', account, 'accounts')
    let rows = rs.rows
    if (rows) {
      let balanceStr = rows[0] && rows[0].balance && rows[0].balance.quantity || '0 FO'
      let balance = +(balanceStr.replace(' FO', ''))
      console.log(balance)
      return resolve(balance)
    }
    return resolve(0)
  })
}

const calculate = (balance, account, isTransfer) => {

  const res = httpClient.get(`http://explorer.fibos.rocks/api/voter?producer=${account}`).readAll().toString()
  let stackArr = JSON.parse(res)
  let amount = stackArr.reduce((prew, current) => (prew + (current.staked / 10000)), 0)

  const res2 = httpClient.get(`http://explorer.fibos.rocks/api/voter?producer=${account}&page=1`).readAll().toString()
  let stackArr2 = JSON.parse(res2)
  amount2 = stackArr2.reduce((prew, current) => (prew + (current.staked / 10000)), 0)

  const res3 = httpClient.get(`http://explorer.fibos.rocks/api/voter?producer=${account}&page=2`).readAll().toString()
  let stackArr3 = JSON.parse(res3)
  amount3 = stackArr3.reduce((prew, current) => (prew + (current.staked / 10000)), 0)

  // TODO add more if over 3 pages

  amount = amount + amount2 + amount3

  console.log(amount)

  let fuckMoney = 0
  const fukcers = ['huobipool123', 'fibosfeijiaa', 'masterbyteso'] // reward list
  //const fukcers = ['hoffercqtest']
  const percent = 0.6 // percentage

  stackArr.map(user => {
    if (fukcers.includes(user.owner)) {
      let quant = user.staked / amount / 10000 * percent * balance // reward for voter
      fuckMoney = fuckMoney + quant
      console.log(`${user.owner} will get ${quant.toFixed(4)}`)
      isTransfer && transferFO(account, user.owner, quant, 'Thanks for supporting bitze!')
    }
  })

  stackArr2.map(user => {
    if (fukcers.includes(user.owner)) {
      let quant = user.staked / amount / 10000 * percent * balance // reward for voter
      fuckMoney = fuckMoney + quant
      console.log(`${user.owner} will get ${quant.toFixed(4)}`)
      isTransfer && transferFO(account, user.owner, quant, 'Thanks for supporting bitze!')
    }
  })

  const myOtherAccount = 'bitzefibosbp' // TODO Transfer left to my account
  let salary = (balance - fuckMoney)
  console.log(`I get ${salary} FO`)

  isTransfer && transferFO(account, myOtherAccount, salary-1, 'Thanks for supporting bitze!')
}

console.log('\n\n')
console.log(`--------${new Date().toLocaleString()}---------`)


async function run() {

  let account = producer.account
  let balance = await getRewards(account) // getRewards, or await queryBalance(account) this will calculate from account balance
  console.log(`${account} total reward is ${balance} F0`)
  return calculate(balance, account, true) // true - calculate and transfer
}

run()

//try every 10 min
setInterval(run, 10 * 60 * 1000 + 5000);

