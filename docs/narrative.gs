/**
 * 서사(채팅) + 캘린더 통합 백엔드 — Google Apps Script
 * 캐릭터 데이터가 든 구글 시트에 "확장 프로그램 → Apps Script"로 붙여넣고
 * 웹 앱으로 배포하세요. (자세한 순서는 docs/narrative-setup.md 참고)
 *
 * 하나의 웹앱 URL 로 두 기능을 처리합니다 (type 파라미터로 구분):
 *  - 서사(기본):  GET → 메시지 목록 / POST {sender, message} → 행 추가
 *  - 캘린더:      GET ?type=calendar → 일정 목록
 *                 POST {type:'calendar', date, content} → 해당 날짜 upsert(내용 비우면 삭제)
 *
 * 시트 탭('guestbook', 'calendar')은 없으면 자동 생성됩니다.
 */

var NARRATIVE_SHEET = 'guestbook'
var CALENDAR_SHEET = 'calendar'
var GALLERY_SHEET = 'gallery'

function doGet(e) {
  try {
    var type = (e && e.parameter && e.parameter.type) || 'narrative'
    if (type === 'calendar') return getCalendar_()
    if (type === 'gallery') return getGallery_()
    return getNarrative_()
  } catch (err) {
    return json_({ ok: false, error: String(err) })
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents)
    if (data.type === 'calendar') return postCalendar_(data)
    if (data.type === 'character') return postCharacter_(data)
    if (data.type === 'gallery') return postGallery_(data)
    return postNarrative_(data)
  } catch (err) {
    return json_({ ok: false, error: String(err) })
  }
}

// ---- 서사(채팅) ----
function getNarrative_() {
  var values = sheet_(NARRATIVE_SHEET, ['timestamp', 'sender', 'message']).getDataRange().getValues()
  var out = []
  for (var i = 1; i < values.length; i++) {
    var ts = values[i][0], sender = values[i][1], message = values[i][2]
    if (!sender && !message) continue
    out.push({
      timestamp: ts && typeof ts.toISOString === 'function' ? ts.toISOString() : String(ts),
      sender: String(sender),
      message: String(message),
    })
  }
  return json_({ ok: true, messages: out })
}

function postNarrative_(data) {
  var sender = String(data.sender || '').trim().slice(0, 20)
  var message = String(data.message || '').trim().slice(0, 2000)
  if (!sender || !message) return json_({ ok: false, error: 'empty' })
  sheet_(NARRATIVE_SHEET, ['timestamp', 'sender', 'message']).appendRow([new Date(), sender, message])
  return json_({ ok: true })
}

// ---- 캘린더 ----
function getCalendar_() {
  var values = sheet_(CALENDAR_SHEET, ['date', 'content']).getDataRange().getValues()
  var out = []
  for (var i = 1; i < values.length; i++) {
    var key = normDate_(values[i][0])
    if (!key) continue
    out.push({ date: key, content: String(values[i][1]) })
  }
  return json_({ ok: true, events: out })
}

function postCalendar_(data) {
  var key = normDate_(data.date)
  var content = String(data.content || '').trim().slice(0, 2000)
  if (!key) return json_({ ok: false, error: 'bad date' })
  var sheet = sheet_(CALENDAR_SHEET, ['date', 'content'])
  var values = sheet.getDataRange().getValues()
  var row = -1
  for (var i = 1; i < values.length; i++) {
    if (normDate_(values[i][0]) === key) { row = i + 1; break }
  }
  if (content === '') {
    if (row > 0) sheet.deleteRow(row) // 내용 비우면 삭제
  } else if (row > 0) {
    sheet.getRange(row, 2).setValue(content) // 기존 날짜 수정
  } else {
    sheet.appendRow([key, content]) // 새 날짜 추가
  }
  return json_({ ok: true })
}

// ---- 갤러리 (추가 사진) ----
function getGallery_() {
  var values = sheet_(GALLERY_SHEET, ['url']).getDataRange().getValues()
  var out = []
  for (var i = 1; i < values.length; i++) {
    var url = String(values[i][0]).trim()
    if (url) out.push({ url: url })
  }
  return json_({ ok: true, photos: out })
}

