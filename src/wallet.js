"use strict";
const Keys = require('./keys.js');
const Transaction = require('./transaction.js');

class Wallet {
	constructor() {
		this.keys = [];
		this.coins = [];
		this.balance = 0.0;
		this.lastUpdated = new Date().getTime();
	}

	/**
	 *	Generates a new random key and adds to keylist.
	 *  @returns the public key hex string.
	 */
	addNewKey() {
		var keypair = Keys.generateNewKeyPair()
		this.keys.push(keypair);
		return keypair.pubkey;
	}

	/**
	 *	Adds a new key
	 *	@param keypair the new keypair to add
	 */
	addKey(keypair) {
		this.keys.push(keypair);
	}

	/**
	 *	Adds a coin to the coins array if the UUID isn't already found there
	 *	@param coin to add
	 */
	addCoin(coin) {
		for(var i = 0; i < this.coins.length; i++) {
			if(coin.uuid == this.coins[i].uuid) {
				return;
			}
		}
		this.coins.push(coin);
	}
	/**
	 *	Removes a coin from the coins array if its uuid matches the given coin
	 *	@param coin coin to compare
	 */
	removeSpentCoin(coin) {
		for(var i = 0; i < this.coins.length; i++) {
			if(coin.uuid == this.coins[i].uuid) {
				this.coins.splice(i, 1);
				return;
			}
		}
	}

	/**
	 *	Searches the blockchain for new coins belonging to this wallet
	 *	and updates the coins array with any new coins.
	 *	@param chain the blockchain
	 *	@param chainoffset index of first block in chain (if pruned)
	 */
	searchForCoins(chain, chainoffset) {
		for(var i=0; i < chain.length; i++) {
			for(var t=0; t < chain[i].data.length; t++) {
				// Look for newly minted coins
				var coins = chain[i].data[t].newCoins;
				for(var j=0;j<coins.length;j++) {
					for(var k=0;k<this.keys.length;k++) {
						if( coins[j].ownerPublicKey == this.keys[k].pubhex ) {
							this.addCoin(coins[j]);
						}
					}
				}
				//now check spent coins
				coins = chain[i].data[t].destroyedCoins;
				for(var j=0;j<coins.length;j++) {
					for(var k=0;k<this.keys.length;k++) {
						if( coins[j].ownerPublicKey == this.keys[k].pubhex ) {
							this.removeSpentCoin(coins[j]);
						}
					}
				}
			}
		}
	}

	/**
	 *	Counts the set of coins in the coins array and updates the balance variable.
	 */
	countBalance() {
		var bal = 0;
		for(var i=0;i<this.coins.length;i++) {
			bal += this.coins[i].value;
		}
		this.balance = bal;
	}

	// calls serachForCoins and updateBalance
	update(chain, chainoffset) {
		this.coins = [];
		this.searchForCoins(chain, chainoffset);
		this.countBalance();
		this.lastUpdated = new Date().getTime();
	}

	makeTransaction(chain, chainoffset, receiverAddress, balance ) {
		this.update(chain, chainoffset);
		if(this.balance < balance) {
			console.log('Insufficent funds');
			return false;
		}
		this.sortCoins();
		var value = 0;
		var num_coins = 0;
		while(value < balance) {
			value += this.coins[num_coins].value;
			num_coins += 1;
		}
		var spend_coins = [];
		var pubkeys = [];
		var prvkeys = [];
		for(var i = 0; i < num_coins; i++) {
			spend_coins.push(this.coins[i]);
			for(var key_idx = 0; key_idx < this.keys.length; key_idx++) {
				if(this.keys[key_idx].pubhex == this.coins[i].ownerPublicKey && !pubkeys.includes(this.keys[key_idx].pubhex) ) {
					pubkeys.push(this.keys[key_idx].pubhex);
					prvkeys.push(this.keys[key_idx].prvhex);
				}
			}
		}
		return Transaction.generateValidTransaction( chain, chainoffset, spend_coins, receiverAddress, balance, pubkeys, prvkeys );
	}

	// Sorts coins in assending order of age.
	sortCoins() {
		this.coins.sort((a, b) => { return a.creationBlock - b.creationBlock; });
	}
}
module.exports.Wallet = Wallet;
module.exports.FromJson = (json) => {
	var wallet = new Wallet();
	var data = JSON.parse(json);
	wallet.keys = data.keys;
	wallet.coins = data.coins;
	wallet.balance = data.balance;
	wallet.lastUpdated = data.lastUpdated;
	return wallet;
};
