"use strict";
const Threads = require('threads');
const http = require('http');

const Block = require('./blockchain.js');
const Transaction = require('./transaction.js');
const Coin = require('./coin.js');

const REWARD_VALUE = Transaction.REWARD_VALUE;

class Miner {
	constructor(address) {
		this.address = address;
	}

	/**
	 *	Picks a set of transactions to go into the enxt block
	 *	Is not very picky or complex...
	 */
	generateTransactionList(transactions, index) {
		if(transactions.length == 0) {
			return [];
		}
		var num_transactions = transactions.length;
		if(num_transactions > 5) num_transactions = 5;

		var transaction_list = transactions.slice(0,num_transactions);

		// Set correct indexes.
		for(var i =0; i < transaction_list.length; i++) {
			transaction_list[i].blockIndex = index;
			for(var c=0; c<transaction_list[i].newCoins.length; c++) {
				transaction_list[i].newCoins[c].creationBlock = index;
			}
		}
		return transaction_list
	}

	makeRewardTransaction(index) {
		var coin = Coin.createCoin( REWARD_VALUE, this.address, index );
		return Transaction.createTransaction(Transaction.TransactionType.REWARD, index, [this.address], [], [coin], REWARD_VALUE, []);
	}
}

/*
 *	Get Environment variables.
 */
var port = parseInt(process.env.PORT) || 8080;
var host = process.env.HOST || "localhost";
var address = process.env.ADDRESS;

var miner = new Miner(address);
console.log("Connecting to Node...");
// get latest block
var options_block = {
  hostname: host,
  port: port,
  path: '/block',
  method: 'GET'
};
var block_req = http.request(options_block, function(res_block) {
	res_block.on('data', function(body) {
		console.log("Connected to Node. Got latest block: " + body);
		var block = JSON.parse(body);
		console.log(block.index);
		// get TRANSACTIONS
		var options_transactions = {
		  hostname: host,
		  port: port,
		  path: '/transactions',
		  method: 'GET'
		};
		var transactions_req = http.request(options_transactions, function(res_transactions) {
			res_transactions.on('data', function (body) {
				var transactions = JSON.parse(body);
				console.log("Got Transactions: " + body);
				var transaction_list = miner.generateTransactionList(transactions, block.index+1);
				var reward_transaction = miner.makeRewardTransaction(block.index+1);
				transaction_list.push(reward_transaction);
				console.log('Transactions to mine: ' + JSON.stringify(transaction_list));
				// Mine block...
				var newBlock = Block.mineNewBlock(transaction_list, block);
				console.log('Discovered new Block! #:' + newBlock.hash);
				// send block to node

				var options_post = {
					hostname: host,
		  		  	port: port,
					path: '/addBlock',
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					}
				};
				var post_req = http.request(options_post, function(res_post) {
					console.log('Status: ' + res_post.statusCode);
				    console.log('Headers: ' + JSON.stringify(res_post.headers));
				    res_post.setEncoding('utf8');
					res_post.on('data', function(body) {
						console.log('We did it! :D\nbody: ' + body);
					});
				});
				post_req.on('error', function(e) {
					console.log('error ' + error);
				});
				console.log(JSON.stringify(newBlock));
				post_req.write(JSON.stringify({ data : newBlock }));
				post_req.end();
			});
		});
		transactions_req.on('error', function(e) {
		  console.log('problem with transaction request: ' + e.message);
		});
		transactions_req.end();
	});
});
block_req.on('error', function(e) {
  console.log('problem with block request: ' + e.message);
});
block_req.end();
