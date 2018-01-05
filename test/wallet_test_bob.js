const Wallet = require('../src/wallet.js');
const KeyPair = require('../src/keys.js');
const http = require('http');

var wallet = new Wallet.Wallet();
wallet.addKey({ prvhex : 'e2e591bbd57568cd3977e76651c673c8ac2ca65335a69c238deeb8590df70788', pubhex : '045226d48ff35325c57256dbad6f4f04d75ba133136de3b6d0190e9820e4a6319d934ed3d9ace5265785c3b8c9a73f3969c293d3aeaacf78950c8970388621e4ad' });

var options_chain = {
  hostname: 'localhost',
  port: 8081,
  path: '/allblocks',
  method: 'GET'
};
var req = http.request(options_chain, function(res) {
	res.setEncoding('utf8');
	res.on('data', function (body) {
		var blockchain = JSON.parse(body);
		wallet.update(blockchain.slice(1, blockchain.length), 1);
		console.log('you have ' + wallet.balance + ' bubblecoin! :D');
		var alice = '0456efb0b80fb76194682a6af72338bbadd0f327e52615602f61dd691ac18ef8baf0133d27ff7e8e4a1e4b4881e7acfffaa47475231fb5f9dd14b4f5ad9ea5462e';
		var transaction = wallet.makeTransaction(blockchain.slice(1, blockchain.length), 1, alice, 19);
		var options_post = {
	  	    hostname: 'localhost',
	  	    port: 8081,
	  	    path: '/addTransaction',
	  	    method: 'POST',
	  	    headers: {
	  	        'Content-Type': 'application/json',
  	    	}
  	  	};
		if(transaction) {
	  	  	var req2 = http.request(options_post, function(res) {
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
		} else {
			console.log("Couldn't make a transaction :(");
		}
	});
});
req.end();
