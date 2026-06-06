#!/bin/bash
# Try with development DB URI first to confirm credentials work, then switch to production

echo "=== Testing both MongoDB URIs ==="

# Test connection with both URIs using mongosh or node
node -e "
const mongoose = require('/var/www/llms/server/node_modules/mongoose');

const uris = [
  { name: 'Production', uri: 'mongodb+srv://digitalstudy5555_db_user:digital%235555@digitalstudycluster.tkpcaax.mongodb.net/?appName=DigitalStudyCluster' },
  { name: 'Development', uri: 'mongodb+srv://digitalstudy5555_db_user:digital%235555@digitalstudy.lzqs6z8.mongodb.net/?appName=DigitalStudyCluster' }
];

async function testAll() {
  for (const {name, uri} of uris) {
    try {
      const conn = await mongoose.createConnection(uri).asPromise();
      console.log(name + ': CONNECTED OK');
      await conn.close();
    } catch(e) {
      console.log(name + ': FAILED - ' + e.message.substring(0, 100));
    }
  }
  process.exit(0);
}
testAll();
" 2>&1 | grep -E '(CONNECTED|FAILED|Production|Development)'
