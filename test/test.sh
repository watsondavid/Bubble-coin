#/bin/bash

# start up 3 nodes
HTTP_PORT=8080 P2P_PORT=4001 node ./src/bubblecoin-node.js &
HTTP_PORT=8081 P2P_PORT=4002 node ./src/bubblecoin-node.js &
HTTP_PORT=8082 P2P_PORT=4003 node ./src/bubblecoin-node.js &

sleep 1

# connect peers
curl -H "Content-Type: application/json" -X POST -d '{"peer" : "http://localhost:4002" }' http://localhost:8080/addPeer
curl -H "Content-Type: application/json" -X POST -d '{"peer" : "http://localhost:4003" }' http://localhost:8080/addPeer
curl -H "Content-Type: application/json" -X POST -d '{"peer" : "http://localhost:4003" }' http://localhost:8081/addPeer

sleep 1

# probs shouldn't do this but it works on my machine :P
#killall node
