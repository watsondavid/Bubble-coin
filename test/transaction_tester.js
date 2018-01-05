const http = require('http');

var transaction = JSON.parse('{"type":0,"uuid":"0b617700-ede5-11e7-abc4-8956502696d0","blockIndex":1,"publicKeys":["045226d48ff35325c57256dbad6f4f04d75ba133136de3b6d0190e9820e4a6319d934ed3d9ace5265785c3b8c9a73f3969c293d3aeaacf78950c8970388621e4ad"],"destroyedCoins":[],"newCoins":[{"uuid":"1-0","value":500,"ownerPublicKey":"045226d48ff35325c57256dbad6f4f04d75ba133136de3b6d0190e9820e4a6319d934ed3d9ace5265785c3b8c9a73f3969c293d3aeaacf78950c8970388621e4ad","creationBlock":1}],"value":500,"signatures":["304502206cce958e0a8c34b5fd378192b0620aacc6a20be76dc364263c6c77f933bc6343022100c098976daeffe1b4d2f2c3e06ac8edd556a85cbce01f1dd1276e482d439f1f60"]}');

var options = {
  hostname: 'localhost',
  port: 8082,
  path: '/addTransaction',
  method: 'POST',
  headers: {
      'Content-Type': 'application/json',
  }
};
var req = http.request(options, function(res) {
  console.log('Status: ' + res.statusCode);
  console.log('Headers: ' + JSON.stringify(res.headers));
  res.setEncoding('utf8');
  res.on('data', function (body) {
    console.log('Body: ' + body);
  });
});
req.on('error', function(e) {
  console.log('problem with request: ' + e.message);
});
req.write( JSON.stringify({ data : transaction} ) );
req.end();
