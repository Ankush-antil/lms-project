const { google } = require('googleapis');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

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

    console.log("Reading sheet rows...");
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:M300`
    });

    const rows = res.data.values || [];
    console.log(`Total rows read: ${rows.length}`);

    // Mongo ID regex (24-char hex)
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    
    // We will build a new set of rows excluding those that have a Mongo ID in Col A
    const cleanedRows = [];
    let removedCount = 0;
    
    for (let i = 0; i < rows.length; i++) {
        const firstColVal = rows[i][0] ? rows[i][0].toString().trim() : '';
        if (mongoIdRegex.test(firstColVal)) {
            console.log(`Removing row ${i + 1} with Mongo ID in Col A: ${firstColVal}`);
            removedCount++;
        } else {
            cleanedRows.push(rows[i]);
        }
    }

    if (removedCount > 0) {
        console.log(`Writing back ${cleanedRows.length} cleaned rows to Sheet...`);
        // Clear all values first
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `${sheetName}!A1:M300`
        });

        // Write cleaned rows
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1:M${cleanedRows.length}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: cleanedRows }
        });
        console.log("Sheet cleaned successfully!");
    } else {
        console.log("No appended Mongo ID rows found in the sheet. No cleanup needed.");
    }
    process.exit(0);
}

main().catch(err => {
    console.error("Error:", err.message);
    process.exit(1);
});