function postGallery_(data) {
  var url = String(data.url || '').trim()
  if (!url) return json_({ ok: false, error: 'no url' })
  var sheet = sheet_(GALLERY_SHEET, ['url'])
  if (data.action === 'delete') {
    var values = sheet.getDataRange().getValues()
    for (var i = values.length - 1; i >= 1; i--) {
      if (String(values[i][0]).trim() === url) sheet.deleteRow(i + 1)
    }
    return json_({ ok: true })
  }
  sheet.appendRow([url]) // add
  return json_({ ok: true })
}

// ---- 캐릭터 (상세 프로필 수정) ----
// 첫 번째 시트(캐릭터 시트)에서 name 열로 행을 찾아 해당 칸들을 수정.
function postCharacter_(data) {
  var name = String(data.name || '').trim()
  if (!name) return json_({ ok: false, error: 'no name' })

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0] // 캐릭터 = 첫 탭
  var values = sheet.getDataRange().getValues()
  if (values.length < 2) return json_({ ok: false, error: 'empty sheet' })
  var headers = values[0]

  // name 열 찾기
  var nameCol = -1
  for (var c = 0; c < headers.length; c++) {
    var hk = normKey_(headers[c])
    if (hk === 'name' || hk === '이름') { nameCol = c; break }
  }
  if (nameCol < 0) return json_({ ok: false, error: 'no name column' })

  // 행 찾기
  var rowIdx = -1
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][nameCol]).trim() === name) { rowIdx = r; break }
  }
  if (rowIdx < 0) return json_({ ok: false, error: 'not found' })

  // 기본정보 필드 → 열 별칭
  var FIELD_ALIASES = {
    name: ['name', '이름'], // 영문이름(대표 이름) = name 열
    surname: ['성'],
    nameKo: ['한글이름', '국문이름'],
    nameEn: ['영문이름', 'nameen'],
    age: ['age', '나이'],
    gender: ['gender', '성별'],
    bodySpec: ['신장체중', '신장몸무게'],
    race: ['종족', 'race'],
    affiliation: ['소속및직업', '소속직업', '소속', '직업'],
  }
  function colForAliases(aliases) {
    for (var c = 0; c < headers.length; c++) {
      var h = normKey_(headers[c])
      for (var a = 0; a < aliases.length; a++) {
        if (h === normKey_(aliases[a])) return c
      }
    }
    return -1
  }

  var fields = data.fields || {}
  for (var f in fields) {
    if (!FIELD_ALIASES[f]) continue
    var col = colForAliases(FIELD_ALIASES[f])
    if (col >= 0) sheet.getRange(rowIdx + 1, col + 1).setValue(String(fields[f]))
  }

  // 섹션(탭) → 헤더 라벨 매칭
  var sections = data.sections || {}
  for (var label in sections) {
    var scol = -1
    for (var c2 = 0; c2 < headers.length; c2++) {
      if (String(headers[c2]).trim() === label || normKey_(headers[c2]) === normKey_(label)) {
        scol = c2
        break
      }
    }
    if (scol >= 0) sheet.getRange(rowIdx + 1, scol + 1).setValue(String(sections[label]))
  }

  return json_({ ok: true })
}

// ---- 공용 ----
function normKey_(s) {
  return String(s).toLowerCase().replace(/[\s·\/.,()]/g, '').replace(/및/g, '')
}

function normDate_(s) {
  function p(n) { return ('0' + n).slice(-2) }
  // 이 런타임에선 instanceof Date 가 불안정해서 Date-유사 객체로 판별
  if (s && typeof s.getMonth === 'function') {
    return s.getFullYear() + '-' + p(s.getMonth() + 1) + '-' + p(s.getDate())
  }
  var m = String(s).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (!m) return ''
  return m[1] + '-' + p(m[2]) + '-' + p(m[3])
}

function sheet_(name, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
    sheet.appendRow(header)
  }
  return sheet
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
