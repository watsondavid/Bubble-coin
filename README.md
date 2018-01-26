# Bubblecoin

A simple Cryptocurrency implementation inspired by [NaiveChain](https://github.com/lhartikk/naivechain).

## why?

As a way to understand Crypto-tech on a deeper level.

## What does it do ?

### Node

The Bubblecoin-node creates an instance on the peer-to-peer network, nodes are able to verify blocks and distribute them throughout the network. This is the mechanism that keeps the blockchain in sync. Note that this node implementation cannot mine new blocks, this is handled by a seperate program - bubblecoin-miner. The Nodes also expose an HTTP API for interacting with the blockchain.

	usage: PORT=# P2P_PORT=# node bubblecoin-node

HTTP PORT defaults to 3001

P2P_PORT defaults to 6001 

#### GET
* `/block` returns all blocks, or if 'index' is set, will return just the block at that index.
* `/blocks?start=#&end=#` will return an array of blocks between indexes start and end.
* `allblocks` will return all blocks (same as `/block` with no arguments).
* `/transactions` will return all transactions yet to be hashed into the blockchain.
* `/peers` will returna a list of all peers this node is connected to.

#### POST
* `/addBlock` Posts a block to the node. Block will then be verified before the node will send it to its peers.
* `/addTransaction` Adds a transaction to the transaction pool. Transaction will be verified before adding to ensure coins are valid.
* `/addPeer` Connects this node to another node.  

### Miner

The miner is what secures the blockchain. The program will query for transactions then try to hash them into a block. The block must satisfy a proof-of-work difficulty (hard-coded in the blockchain.js file). The transactions, block header and a nonce-value are all hashed together in an attempt to find a hash with a given number of zeroes at the start. The nonce-value is incremented until such a hash is found. Once a block is found, it is sent to a node instance to distribute through the network.

### Wallet

The wallet program allows a user to create and manage keys (addresses), check their balance and send transactions. Currently only a command line interface exists. The following options exist:


	Usage: node bubblecoin-wallet [options]

	Options:

    -V, --version                     output the version number
    -c, --create                      Creates a new wallet
    -b, --balance                     Show Balance
    -p, --public_keys                 Show Public Keys
    -P, --key_pairs                   Show Key Pairs
    -n, --new_keypair                 Generates a new keypair
    -a, --add_keypair                 Adds a specified keypair
    -t, --make_transaction [address]  makes a transactiont to this receiver for program.sum (default: )
    -s, --sum [amount]                Sum to send when using --make_transaction. (default: 0)
    -h, --help                        output usage information
