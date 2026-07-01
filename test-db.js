const dns = require('dns');
const net = require('net');

const mongoSrvHost = '_mongodb._tcp.digitalstudycluster.tkpcaax.mongodb.net';

console.log("=== Running DB Diagnostic ===");

console.log("1. Resolving SRV records for:", mongoSrvHost);
dns.resolveSrv(mongoSrvHost, (err, addresses) => {
    if (err) {
        console.error("DNS SRV Resolution Failed:", err);
        return;
    }
    
    console.log("DNS SRV Resolution Successful! Found shards:");
    console.log(addresses);
    
    // Pick the first shard and test TCP connection to port 27017
    const shard = addresses[0];
    console.log(`\n2. Testing TCP connection to shard: ${shard.name}:${shard.port}`);
    
    const socket = net.createConnection(shard.port, shard.name);
    
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
        console.log(`TCP Connection to ${shard.name}:${shard.port} SUCCEEDED!`);
        socket.end();
    });
    
    socket.on('timeout', () => {
        console.error(`TCP Connection to ${shard.name}:${shard.port} TIMED OUT (5s)!`);
        socket.destroy();
    });
    
    socket.on('error', (err) => {
        console.error(`TCP Connection to ${shard.name}:${shard.port} FAILED with error:`, err.message);
    });
});
