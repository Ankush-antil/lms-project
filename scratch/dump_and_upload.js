const mongoose = require('mongoose');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const prodAtlasURI = 'mongodb+srv://digitalstudy5555_db_user:DigitalStudy123@cluster0.lstfruc.mongodb.net/test?retryWrites=true&w=majority';
const devAtlasURI = 'mongodb+srv://digitalstudy:DigitalStudy123@digitalstudy.lzqs6z8.mongodb.net/test?retryWrites=true&w=majority';

async function dumpDatabase(uri, label) {
    console.log(`\nConnecting to Atlas ${label} Database...`);
    const conn = await mongoose.createConnection(uri).asPromise();
    console.log(`Connected to Atlas ${label}. Fetching collections...`);
    
    const collections = await conn.db.listCollections().toArray();
    const data = {};
    
    for (const col of collections) {
        const name = col.name;
        if (name.startsWith('system.')) continue;
        
        const docs = await conn.db.collection(name).find({}).toArray();
        data[name] = docs;
        console.log(`✓ Fetched ${docs.length} documents from ${name}`);
    }
    
    await conn.close();
    return data;
}

async function run() {
    try {
        const prodData = await dumpDatabase(prodAtlasURI, 'Production');
        const devData = await dumpDatabase(devAtlasURI, 'Development');
        
        const scratchDir = path.join(__dirname);
        const prodPath = path.join(scratchDir, 'prod_data.json');
        const devPath = path.join(scratchDir, 'dev_data.json');
        
        fs.writeFileSync(prodPath, JSON.stringify(prodData));
        fs.writeFileSync(devPath, JSON.stringify(devData));
        console.log(`\n✓ Saved temporary dump files to local scratch directory.`);
        
        const conn = new Client();
        conn.on('ready', () => {
            console.log('✅ SSH Connection Ready.');
            conn.sftp((err, sftp) => {
                if (err) throw err;
                sftp.fastPut(prodPath, '/tmp/prod_data.json', (err) => {
                    if (err) throw err;
                    sftp.fastPut(devPath, '/tmp/dev_data.json', (err) => {
                        if (err) throw err;
                        runRemoteImportAndCheck(conn);
                    });
                });
            });
        }).connect({
            host: '143.110.183.139',
            port: 22,
            username: 'root',
            password: 'ankush'
        });
        
    } catch (err) {
        console.error('❌ Migration error:', err);
    }
}

function runRemoteImportAndCheck(conn) {
    const remoteScript = `
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');

async function importData(filePath, dbName) {
    console.log('Importing ' + filePath + ' into local ' + dbName);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const client = new MongoClient('mongodb://127.0.0.1:27017');
    await client.connect();
    const db = client.db(dbName);
    
    for (const [colName, docs] of Object.entries(data)) {
        if (docs.length === 0) continue;
        const col = db.collection(colName);
        await col.deleteMany({});
        
        // Convert IDs
        const formattedDocs = docs.map(doc => {
            if (doc._id) {
                doc._id = new ObjectId(doc._id);
            }
            for (const [key, value] of Object.entries(doc)) {
                if (typeof value === 'string' && value.match(/^[0-9a-fA-F]{24}$/)) {
                    doc[key] = new ObjectId(value);
                }
            }
            return doc;
        });
        
        await col.insertMany(formattedDocs);
        console.log('  Restored ' + colName + ': ' + formattedDocs.length);
    }
    
    // Print verify count
    const count = await db.collection('users').countDocuments();
    console.log('VERIFY COUNT FOR ' + dbName + ' IMMEDIATELY AFTER IMPORT: ' + count);
    await client.close();
}

async function run() {
    try {
        await importData('/tmp/prod_data.json', 'lms-prod');
        await importData('/tmp/dev_data.json', 'lms-dev');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
`;

    conn.exec('cat << \'EOF\' > /tmp/import_local_mongo.js\n' + remoteScript + '\nEOF', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            const cmds = [
                'node /tmp/import_local_mongo.js',
                'echo "=== BEFORE RESTART ==="',
                'node -e "const { MongoClient } = require(\'mongodb\'); new MongoClient(\'mongodb://127.0.0.1:27017\').connect().then(async c => { console.log(\'BEFORE: Dev users =\', await c.db(\'lms-dev\').collection(\'users\').countDocuments()); await c.close(); })"',
                'pm2 restart all',
                'sleep 8',
                'echo "=== AFTER RESTART ==="',
                'node -e "const { MongoClient } = require(\'mongodb\'); new MongoClient(\'mongodb://127.0.0.1:27017\').connect().then(async c => { console.log(\'AFTER: Dev users =\', await c.db(\'lms-dev\').collection(\'users\').countDocuments()); await c.close(); })"'
            ].join(' && ');
            
            conn.exec(cmds, (err2, stream2) => {
                if (err2) throw err2;
                stream2.on('close', (code) => {
                    console.log(`\n✅ Remote checks completed with exit code ${code}`);
                    conn.end();
                    process.exit(code);
                }).on('data', (data) => {
                    process.stdout.write(data.toString());
                }).stderr.on('data', (data) => {
                    process.stderr.write(data.toString());
                });
            });
        });
    });
}

run();
