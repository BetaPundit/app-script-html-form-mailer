function doGet(e){
  return handleResponse(e);
}

//  Enter sheet name where data is to be written below
        var SHEET_NAME = "Sheet1";

var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service

function handleResponse(e) {
  // shortly after my original solution Google announced the LockService[1]
  // this prevents concurrent access overwritting data
  // [1] http://googleappsdeveloper.blogspot.co.uk/2011/10/concurrency-and-google-apps-script.html
  // we want a public lock, one that locks for all invocations
  var lock = LockService.getPublicLock();
  lock.waitLock(30000);  // wait 30 seconds before conceding defeat.
  
  try {
    Logger.log(e);
    // next set where we write the data - you could write to multiple/alternate destinations
    var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    var sheet = doc.getSheetByName(SHEET_NAME);
    
    // we'll assume header is in row 1 but you can override with header_row in GET/POST data
    var headRow = e.parameter.header_row || 1;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow()+1; // get next row
    var row = []; 
    var result = '';
    var prevId = sheet.getRange(nextRow-1, 2, 1).getValues()[0][0]; // get previous id
    var id = +prevId + 1; // update current id by 1
    var flag = 0;
    
    // get all clg ids
    var allClgIds = sheet.getRange(1, 6, sheet.getLastRow()).getValues();
    
    // checking duplicate cld ids
//    for (var i in allClgIds) {
//      for (var j in allClgIds[i]) {
//        if (allClgIds[i][j] == e.parameter.clgId) {
//          result = "Sorry! You've already registered!"
//        } else {
//          result = "Registration Successful!"
//        }
//      }
//    }
    
    for (var i = 0; i < sheet.getLastRow(); i++) {
      if (allClgIds[i][0] == e.parameter.clgid) {
        result = "Sorry! You've already registered!"
        flag = 0;
        break;
      } else {
        result = "Registration Successful!"
        flag = 1;
      }
    }
    
    if (flag == 1) {
      // loop through the header columns
      for (i in headers){
        if (headers[i] == "Timestamp"){ // special case if you include a 'Timestamp' column
          row.push(new Date());
        } 
        else if (headers[i] == "id"){ // special case if you include a 'id' column
          row.push(id);
        } else { // else use header name to get data
          row.push(e.parameter[headers[i]]);
        }
      }
      // more efficient to set values as [][] array than individually
      sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
      
      //mailer script
      var email = e.parameter.email;
      var name = e.parameter.name;
      var clgName = e.parameter.clgName;
      var clgId = e.parameter.clgid;
      
      var message = 'Hey ' + '<em>' + name + '</em>' + '!<br/>' + 'This is your Spandan id: <br/>' + '<h1>' + 'SP' + id + '</h1>';
      
      MailApp.sendEmail({
        to: email,
        subject: "Here's is your Spandan id",
        replyTo: 'adityaas26@gmail.com',
        htmlBody: message
      });
      
    }
       
    // return json success results
    return ContentService
    .createTextOutput(JSON.stringify({"result": result, "row": nextRow, "id": id, "flag" : flag}))
          .setMimeType(ContentService.MimeType.JSON);
  } catch(e){
    // if error return this
    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": e}))
          .setMimeType(ContentService.MimeType.JSON);
  } finally { //release lock
    lock.releaseLock();
  }
}

function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
}
