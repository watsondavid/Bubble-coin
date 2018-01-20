"use strict";
const Crypto = require('crypto');
const ecc_curve = 'secp256k1';

class Key {
	 constructor( prvhex, pubhex ) {
		this.prvhex = prvhex;
		this.pubhex = pubhex;
	}
}

exports.generateNewKeyPair = () => {
	const generator = Crypto.createECDH(ecc_curve);
	generator.generateKeys();
	var prvhex = generator.getPrivateKey().toString('hex');
	var pubhex = generator.getPublicKey().toString('hex');
	return new Key(prvhex, pubhex);
}
