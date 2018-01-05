const DSA = require('jsrsasign');
const uuidv1 = require('uuid/v1');

const Coin = require("./coin.js");
const ecc_curve = 'secp256k1';
// The God address that can issue new coins.
const god_pubkey = '045226d48ff35325c57256dbad6f4f04d75ba133136de3b6d0190e9820e4a6319d934ed3d9ace5265785c3b8c9a73f3969c293d3aeaacf78950c8970388621e4ad';

/**
 *	Transaction Type
 */
var TransactionType = {
	COIN_CREATION: 0,
	TRANSACTION: 1,
	REWARD: 2
};
/**
 *	@class Transaction
 *	@Author David Watson
 */
class Transaction {
	constructor( type, uuid, blockIndex, publicKeys, destroyedCoins, newCoins, value, signatures ) {
		this.type = type;
		this.uuid = uuid;
		this.blockIndex = blockIndex;
		this.publicKeys = publicKeys;
		this.destroyedCoins = destroyedCoins;
		this.newCoins = newCoins;
		this.value = value;
		this.signatures = signatures;
 	}
}

var generateTransactionSignatures = (type, publicKeys, destroyedCoins, newCoins, value, privateKeys) => {
	if(!privateKeys.length) return [];
	var signatures = [];
	for(var i = 0; i < publicKeys.length; i++){
		const signer = new DSA.Signature({ "alg": 'SHA256withECDSA' });
		signer.init({ d: privateKeys[i], curve: ecc_curve });
		signer.updateString( type+publicKeys+destroyedCoins+newCoins+value );
		signatures.push(signer.sign().toString('hex'));
	}
	return signatures;
};

var validateTransactionSignatures = (transaction) => {
	for(var i=0; i < transaction.publicKeys.length; i++) {
		const verifier = new DSA.Signature({ "alg": 'SHA256withECDSA' });
		verifier.init({ xy: transaction.publicKeys[i], curve: ecc_curve });
		verifier.updateString( transaction.type+transaction.publicKeys+transaction.destroyedCoins+transaction.newCoins+transaction.value );
		var res = verifier.verify(transaction.signatures[i]);
		if(!res) {
			console.log('Invalid Transaction Signature.');
			return false;
		}
	}
	return true;
};

/**
 *  Validates a Transaction.
 *	@param chain the blockchain
 *	@param chainoffset index of first block in blockchain (if pruned)
 *	@param transaction transaction to be validated
 *	@param blockIndex index of transaction in the blockchain.
 *	@returns true if transaction is valid against blockchain and signature.
 */
exports.validateTransactions = (chain, chainoffset, transactions, blockIndex) => {
	for(var i = 0; i < transactions.length; i++) {
		var transaction = transactions[i];
		if(transaction.blockIndex != blockIndex) {
			console.log("Transaction blockIndex doesn't match block: " + blockIndex + " " + transaction.blockIndex);
			return false;
		}
		return this.validateUnconfirmedTransaction(chain, chainoffset, transaction, blockIndex);
	}
};

