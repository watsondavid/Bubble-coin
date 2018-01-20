"use strict";
const uuidv1 = require('uuid/v1');
/**
 * @class Coin
 * @Author David Watson
 */
class Coin {
	constructor( uuid, value, ownerPublicKey, creationBlock ) {
		this.uuid = uuid;
		this.value = value;
		this.ownerPublicKey = ownerPublicKey;
		this.creationBlock = creationBlock;
	}
}

/**
 *	Creates a new Coin
 */
exports.createCoin = ( value, ownerPublicKey, creationBlock ) => {
	return new Coin( uuidv1(), value, ownerPublicKey, creationBlock );
}
// Returns true if coin was created in the block it claims
var validateCoinCreation = (chain, chainoffset, coin) => {
	var block = chain[coin.creationBlock-chainoffset];
	if(!block) {  // couldn't find block
		console.log('Could not find refferenced block');
		return false;
	}
	for(var t=0; t < block.data.length; t++) {
		var coins = block.data[t].newCoins;
		for(var i = 0; i < coins.length; i++) {
			if(coin.uuid === coins[i].uuid) {
				if( coin.value == coins[i].value ) {
					if( coin.ownerPublicKey == coins[i].ownerPublicKey ) {
						return true;
					} else {
						console.log('Spent coin publicKey does not match owner.');
						return false;
					}
				} else {
					console.log( 'Atempt to spend coin for a different value.' );
					return false;
				}
			}
		}
	}
	console.log('Coin not created in creation block');
	return false;
}
// Returns true if the coin has not been spent since it was created.
var validateCoinNotSpent = (chain, chainoffset, coin) => {
	for(i = coin.creationBlock + 1; i < chain.length; i++) {
		var block = chain[i-chainoffset];
		for(var t = 0; t < block.data.length; t++) {
			var coins = block.data[t].destroyedCoins;
			for(j = 0; j < coins.length; j++) {
				if(coin.uuid == coins[j].uuid) {
					return false;
				}
			}
		}
	}
	return true;
}
/**
 *	Validates a Coin agaisnt the blockchain.
 *	@param chain the blockchain
 *	@param chainoffset the index of the first block (if pruned)
 *	@param coin the coin to be verified.
 */
exports.validateCoin = (chain, chainoffset, coin) => {
	if(!validateCoinCreation(chain, chainoffset, coin)) {
		return false;
	}
	if(!validateCoinNotSpent(chain, chainoffset, coin)) {
		console.log('Attempt to double spend!');
		return false;
	}
	return true;
}
