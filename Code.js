// Code.gs
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('טופס כרטיס משמרת')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

const SPREADSHEET_ID = '1UxQn7mAinamXXZ6WuK0Zp8aRdfYqXCQ6mf-n4fYVZ8c';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// פונקציה פשוטה לכתיבת לוג
function writeToLog(action, details) {
  const ss = getSpreadsheet();
  let logSheet = ss.getSheetByName('log');
  
  if (!logSheet) {
    logSheet = ss.insertSheet('log');
    logSheet.appendRow(['Timestamp', 'Action', 'Details']);
  }
  
  logSheet.appendRow([new Date(), action, JSON.stringify(details)]);
}

function getRofanList() {
  var sheet = getSpreadsheet().getSheetByName('כרטיס רפואן');
  var data = sheet.getRange('B2:B' + sheet.getLastRow()).getValues();
  return data.flat().filter(String); // Remove empty values
}

function getRofeList(shiftType) {
  var sheet = getSpreadsheet().getSheetByName('כרטיס לקוח');
  var lastRow = sheet.getLastRow();
  var data = sheet.getRange('A2:B' + lastRow).getValues();
  
  // Filter based on shift type
  if (shiftType === 'רפואה שלמה') {
    // Return only doctors with 'רפואה שלמה' in column A
    return data
      .filter(row => row[0] === 'רפואה שלמה')
      .map(row => row[1])
      .filter(String);
  } else if (shiftType === 'מיזם טריו' || shiftType === 'דמו') {
    // Return doctors that don't have 'רפואה שלמה' in column A
    return data
      .filter(row => row[0] !== 'רפואה שלמה')
      .map(row => row[1])
      .filter(String);
  }
  
  return []; // Return empty array for 'הכשרה' or invalid types
}

function submitForm(formData) {
  // לוג בתחילת שליחת הטופס
  writeToLog('submitForm-start', formData);
  
  var sheet = getSpreadsheet().getSheetByName('כרטיס משמרת');
  
  // בדיקה אם הגיליון קיים
  if (!sheet) {
    writeToLog('submitForm-error', 'גיליון כרטיס משמרת לא קיים');
    throw new Error('גיליון כרטיס משמרת לא קיים');
  }

  var timestamp = new Date();
  
  // Prepare the row data
  var rowData = [
    timestamp,
    formData.rofanName || '',
    formData.shiftType || '',
    formData.rofeName || '',
    formData.sessionDate || '',
    formData.startTime || '',
    formData.endTime || '',
    formData.calculatedDuration || '',
    formData.manualDuration || '',
    formData.location || '',
    formData.notes || ''
  ];

  // Add additional fields based on shift type
  if (formData.shiftType === 'מיזם טריו') {
    rowData = rowData.concat([
      formData.casesHandled || '',
      formData.macabiTasks || '',
      formData.shiftQuality || ''
    ]);
  } else if (formData.shiftType === 'דמו') {
    rowData = rowData.concat([
      formData.demoShiftOrder || '',
      formData.demoCasesHandled || '',
      formData.communicationClarity || '',
      formData.communicationPleasantness || '',
      formData.screenshotsSent || ''
    ]);
  } else if (formData.shiftType === 'הכשרה') {
    rowData = rowData.concat([
      formData.trainingShiftOrder || '',
      formData.instructorName || '',
      formData.trainingQuality || ''
    ]);
  } else if (formData.shiftType === 'רפואה שלמה') {
    rowData = rowData.concat([
      formData.refoahScreenshots || '',
      formData.refoahCasesHandled || ''
    ]);
  }

  // לוג לפני הוספת השורה
  writeToLog('submitForm-before-append', { rowData: rowData });
  
  try {
    // Get the last row and append data
    var lastRow = sheet.getLastRow();
    var range = sheet.getRange(lastRow + 1, 1, 1, rowData.length);
    range.setValues([rowData]);
    
    // לוג אחרי הוספת השורה בהצלחה
    writeToLog('submitForm-success', { lastRow: lastRow, rowData: rowData });
    
    return 'הנתונים נשמרו בהצלחה!';
  } catch (error) {
    // לוג במקרה של שגיאה
    writeToLog('submitForm-error', { error: error.toString(), rowData: rowData });
    throw new Error('שגיאה בשמירת הנתונים: ' + error.toString());
  }
}
