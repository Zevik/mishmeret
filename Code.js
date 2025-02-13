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
      .map(row => row[1]) // Corrected map function
      .flat() // Added flat to handle nested arrays
      .filter(String);
  } else if (shiftType === 'מיזם טריו' || shiftType === 'דמו') {
    // Return doctors that don't have 'רפואה שלמה' in column A
    return data
      .filter(row => row[0] !== 'רפואה שלמה')
      .map(row => row[1]) // Corrected map function
      .flat() // Added flat to handle nested arrays
      .filter(String);
  }

  return []; // Return empty array for 'הכשרה' or invalid types
}

function getRofanEmailByName(rofanName) {
  const ss = getSpreadsheet();
  const rofanSheet = ss.getSheetByName('כרטיס רפואן');
  if (!rofanSheet) {
    return null;
  }
  const namesRange = rofanSheet.getRange('B2:B' + rofanSheet.getLastRow());
  const emailsRange = rofanSheet.getRange('D2:D' + rofanSheet.getLastRow());
  const names = namesRange.getValues().flat();
  const emails = emailsRange.getValues().flat();

  for (let i = 0; i < names.length; i++) {
    if (names[i] === rofanName) {
      return emails[i];
    }
  }
  return null; // Rofan not found or email not found
}


function submitForm(formData) {
  var sheet = getSpreadsheet().getSheetByName('כרטיס משמרת');

  // בדיקה אם הגיליון קיים
  if (!sheet) {
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

  try {
    // Get the last row and append data
    var lastRow = sheet.getLastRow();
    var range = sheet.getRange(lastRow + 1, 1, 1, rowData.length);
    range.setValues([rowData]);

    // Send Email Confirmation
    const rofanEmail = getRofanEmailByName(formData.rofanName);
    if (rofanEmail) {
      const emailSubject = 'משמרת חדשה נרשמה עבורך';
      let emailBody = 'שלום ' + formData.rofanName + ',\n\n';
      emailBody += 'משמרת חדשה נרשמה עבורך בהצלחה עם הפרטים הבאים:\n';

      const fieldNamesHebrew = {
        shiftType: 'סוג משמרת',
        rofeName: 'שם הרופא/ה',
        sessionDate: 'תאריך הססיה',
        startTime: 'שעת התחלה',
        endTime: 'שעת סיום',
        calculatedDuration: 'משך משמרת מחושב',
        manualDuration: 'משך משמרת ידני',
        location: 'מיקום המשמרת',
        notes: 'הערות למשמרת',
        casesHandled: 'מספר מקרים שטופלו',
        macabiTasks: 'משימות מכבי',
        shiftQuality: 'איכות משמרת',
        demoShiftOrder: 'מספר משמרת הדגמה',
        demoCasesHandled: 'מספר מקרים שטופלו בהדגמה',
        communicationClarity: 'בהירות תקשורת',
        communicationPleasantness: 'נעימות תקשורת',
        screenshotsSent: 'צילומי מסך נשלחו',
        trainingShiftOrder: 'מספר משמרת הכשרה',
        instructorName: 'שם מדריך/ה',
        trainingQuality: 'איכות הכשרה',
        refoahScreenshots: 'צילומי מסך רפואה שלמה',
        refoahCasesHandled: 'מספר מקרים שטופלו רפואה שלמה'
      };

      const fieldOrder = [
        'shiftType',
        'rofeName',
        'sessionDate',
        'startTime',
        'endTime',
        'calculatedDuration',
        'manualDuration',
        'location',
        'notes'
      ];

      for (const key of fieldOrder) {
        emailBody += fieldNamesHebrew[key] + ': ' + formData[key] + '\n';
      }

      // Add shift type specific fields after the general fields
      if (formData.shiftType === 'מיזם טריו') {
        emailBody += fieldNamesHebrew['casesHandled'] + ': ' + formData.casesHandled + '\n';
        emailBody += fieldNamesHebrew['macabiTasks'] + ': ' + formData.macabiTasks + '\n';
        emailBody += fieldNamesHebrew['shiftQuality'] + ': ' + formData.shiftQuality + '\n';
      } else if (formData.shiftType === 'דמו') {
        emailBody += fieldNamesHebrew['demoShiftOrder'] + ': ' + formData.demoShiftOrder + '\n';
        emailBody += fieldNamesHebrew['demoCasesHandled'] + ': ' + formData.demoCasesHandled + '\n';
        emailBody += fieldNamesHebrew['communicationClarity'] + ': ' + formData.communicationClarity + '\n';
        emailBody += fieldNamesHebrew['communicationPleasantness'] + ': ' + formData.communicationPleasantness + '\n';
        emailBody += fieldNamesHebrew['screenshotsSent'] + ': ' + formData.screenshotsSent + '\n';
      } else if (formData.shiftType === 'הכשרה') {
        emailBody += fieldNamesHebrew['trainingShiftOrder'] + ': ' + formData.trainingShiftOrder + '\n';
        emailBody += fieldNamesHebrew['instructorName'] + ': ' + formData.instructorName + '\n';
        emailBody += fieldNamesHebrew['trainingQuality'] + ': ' + formData.trainingQuality + '\n';
      } else if (formData.shiftType === 'רפואה שלמה') {
        emailBody += fieldNamesHebrew['refoahScreenshots'] + ': ' + formData.refoahScreenshots + '\n';
        emailBody += fieldNamesHebrew['refoahCasesHandled'] + ': ' + formData.refoahCasesHandled + '\n';
      }


      emailBody += '\nתודה.';

      try {
        MailApp.sendEmail({
          to: rofanEmail,
          subject: emailSubject,
          body: emailBody
        });
      } catch (emailError) {
        // Handle email error if needed, can log or ignore in production
      }
    } else {
      // Handle case where rofan email is not found if needed, can log or ignore in production
    }


    return 'הנתונים נשמרו בהצלחה!';
  } catch (error) {
    throw new Error('שגיאה בשמירת הנתונים: ' + error.toString());
  }
}