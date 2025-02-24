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
      .map(row => row[1])
      .flat()
      .filter(String);
  } else if (shiftType === 'מיזם טריו' || shiftType === 'דמו') {
    // Return doctors that don't have 'רפואה שלמה' in column A
    return data
      .filter(row => row[0] !== 'רפואה שלמה')
      .map(row => row[1])
      .flat()
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

// Helper function to get field value based on shift type
function getFieldValueByShiftType(formData, fieldName) {
  const shiftType = formData.shiftType;
  switch(fieldName) {
    case 'casesHandled':
      if (shiftType === 'מיזם טריו') return formData.casesHandled || '';
      if (shiftType === 'דמו') return formData.demoCasesHandled || '';
      if (shiftType === 'רפואה שלמה') return formData.refoahCasesHandled || '';
      return '';
      
    case 'macabiTasks':
      return shiftType === 'מיזם טריו' ? formData.macabiTasks || '0' : '';
      
    case 'shiftQuality':
      return shiftType === 'מיזם טריו' ? formData.shiftQuality || '4' : '';
      
    case 'communicationClarity':
      return shiftType === 'דמו' ? formData.communicationClarity || '4' : '';
      
    case 'communicationPleasantness':
      return shiftType === 'דמו' ? formData.communicationPleasantness || '4' : '';
      
    case 'screenshots':
      if (shiftType === 'דמו') return formData.screenshotsSent || '';
      if (shiftType === 'רפואה שלמה') return formData.refoahScreenshots || '';
      return '';
      
    case 'shiftOrder':
      if (shiftType === 'דמו') return formData.demoShiftOrder || '';
      if (shiftType === 'הכשרה') return formData.trainingShiftOrder || '';
      return '';
      
    case 'instructorName':
      return shiftType === 'הכשרה' ? formData.rofeName || '' : ''; // שימוש ב-rofeName גם למדריך
      
    case 'trainingQuality':
      return shiftType === 'הכשרה' ? formData.trainingQuality || '4' : '';
      
    default:
      return '';
  }
}

function submitForm(formData) {
  var sheet = getSpreadsheet().getSheetByName('כרטיס משמרת');

  if (!sheet) {
    throw new Error('גיליון כרטיס משמרת לא קיים');
  }

  var timestamp = new Date();

  // Prepare the basic row data (columns A-K)
  var rowData = [
    timestamp,
    formData.rofanName || '',
    formData.shiftType || '',
    formData.rofeName || '',
    formData.sessionDate || '', // התאריך כבר מגיע בפורמט DD/MM/YYYY
    formData.startTime || '',
    formData.endTime || '',
    formData.calculatedDuration || '',
    formData.manualDuration || '',
    formData.location || '',
    formData.notes || ''
  ];

  // Add the additional fields (columns L-T)
  const additionalFields = [
    getFieldValueByShiftType(formData, 'casesHandled'),     // L: מספר תיקים שטופלו
    getFieldValueByShiftType(formData, 'macabiTasks'),      // M: משימות במערכת מכבי
    getFieldValueByShiftType(formData, 'shiftQuality'),     // N: איכות המשמרת
    getFieldValueByShiftType(formData, 'communicationClarity'), // O: בהירות התקשורת
    getFieldValueByShiftType(formData, 'communicationPleasantness'), // P: נעימות התקשורת
    getFieldValueByShiftType(formData, 'screenshots'),      // Q: נשלחו צילומי מסך
    getFieldValueByShiftType(formData, 'shiftOrder'),       // R: סדר המשמרת
    formData.shiftType === 'הכשרה' ? formData.rofeName : formData.rofeName, // S: שם המדריך/רופא
    getFieldValueByShiftType(formData, 'trainingQuality')   // T: איכות ההדרכה
  ];

  rowData = rowData.concat(additionalFields);

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
      emailBody += 'משמרת חדשה נרשמה עבורך בהצלחה עם הפרטים הבאים:\n\n';

      // שדות בסיסיים (A-K)
      const baseFields = [
        { key: 'shiftType', hebrew: 'סוג משמרת' },
        { key: 'rofeName', hebrew: 'שם הרופא/ה' },
        { key: 'sessionDate', hebrew: 'תאריך הססיה' },
        { key: 'startTime', hebrew: 'שעת התחלה' },
        { key: 'endTime', hebrew: 'שעת סיום' },
        { key: 'calculatedDuration', hebrew: 'משך משמרת מחושב' },
        { key: 'manualDuration', hebrew: 'משך משמרת ידני' },
        { key: 'location', hebrew: 'מיקום המשמרת' },
        { key: 'notes', hebrew: 'הערות למשמרת' }
      ];

      // הוספת שדות בסיסיים
      baseFields.forEach(field => {
        if (formData[field.key]) {
          emailBody += field.hebrew + ': ' + formData[field.key] + '\n';
        }
      });

      emailBody += '\nשדות נוספים לפי סוג המשמרת:\n';

      // הוספת שדות לפי סוג משמרת בסדר העמודות החדש
      const additionalFields = [
        // L: מספר תיקים שטופלו
        { type: 'מיזם טריו', key: 'casesHandled', hebrew: 'מספר תיקים שטופלו' },
        { type: 'דמו', key: 'demoCasesHandled', hebrew: 'מספר תיקים שטופלו' },
        { type: 'רפואה שלמה', key: 'refoahCasesHandled', hebrew: 'מספר תיקים שטופלו' },
        
        // M: משימות במערכת מכבי
        { type: 'מיזם טריו', key: 'macabiTasks', hebrew: 'משימות במערכת מכבי' },
        
        // N: איכות המשמרת
        { type: 'מיזם טריו', key: 'shiftQuality', hebrew: 'איכות המשמרת' },
        
        // O: בהירות התקשורת
        { type: 'דמו', key: 'communicationClarity', hebrew: 'בהירות התקשורת' },
        
        // P: נעימות התקשורת
        { type: 'דמו', key: 'communicationPleasantness', hebrew: 'נעימות התקשורת' },
        
        // Q: נשלחו צילומי מסך
        { type: 'דמו', key: 'screenshotsSent', hebrew: 'נשלחו צילומי מסך' },
        { type: 'רפואה שלמה', key: 'refoahScreenshots', hebrew: 'נשלחו צילומי מסך' },
        
        // R: סדר המשמרת
        { type: 'דמו', key: 'demoShiftOrder', hebrew: 'סדר המשמרת' },
        { type: 'הכשרה', key: 'trainingShiftOrder', hebrew: 'סדר המשמרת' },
        
        // S: שם המדריך
        { type: 'הכשרה', key: 'rofeName', hebrew: 'שם המדריך' }, // שימוש ב-rofeName
        
        // T: איכות ההדרכה
        { type: 'הכשרה', key: 'trainingQuality', hebrew: 'איכות ההדרכה' }
      ];

      // הוספת השדות הרלוונטיים לפי סוג המשמרת
      additionalFields.forEach(field => {
        if (field.type === formData.shiftType && formData[field.key]) {
          emailBody += field.hebrew + ': ' + formData[field.key] + '\n';
        }
      });

      emailBody += '\nתודה.';

      try {
        MailApp.sendEmail({
          to: rofanEmail,
          subject: emailSubject,
          body: emailBody
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

    return 'הנתונים נשמרו בהצלחה!';
  } catch (error) {
    throw new Error('שגיאה בשמירת הנתונים: ' + error.toString());
  }
}
