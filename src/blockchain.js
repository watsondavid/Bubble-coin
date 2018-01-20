"use strict";
const SHA256 = require( "crypto-js/sha256" );
/**
 * @class Block
 * @Author David Watson
 */
class Block {
	/**
	 *	Creates a new block
	 */
	 constructor( index, previousHash, timestamp, data, nonce, hash ) {
 		this.index = index;
 		this.previousHash = previousHash;
 		this.timestamp = timestamp;
 		this.data = data;
 		this.nonce = nonce;
 		this.hash = hash;
 	}
}
exports.Block = Block;
/**
 *	Creates an empty Block Object with index 0.
 */
var getGenesisBlock = () => {
	return new Block(0, "0", 1465154705, "bubblecoin genesis block!!", 0, "0000000000000000000000000000000000000000000000000000000000000000");
};

/**
 *	The internal blockchain
 */
var blockchain = [getGenesisBlock()];

// Default function to validate data - overriden with setDataValidationFunction.
var dataValidationFunction = (data) => {
	return true;
}

exports.setDataValidationFunction = (validationFunction) => {
	dataValidationFunction = validationFunction;
}
/*
 *	Returns the blockchain as an object.
 */
exports.chain = () => {
	return blockchain;
}

/**
 *	Calculates the hash given the entire contents of a block as parameters.
 *	@param index block index
 *	@param previousHash previous blocks hash
 *	@param timestamp this blocks timestamp
 *	@param data this blocks data
 *	@param nonce this blocks nonce
 *	@returns a SHA256 Hash as a String.
 */
var calculateHash = ( index, previousHash, timestamp, data, nonce ) => {
	return SHA256( index + previousHash + timestamp + data + nonce ).toString();
};

/**
 *	Calculates the hash for a block
 *	@param block block to be checked.
 *	@returns SHA256 hash of the block as a string
 */
var calculateHashForBlock = ( block ) => {
	return calculateHash( block.index, block.previousHash, block.timestamp, block.data, block.nonce );
};

/**
 *	Validates the Mining proof of work, difficulty hard-coded.
 *	@param hash the hash to be validated.
 *  @returns true if hash satisfies proof of work.
 */
var validateHash = (hash) => {
	var difficulty = 2;
	for(var i = 0; i < difficulty; i++) {
		if( hash[i] !== '0' ) {
			return false;
		}
	}
	return true;
};

/**
 *	Mines for a hash that satisfies the validateHash function
 *	@param index the block index
 *	@param previousHash previous blocks Hash
 *	@param timestamp the timestampt to of the new block
 *	@param data the data going in the block TODO: transactions...
 */
exports.mineHashForBlock = (block) => {
	var valid = false;
	var hash = "";
	while( !valid ) { // brute force it is
		block.nonce += 1;
		hash = calculateHash( block.index, block.previousHash, block.timestamp, block.data, block.nonce );
		valid = validateHash(hash);
	}
	block.hash = hash;
	return block;
};

/**
 *	Returns true if next block is valid.
 *	@param newBlock the newBlock being assessed.
 *  @param previousBlock the block before the newBlock.
 */
exports.isValidBlock = (newBlock, previousBlock, chain) => {
	if(previousBlock.index + 1 !== newBlock.index) {
		console.log('Invalid block index'); // TODO: Better errors
		return false;
	} else if (previousBlock.hash !== newBlock.previousHash) {
		console.log('invali previous hash');
		return false;
	} else if( calculateHashForBlock( newBlock ) !== newBlock.hash ) {
		console.log( 'invalid hash: ' + calculateHashForBlock(newBlock) + ' ' + newBlock.hash );
		return false;
	} else if( !validateHash(newBlock.hash) ){
		console.log( 'Hash does not satisfy proof of work requirement' );
		return false;
	}
	return dataValidationFunction(newBlock.data, newBlock.index, chain);
};

/**
 *	Returns true if every block in the given chain is valid.
 *	@param newChain the new blockchain to be assessed.
 */
exports.isValidChain = (newChain) => {
	previous = newChain[0];
	for(i = 1; i < newChain.length; i++) {
		if( !this.isValidBlock( newChain[i], previous, newChain ) ) {
			console.log('invalid blockchain');
			return false;
		}
		previous = newChain[i];
	}
	return true;
}

/**
 *	Is called when a new chain is received. Decides which chain to keep.
 *	@param newBlocks the new Blockchain.
 */
exports.replaceChain = (newBlocks) => {
	if( this.isValidChain(newBlocks) && newBlocks.length > blockchain.length ) {
		console.log('Received blockchain is valid and exceeds height of current chain.');
		console.log('Replacing blockchain.');
		blockchain = newBlocks;
		broadcast(responseLatestMsg());
	} else {
		console.log('Received blockchain is invalid.');
	}
};

/**
 *	returns the top most block in the chain.
 */
exports.getLatestBlock = () => {
	return blockchain[blockchain.length - 1];
};

/**
 *	Creates a new block with the given data and
 *	Blocks until proof of work is found
 *	Block may not be vali once mined...
 *	@param data transaction data to go in block
 *	@returns the newly mined block
 */
exports.mineNewBlock = (data, previousBlock) => {
	var nextIndex = previousBlock.index + 1;
	var nextTimestamp = new Date().getTime() / 1000;
	var block = new Block(nextIndex, previousBlock.hash, nextTimestamp, data, 0, "");
	block = this.mineHashForBlock(block);
	return block;
};

/**
 *	Adds a block to the blockchain given it is valid.
 *	@param block the new block
 */
exports.addBlock = (block) => {
	if(this.isValidBlock(block, this.getLatestBlock(), blockchain)) {
		blockchain.push(block);
	}
};
