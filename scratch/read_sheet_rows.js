require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });
const { google } = require('../server/node_modules/googleapis');

async function main() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    const auth = new google.auth.JWT({
        email,
        key: key.trim().replace(/^"/, '').replace(/"$/, '').replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

    console.log(`Fetch: ${spreadsheetId}`);
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
    });

    const rows = res.data.values || [];
    console.log(`Total rows fetched: ${rows.length}`);
    
    // Look for rows with names: Saniya, Payal, Nitin, Khushi
    const targetNames = ["Saniya", "Payal", "Nitin", "Khushi", "Manjeet", "Anshita"];
    rows.forEach((row, i) => {
        if (i < 2) {
            console.log(`Header Row ${i + 1}:`, row.slice(0, 12));
            return;
        }
        const name = row[5] ? row[5].toString().trim() : '';
        if (targetNames.some(tn => name.toLowerCase().includes(tn.toLowerCase()))) {
            console.log(`Row ${i + 1}: Name="${name}", CourseName (col 8)="${row[7]}", Row:`, row.slice(0, 12));
        }
    });
}

main().catch(err => console.error(err));
