/**
 * 서사(채팅) 백엔드 — Google Apps Script
 * 캐릭터 데이터가 든 구글 시트에 "확장 프로그램 → Apps Script"로 붙여넣고
 * 웹 앱으로 배포하세요. (자세한 순서는 docs/narrative-setup.md 참고)
 *
 * - GET  : 서사 메시지 목록을 JSON 으로 반환
 * - POST : { sender, message } 를 받아 시트에 행 추가(작성시간 자동 기록)
 * - SHEET_NAME 시트 탭은 없으면 자동 생성됩니다.
 *   (이미 'guestbook' 탭으로 배포해 데이터가 있다면 값을 그대로 두세요.)
 */

var SHEET_NAME = 'guestbook'

function doGet() {
  var sheet = getSheet_()
  var values = sheet.getDataRange().getValues()
  var out = []
  for (var i = 1; i < values.length; i++) {
    var ts = values[i][0]
    var sender = values[i][1]
    var message = values[i][2]
    if (!sender && !message) continue
    out.push({
      timestamp: ts instanceof Date ? ts.toISOString() : String(ts),
      sender: String(sender),
      message: String(message),
    })
  }
  return json_({ ok: true, messages: out })
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents)
    var sender = String(data.sender || '').trim().slice(0, 20)
    var message = String(data.message || '').trim().slice(0, 2000)
    if (!sender || !message) return json_({ ok: false, error: 'empty' })
    getSheet_().appendRow([new Date(), sender, message])
    return json_({ ok: true })
  } catch (err) {
    return json_({ ok: false, error: String(err) })
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.appendRow(['timestamp', 'sender', 'message'])
  }
  return sheet
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
