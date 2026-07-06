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
const BACKEND_URL = "http://YOUR_DEPLOYED_BACKEND_IP_OR_DOMAIN/api/sync/sheets"; 
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
  // A: FeeRecord ID, B: Student Email, C: Student Name, D: Course, E: Batch, F: Total Fee, G: Paid Amount, H: Pending Amount, I: Status, J: Next Due Date
  const values = sheet.getRange(row, 1, 1, 10).getValues()[0];
  
  const id = values[0] ? values[0].toString().trim() : "";
  const email = values[1] ? values[1].toString().trim() : "";
  const name = values[2] ? values[2].toString().trim() : "";
  const course = values[3] ? values[3].toString().trim() : "";
  const batch = values[4] ? values[4].toString().trim() : "";
  const totalFee = values[5] ? parseFloat(values[5]) : 0;
  const nextDueDate = values[9] ? formatDate(values[9]) : "";

  // If email is missing, we cannot sync or create a student
  if (!email) {
    console.log("Row " + row + " skipped: Student Email is empty.");
    return;
  }

  // Prevent sending webhook if the edit was just to write the MongoDB ID or read-only fields
  const col = range.getColumn();
  if (col === 1 || col === 7 || col === 8 || col === 9) {
    console.log("Row " + row + " edit ignored: Edit was on read-only column " + col);
    return;
  }

  console.log("Syncing row " + row + " (Email: " + email + ") to backend...");

  const payload = {
    action: "upsert",
    data: {
      id: id,
      email: email,
      name: name,
      course: course,
      batch: batch,
      totalFee: totalFee,
      nextDueDate: nextDueDate
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-sync-token": SYNC_TOKEN
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
        // Paid Amount (Col G)
        sheet.getRange(row, 7).setValue(resData.paidAmount);
        // Pending Amount (Col H)
        sheet.getRange(row, 8).setValue(resData.pendingAmount);
        // Status (Col I)
        sheet.getRange(row, 9).setValue(resData.status);
        // Normalized Name and Email just in case
        if (resData.name) sheet.getRange(row, 3).setValue(resData.name);
        if (resData.email) sheet.getRange(row, 2).setValue(resData.email);
        
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
