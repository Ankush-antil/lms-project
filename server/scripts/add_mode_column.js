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
        range: `${sheetName}!A1:Z300`
    });

    const rows = res.data.values || [];
    console.log(`Total rows read: ${rows.length}`);

    if (rows.length <= 1) {
        console.log("❌ Sheet is empty. Please restore the version history in Google Sheets first!");
        process.exit(1);
    }

    const headerRowIndex = 1;
    const headers = rows[headerRowIndex];
    
    // Check if Mode column is already added
    if (headers.indexOf("Mode") !== -1) {
        console.log("Mode column is already present.");
        process.exit(0);
    }

    let balanceIndex = headers.indexOf("Balance");
    if (balanceIndex === -1) {
        balanceIndex = headers.findIndex(h => h && h.toString().toLowerCase().trim() === "balance");
    }

    if (balanceIndex === -1) {
        console.log("❌ 'Balance' column not found in headers.");
        process.exit(1);
    }

    const insertIndex = balanceIndex + 1;
    headers.splice(insertIndex, 0, "Mode");

    for (let i = 0; i < rows.length; i++) {
        if (i === headerRowIndex) continue;
        const row = rows[i];
        if (i < headerRowIndex) {
            if (row && row.length > insertIndex) {
                row.splice(insertIndex, 0, "");
            }
            continue;
        }
        if (row && row.length > 0) {
            while (row.length <= balanceIndex) {
                row.push("");
            }
            row.splice(insertIndex, 0, "Cash");
        }
    }

    console.log("Writing modified rows back to Sheet...");
    // We update directly without clearing!
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:AD${rows.length}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: rows }
    });

    console.log("✅ Successfully added 'Mode' column and set it to 'Cash' for all students!");
    process.exit(0);
}

main().catch(err => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
