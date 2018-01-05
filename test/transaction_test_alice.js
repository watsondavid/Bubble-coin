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

var alice_prvhex = '310d85aaf8b2af6650a407871cdc0970e6165c59f154f6b4ccd8ef735cb46dbd';
var alice_pubhex = '0456efb0b80fb76194682a6af72338bbadd0f327e52615602f61dd691ac18ef8baf0133d27ff7e8e4a1e4b4881e7acfffaa47475231fb5f9dd14b4f5ad9ea5462e';

console.log('Private Key: ' + prvhex);
console.log('Public Key: ' + pubhex);
// End keys

//var coin = Coin.createCoin("2-0", 300, alice_pubhex, 2);
//var transaction = Transaction.createTransaction(Transaction.TransactionType.COIN_CREATION, 'public key :)', [], [coin], 500, 'private ley :)');
var newCoin1 = Coin.createCoin("3-0", 5, pubhex, 3);
var newCoin2 = Coin.createCoin("3-1", 295, alice_pubhex, 3);

//var transaction = Transaction.generateValidTransaction(Transaction.TransactionType.TRANSACTION, alice_pubhex, [coin], [newCoin1, newCoin2], 300, alice_prvhex);

var options_chain = {
  hostname: 'localhost',
  port: 8082,
  path: '/allblocks',
  method: 'GET'
};
var req = http.request(options_chain, function(res) {
  console.log('Status: ' + res.statusCode);
  console.log('Headers: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', function (body) {
    console.log('Body: ' + body);

	  var blockchain = JSON.parse(body);
	  // find our coin
	  var found = false;
	  var coin = {};
	  for(i=blockchain.length-1; i >= 0 && !found; i--) {
		  if( blockchain[i].data.newCoins ) {
			  for(j=0; j<blockchain[i].data.newCoins.length && !found; j++) {
				  var coin_ = blockchain[i].data.newCoins[j];
				  if(coin_.ownerPublicKey == alice_pubhex) {
					  coin = coin_;
					  found = true;
				  }
			  }
	  	  }
	  }
	  if( !found ) {
		  console.log('Couldnt find Alices coin :(');
		  return;
	  }
	  var transaction = Transaction.generateValidTransaction(blockchain, 0, [coin], [pubhex], 5, [alice_pubhex], [alice_prvhex]);
	  console.log(transaction);
	  var options_post = {
	    hostname: 'localhost',
	    port: 8082,
	    path: '/addTransaction',
	    method: 'POST',
	    headers: {
	        'Content-Type': 'application/json',
	    }
	  };
	  var req2 = http.request(options_post, function(res) {
	    console.log('Status: ' + res.statusCode);
	    console.log('Headers: ' + JSON.stringify(res.headers));
	    res.setEncoding('utf8');
	    res.on('data', function (body) {
	      console.log('We did it!\nBody: ' + body);
	    });
	  });
	  req2.on('error', function(e) {
	    console.log('problem with request: ' + e.message);
	  });
	  req2.write( JSON.stringify({ data : transaction} ) );
	  req2.end();
	});
});
req.on('error', function(e) {
  console.log('problem with request: ' + e.message);
});
req.end();

//
// var options = {
//   hostname: 'localhost',
//   port: 3001,
//   path: '/mineBlock',
//   method: 'POST',
//   headers: {
//       'Content-Type': 'application/json',
//   }
// };
// var req = http.request(options, function(res) {
//   console.log('Status: ' + res.statusCode);
//   console.log('Headers: ' + JSON.stringify(res.headers));
//   res.setEncoding('utf8');
//   res.on('data', function (body) {
//     console.log('Body: ' + body);
//   });
// });
// req.on('error', function(e) {
//   console.log('problem with request: ' + e.message);
// });
// req.write( JSON.stringify({ data : transaction} ) );
// req.end();
