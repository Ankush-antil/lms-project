require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const uris = [
  { name: 'ENV_MONGO_URI', uri: process.env.MONGO_URI },
  { name: 'ENV_DIRECT_MONGO_URI', uri: process.env.DIRECT_MONGO_URI }
].filter(u => Boolean(u.uri));

async function testAll() {
  for (const {name, uri} of uris) {
    try {
      console.log(`Testing ${name}...`);
      const conn = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 5000
      }).asPromise();
      console.log(`${name}: CONNECTED OK!`);
      await conn.close();
    } catch(e) {
      console.log(`${name}: FAILED - ${e.message}`);
    }
  }
  process.exit(0);
}

testAll();
