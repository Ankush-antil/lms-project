/**
 * GOOGLE APPS SCRIPT FOR TWO-WAY SYNC
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any default code and paste this script.
 * 4. Configure your backend URL and Secret Token in the config block below.
 * 5. Save the project (click the Save icon).
 * 6. Set up the trigger:
 *    - Click the clock icon (Triggers) on the left sidebar.
 *    - Click "+ Add Trigger" at the bottom right.
 *    - Choose "onSheetEdit" as the function to run.
 *    - Select Event source: "From spreadsheet".
 *    - Select Event type: "On edit" (or "On change" to also capture row deletions).
 *    - Save. (It will ask for Google account authentication approval).
 */

// === CONFIGURATION ===
const BACKEND_URL = "https://7fbf9e20da33ad.lhr.life/api/sync/sheets";
const SYNC_TOKEN = "supersecrettoken"; // Must match GOOGLE_SYNC_SECRET in your server's .env

/**
 * Triggered automatically on edits in the spreadsheet
 */
function onSheetEdit(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const row = range.getRow();

  // Skip header row
  if (row === 1) return;

  // Get row values
  // A: FeeRecord ID, B: Admission No., C: Name, D: Father Name, E: Mobile No. 1, 
  // F: Mobile No. 2, G: Date of Joining, H: Course Name, I: Course Fee, J: Extra Charges, 
  // K: Balance, L: Months, M: Status
  const values = sheet.getRange(row, 1, 1, 13).getValues()[0];

  const id = values[0] ? values[0].toString().trim() : "";
  const admissionNo = values[1] ? values[1].toString().trim() : "";
  const name = values[2] ? values[2].toString().trim() : "";
  const fatherName = values[3] ? values[3].toString().trim() : "";
  const mobile1 = values[4] ? values[4].toString().trim() : "";
  const mobile2 = values[5] ? values[5].toString().trim() : "";
  const dateOfJoining = values[6] ? values[6].toString().trim() : "";
  const course = values[7] ? values[7].toString().trim() : "";
  const totalFee = values[8] ? parseFloat(values[8]) : 0;
  const extraCharges = values[9] ? values[9].toString().trim() : "";
  const balance = values[10] ? parseFloat(values[10]) : 0;
  const months = values[11] ? parseInt(values[11]) : 0;
  const status = values[12] ? values[12].toString().trim() : "";

  // If ID and Name are missing, we cannot sync
  if (!id && !name) {
    console.log("Row " + row + " skipped: Both ID and Name are empty.");
    return;
  }

  // Prevent sending webhook if the edit was just to write the MongoDB ID or read-only fields
  const col = range.getColumn();
  if (col === 1 || col === 7 || col === 10 || col === 11 || col === 13) {
    console.log("Row " + row + " edit ignored: Edit was on read-only column " + col);
    return;
  }

  console.log("Syncing row " + row + " (Name: " + name + ") to backend...");

  const payload = {
    action: "upsert",
    data: {
      id: id,
      spreadsheetId: e.source.getId(),
      admissionNo: admissionNo,
      name: name,
      fatherName: fatherName,
      mobile1: mobile1,
      mobile2: mobile2,
      course: course,
      totalFee: totalFee,
      months: months
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-sync-token": SYNC_TOKEN,
      "Bypass-Tunnel-Reminder": "true" // Required for localtunnel bypass
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(BACKEND_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    console.log("Backend Response Code: " + responseCode);
    console.log("Backend Response Text: " + responseText);

    if (responseCode === 200) {
      const resData = JSON.parse(responseText);
      if (resData.success) {
        // Temporarily disable trigger behavior during API updates by using SpreadsheetApp flush
        // Write generated ID and computed fields back to Google Sheet

        // FeeRecord ID (Col A)
        if (!id && resData.recordId) {
          sheet.getRange(row, 1).setValue(resData.recordId);
        }
        // Balance (Col K)
        if (resData.pendingAmount !== undefined) {
          sheet.getRange(row, 11).setValue(resData.pendingAmount);
        }
        // Status (Col M)
        if (resData.status !== undefined) {
          sheet.getRange(row, 13).setValue(resData.status);
        }

        SpreadsheetApp.flush();
        console.log("Row " + row + " successfully synchronized with MongoDB.");
      }
    } else {
      console.error("Failed to sync row " + row + ". Server returned error: " + responseText);
    }
  } catch (err) {
    console.error("Connection error while syncing to backend: " + err.toString());
  }
}

/**
 * Format date objects to YYYY-MM-DD string
 */
function formatDate(dateVal) {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    const jsDate = new Date(dateVal);
    const year = jsDate.getFullYear();
    const month = ("0" + (jsDate.getMonth() + 1)).slice(-2);
    const day = ("0" + jsDate.getDate()).slice(-2);
    return year + "-" + month + "-" + day;
  }
  return dateVal.toString().split("T")[0];
}