exports.validateUnconfirmedTransaction = (chain, chainoffset, transaction, blockIndex) => {
	if(transaction.type == TransactionType.REWARD) {
		if(transaction.value = 10) return true;
		else return false;
	}else if(transaction.type == TransactionType.COIN_CREATION) {
		if( transaction.publicKeys.length !== 1 || transaction.publicKeys[0]  !== god_pubkey ) {
			console.log('Transaction not issued by God.');
			return false;
		}
		// now count/check the newly created coins.
		var value = 0;
		for(var i=0; i < transaction.newCoins.length; i++) {
			var coin = transaction.newCoins[i];
			if(coin.creationBlock != blockIndex) {
				console.log('new coins creationBlock not set to correct block.');
				return false;
			}
			value += coin.value;
		}
		if(value != transaction.value) {
			console.log('Value not set to value of created coins');
			return false;
		}
		return validateTransactionSignatures(transaction);
	} else { // validate transaction
		// first ensure all coins are valid, belong to the sender and count the value
		var value = 0;
		for(var i = 0; i < transaction.destroyedCoins.length; i++) {
			var coin = transaction.destroyedCoins[i];
			if( !transaction.publicKeys.includes(coin.ownerPublicKey) ) {
				console.log( "public Key of sender doesn't match coin: " + coin );
				return false;
			}
			if( !Coin.validateCoin(chain, chainoffset, coin) ) {
				console.log( 'invalid coin: ' + JSON.stringify(coin) );
				return false;
			}
			value += coin.value;
		}
		// test value
		if(value !== transaction.value) {
			console.log("Transaction value: " + transaction.value + " doesn't equal coin value " + value);
			return false;
		}
		// now count and check the newly created coins.
		for(var i=0; i < transaction.newCoins.length; i++) {
			var coin = transaction.newCoins[i];
			// if(coin.creationBlock != blockIndex) {
			// 	console.log('new coins creationBlock not set to correct block.');
			// 	return false;
			// }
			value -= coin.value;
		}
		if(value !== 0) {
			console.log("Transaction input value doesn't equal output vaule.");
			return false;
		}
		// ok looks fine, lets check out the signatures
		return validateTransactionSignatures(transaction);
	}
};

/**
 *	Creates a transaction with the given information and generates the Signature
 *	Transaction is not garunteed to be valid and may be rejected by the network.
 *	@param type Transaction type.
 *	@param blockIndex index of next block.
 *  @param publicKey senders public key.
 *	@param destroyedCoins list of destroyedCoins.
 *	@param newCoins list of newly minted coins.
 *	@param value Total value of coins going in/out.
 *	@param privateKey Senders private key.
 */
exports.createTransaction = (type, blockIndex, publicKeys, destroyedCoins, newCoins, value, privateKeys) => {
	var signatures = generateTransactionSignatures(type, publicKeys, destroyedCoins, newCoins, value, privateKeys);
	var transaction = new Transaction(type, uuidv1(), blockIndex, publicKeys, destroyedCoins, newCoins, value, signatures);
	return transaction;
}

/**
 *	Attempts to return a valid transaction, returns false otherwise
 *	@param chain the Blockchain
 *	@param chainoffset index of the first block in the chain (if chain is pruned)
 *	@param destroyedCoins array of coins attempting to spend in transaction.
 *	@param receiverPublicKey public key address of receiver
 *	@param balanceToSend Amount to send in transaction - must be more than combined value of destoryed coins.
 *	@param publicKey senders publicKey
 *	@param privateKey senders privateKey
 */
exports.generateValidTransaction = ( chain, chainoffset, destroyedCoins, receiverPublicKey, balanceToSend, publicKeys, privateKeys ) => {
	//count destoryed coins and ensure they are valid.
	var value = 0;
	for(var i = 0; i < destroyedCoins.length; i++) {
		var coin = destroyedCoins[i];
		if( !publicKeys.includes(coin.ownerPublicKey) ) {
			console.log( "public Key of sender doesn't match coin: " + JSON.stringify(coin) );
			return false;
		}
		if( !Coin.validateCoin(chain, chainoffset, coin) ) {
			console.log( 'invalid coin: ' + JSON.stringify(coin) );
			return false;
		}
		value += coin.value;
	}
	if(value < balanceToSend) {
		console.log('Value of coins is less than transaction value. '+value+' '+balanceToSend );
		return false;
	}
	var change = value - balanceToSend;

	//make coin to send and coin for change
	var latestBlock = chain[chain.length-1];
	var coinprefix = (latestBlock.index+1).toString() + '-';
	var coin = Coin.createCoin(balanceToSend, receiverPublicKey, latestBlock.index+1 );
	var newcoins = [coin];
	if(change > 0) {
		var change_coin = Coin.createCoin(change, publicKeys[0], latestBlock.index+1 );
		newcoins.push(change_coin);
	}

	//Generate Transaction
	var transaction = this.createTransaction(TransactionType.TRANSACTION, latestBlock.index+1, publicKeys, destroyedCoins, newcoins, value, privateKeys );
	return transaction;
}

exports.TransactionType = TransactionType;
exports.REWARD_VALUE = 10;
