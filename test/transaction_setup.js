const Transaction = require('../src/transaction.js');
const Coin = require('../src/coin.js');

const http = require('http');
const crypto = require('crypto');

// Set up Keys
// const ecc_curve = 'secp256k1';
// const bob = crypto.createECDH(ecc_curve);
// bob.generateKeys();
// var prvhex = bob.getPrivateKey().toString('hex');
// var pubhex = bob.getPublicKey().toString('hex');
var prvhex = 'e2e591bbd57568cd3977e76651c673c8ac2ca65335a69c238deeb8590df70788';
var pubhex = '045226d48ff35325c57256dbad6f4f04d75ba133136de3b6d0190e9820e4a6319d934ed3d9ace5265785c3b8c9a73f3969c293d3aeaacf78950c8970388621e4ad';

console.log('Private Key: ' + prvhex);
console.log('Public Key: ' + pubhex);
// End keys

var coin = Coin.createCoin("1-0", 500, pubhex, 1);
var transaction = Transaction.createTransaction(Transaction.TransactionType.COIN_CREATION, 1, [pubhex], new Array(), [coin], 500, [prvhex]);
console.log(JSON.stringify(transaction));
var options = {
  hostname: 'localhost',
  port: 8082,
  path: '/addTransaction',
  method: 'POST',
  headers: {
      'Content-Type': 'application/json',
  }
};
var req = http.request(options, function(res) {
  console.log('Status: ' + res.statusCode);
  console.log('Headers: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', function (body) {
    console.log('Body: ' + body);
  });
});
req.on('error', function(e) {
  console.log('problem with request: ' + e.message);
});
req.write( JSON.stringify({ data : transaction} ) );
req.end();
