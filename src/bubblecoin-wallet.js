var program = require('commander');
const fs = require('fs');
const Wallet = require('./wallet.js');
const http = require('http');

program
  .version('0.0.0')
  .option('-c, --create', 'Creates a new wallet')
  .option('-b, --balance', 'Show Balance')
  .option('-p, --public_keys', 'Show Public Keys')
  .option('-P, --key_pairs', 'Show Key Pairs')
  .option('-n, --new_keypair', 'Generates a new keypair')
  .option('-a, --add_keypair', 'Adds a specified keypair', '{"prvhex":"undefined","pubhex":"undefined"}')
  .option('-t, --make_transaction [address]', 'makes a transactiont to this receiver for program.sum', '')
  .option('-s, --sum [amount]', 'Sum to send when using --make_transaction.', '0')
  .parse(process.argv);

/*
 *	Get Environment variables.
 */
var port = parseInt(process.env.PORT) || 8081;
var host = process.env.HOST || localhost;

var wallet;
var createNewWallet = () => {
	wallet = new Wallet.Wallet();
	wallet.addNewKey();
}

// Check for file.
fs.stat('wallet.txt', function(err, stat) {
    if(err == null) {
        fs.readFile('wallet.txt', function(err, data) {
			if(err) {
				throw err;
			}
			wallet = Wallet.FromJson(data);
			walletLoaded();
		})

    } else if(err.code == 'ENOENT') {
        createNewWallet();
        saveWallet();
		walletLoaded();
    } else {
        console.log('IO Error: ', err.code);
    }
});

function saveWallet() {
	fs.writeFile('wallet.txt', JSON.stringify(wallet));
}

function walletLoaded() {
	console.log('Connecting to Bubblecoin Network...');
	var options_chain = {
		hostname: host,
		port: port,
		path: '/allblocks',
		method: 'GET'
	};
	var req = http.request(options_chain, function(res) {
		res.setEncoding('utf8');
		res.on('data', function (body) {
			console.log("Connected.");
			var blockchain = JSON.parse(body);
			blockchainLoaded(blockchain);
	  });
  });
  req.end();
}

function sendTransaction(transaction) {
	var options_post = {
		hostname: host,
		port: port,
		path: '/addTransaction',
	    method: 'POST',
	    headers: {
	        'Content-Type': 'application/json',
	    }
	};
	var req = http.request(options_post, function(res) {
		console.log('Status: ' + res.statusCode);
		res.setEncoding('utf8');
		res.on('data', function (body) {
	      console.log('Transaction Sent');
	    });
	});
	req.on('error', function(e) {
		console.log('error: ' + e.message);
	});
	req.write(JSON.stringify({ data : transaction }));
	req.end();
}

function blockchainLoaded(blockchain) {
	wallet.update(blockchain.slice(1, blockchain.length-1), 1);

	if(program.balance) {
		var bal = new Number(wallet.balance);
		console.log('Balance: ' + bal + ' Bubblecoin');
	}

	if(program.new_keypair) {
		wallet.addNewKey();
		console.log("New Key Pair Generated");
	}

	if(program.public_keys) {
		console.log("Public Addresses: ");
		for(var i = 0; i < wallet.keys.length; i++) {
			console.log(wallet.keys[i].pubhex);
		}
	}

	if(program.key_pairs) {
		console.log('Key Pairs: ');
		for(var i = 0; i < wallet.keys.length; i++) {
			console.log(JSON.stringify(wallet.keys[i]));
		}
	}

	if(program.make_transaction) {
		if(program.sum) {
			var transaction = wallet.makeTransaction(blockchain.slice(1, blockchain.length-1), 1, program.make_transaction, parseInt(program.sum));
			if(transaction) {
				sendTransaction(transaction);
			}
		} else {
			console.log('Must provide sum.');
		}
	}

	saveWallet();
}
