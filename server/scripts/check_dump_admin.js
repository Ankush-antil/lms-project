const fs = require('fs');
const path = require('path');

const dumpPath = path.resolve(__dirname, 'atlas_dump.json');
if (fs.existsSync(dumpPath)) {
    const data = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
    const users = data.users || [];
    const admins = users.filter(u => u.role === 'Admin');
    console.log(`Found ${admins.length} Admin users in dump:`);
    admins.forEach(a => console.log(`- Name: "${a.name}", Email: "${a.email}", ID: "${a._id}"`));

    console.log(`\nTotal Users in dump: ${users.length}`);
} else {
    console.log('Dump file not found');
}
