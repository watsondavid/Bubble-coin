const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const Threads = require('threads');

const Blockchain = require('./blockchain.js');
const Transaction = require('./transaction.js');

/*
 *	Get Environment variables.
 */
var http_port = process.env.HTTP_PORT || 3001;
var p2p_port = process.env.P2P_PORT || 6001;
var initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];

/*
 * Set transaction rules for Blockchain
 */
var transactionValidationFunction = (transactions, blockIndex, chain) => {
	return Transaction.validateTransactions(chain, 0, transactions, blockIndex);
}
Blockchain.setDataValidationFunction( transactionValidationFunction );

var transaction_pool = [];
// Adds a transaction to the transaction_pool if it is not already present.
var newTransaction = (transaction) => {
	for(var i=0; i < transaction_pool.length; i++) {
		if( transaction.uuid === transaction_pool[i].uuid ) {
			return;
		}
	}
	transaction_pool.push(transaction);
};
// Removes a transaction from the transaction_pool
var spentTransaction = (transaction) => {
	for(var i=0; i < transaction_pool.length; i++) {
		if( transaction.uuid === transaction_pool[i].uuid ) {
			transaction_pool.splice(i, 1);
			return;
		}
	}
}

/*
 *	P2P Network - Talk to other nodes
 */
var sockets = [];
var MessageType = {
 	QUERY_LATEST: 0,
 	QUERY_ALL: 1,
 	RESPONCE_BLOCKCHAIN: 2,
	QUERY_TRANSACTIONS: 3,
	TRANSACTIONS: 4
};

var connectToPeers = (newPeers) => {
    newPeers.forEach((peer) => {
        var ws = new WebSocket(peer);
        ws.on('open', () => initConnection(ws));
        ws.on('error', () => {
            console.log('connection failed')
        });
    });
};

var initP2PServer = () => {
	var server = new WebSocket.Server({port: p2p_port});
	server.on('connection', ws => initConnection(ws));
	console.log('listening websocket p2p port on: ' + p2p_port);
};

var initConnection = (ws) => {
	sockets.push(ws);
	initMessageHandler(ws);
	initErrorHandler(ws);
	write(ws, queryChainLengthMsg());
};

var initMessageHandler = (ws) => {
    ws.on('message', (data) => {
        var message = JSON.parse(data);
        switch (message.type) {
            case MessageType.QUERY_LATEST:
                write(ws, responseLatestMsg());
                break;
            case MessageType.QUERY_ALL:
                write(ws, responseChainMsg());
                break;
            case MessageType.RESPONCE_BLOCKCHAIN:
                handleBlockchainResponse(message);
                break;
			case MessageType.QUERY_TRANSACTIONS:
				write(ws, transactionMsg(transaction_pool));
				break;
			case MessageType.TRANSACTIONS:
				var transactions = JSON.parse(message.data);
				console.log('Received ' +transactions.length+ ' transactions');
				for(var i=0;i<transactions.length;i++) {
					newTransaction(transactions[i]);
				}
				break;
        }
    });
};

var initErrorHandler = (ws) => {
    var closeConnection = (ws) => {
        console.log('connection failed to peer: ' + ws.url);
        sockets.splice(sockets.indexOf(ws), 1);
    };
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};

var isDefined = (object) => {
	return ( typeof object !== 'undefined' );
}

var initHttpServer = (port) => {
	var app = express();
	app.use(bodyParser.json());

	app.get('/block', (req, res) => {
		var query = req.query;
		if( isDefined( query.index ) ) {
			res.send(JSON.stringify(Blockchain.chain().slice(query.index, query.index+1)[0]));
		} else {
			res.send(JSON.stringify(Blockchain.chain()[Blockchain.chain().length-1]));
		}
	});
	app.get('/blocks', (req, res) => {
		var start = 0;
		var end = Blockchain.chain().length - 1;
		if( isDefined(req.query.start) ) start = req.query.start;
		if( isDefined(req.query.end) ) end = req.query.end;

		res.send(JSON.stringify(Blockchain.chain().slice(start, end)));
	});
	app.get('/allblocks', (req, res) => res.send(JSON.stringify(Blockchain.chain())));
	app.post('/addBlock', (req, res) => {
		console.log('Received a block!');
		var block = req.body.data;
		Blockchain.addBlock(block);
		broadcast(responseLatestMsg());
		// remove all transactions from transaction_pool
		for(var i = 0; i < block.data.length; i++) {
			spentTransaction(block.data[i]);
		}
		res.send();
	});
	app.get('/transactions', (req, res) => res.send(JSON.stringify(transaction_pool)));
	app.post('/addTransaction', (req, res) => {
		var transaction = req.body.data;
		console.log("Received Transaction: " + transaction.uuid);
		if( Transaction.validateUnconfirmedTransaction(Blockchain.chain(), 0, transaction, Blockchain.chain().length) ) {
			transaction_pool.push(transaction);
			broadcast(transactionMsg([transaction]));
			res.send();
		} else {
			res.status(500).send('Invalid Transaction');
		}
	});
	app.get('/peers', (req, res) => {
		res.send(sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort ));
	});
	app.post('/addPeer', (req, res) => {
		connectToPeers([req.body.peer]);
		res.send();
	});
	app.listen(port, () => console.log('Listening on http port: ' + port));
};

var handleBlockchainResponse = (message) => {
    var receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
    var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    var latestBlockHeld = Blockchain.getLatestBlock();
    if (latestBlockReceived.index > latestBlockHeld.index) {
        console.log('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            console.log("We can append the received block to our chain");
            Blockchain.addBlock(latestBlockReceived);
			// remove all transactions from transaction_pool
			for(var i = 0; i < latestBlockReceived.data.length; i++) {
				spentTransaction(latestBlockReceived.data[i]);
			}
            broadcast(responseLatestMsg());
        } else if (receivedBlocks.length === 1) {
            console.log("We have to query the chain from our peer");
            broadcast(queryAllMsg());
        } else {
            console.log("Received blockchain is longer than current blockchain");
            Blockchain.replaceChain(receivedBlocks);
        }
    } else {
        console.log('received blockchain is not longer than my blockchain. Doing nothing');
    }
};

// Messages.
var queryChainLengthMsg = () => ({'type': MessageType.QUERY_LATEST});
var queryAllMsg = () => ({'type':MessageType.QUERY_ALL});
var queryTransactionsMsg = () => ({'type':MessageType.QUERY_TRANSACTIONS});
var transactionMsg = (transactions) => ({
	'type': MessageType.TRANSACTIONS,
	'data': JSON.stringify(transactions)
});
var responseChainMsg = () => ({
	'type': MessageType.RESPONCE_BLOCKCHAIN,
	'data': JSON.stringify(Blockchain.chain())
});
var responseLatestMsg = () => ({
	'type': MessageType.RESPONCE_BLOCKCHAIN,
	'data': JSON.stringify([Blockchain.getLatestBlock()])
});

// Message Sending functions
var write = (ws, message) => ws.send(JSON.stringify(message));
var broadcast = (message) => sockets.forEach(socket => write(socket, message));

connectToPeers(initialPeers);
initHttpServer(http_port);
initP2PServer();
