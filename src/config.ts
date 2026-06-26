// =============================================================
// 데이터 소스 설정
// =============================================================
//
// 구글 시트를 CSV로 게시한 주소를 아래에 붙여넣으세요.
//
// [게시 방법]
//  1) 구글 시트 열기
//  2) 파일 → 공유 → 웹에 게시(Publish to web)
//  3) "전체 문서" 또는 해당 시트 선택, 형식을 "쉼표로 구분된 값(.csv)"으로
//  4) 게시 → 나오는 URL을 복사해서 아래 SHEET_CSV_URL 에 붙여넣기
//     (형식 예: https://docs.google.com/spreadsheets/d/e/2PACX-xxxx/pub?gid=0&single=true&output=csv)
//
// [시트 구성 — 1행은 헤더]
//  name | age | gender | tags | image | 한글이름 | 영문이름 | 신장체중 | 종족 | 소속및직업 | 성격 | 특징 | 외관 | 기타 | ...
//
//  ─ 고정 의미의 열(=탭으로 안 만들어짐): name, age(나이), gender(성별), tags(태그), image(이미지)
//  ─ "기본정보" 탭에 표시되는 열:
//        한글이름 / 영문이름 / 나이 / 성별 / 신장체중 / 종족 / 소속및직업
//        (헤더 이름은 공백·중점(·)·"및" 등을 무시하고 인식합니다. 예: "신장·체중" = "신장체중")
//  ─ 그 외 열(성격/특징/외관/기타 등)은 그대로 "상세 페이지 탭"이 됩니다 (열 순서대로)
//        → "외관" 탭을 원하면 시트에 "외관" 열을 추가하면 됩니다.
//  ─ tags 는 한 셀 안에서 쉼표로 구분 (예: 특징, 성격, 해시태그)
//  ─ image 는 "builtin:hee"(번들 이미지) 또는 이미지 URL
//  ─ 본문에 줄바꿈은 셀 안에서 Alt+Enter 로 입력 가능
//
export const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9jhtoHEVtUEAdnpJ6bpAKydvzdSnR6a3UgiM6f5YaQXJLyt-DUwWzumjASLRWo34wAciYnMVAfpJ4/pub?output=csv'

// =============================================================
// 서사(채팅) 설정 — Google Apps Script 웹앱 주소
// =============================================================
//
// 서사는 읽기·쓰기를 모두 Apps Script 웹앱으로 처리합니다.
// (CSV 게시 방식과 달리 새 글이 즉시 반영됩니다.)
// 설정 순서는 docs/narrative-setup.md 참고.
// 웹 앱 URL 은 반드시 …/exec 로 끝나야 하고, 액세스 권한은 "모든 사용자"여야 합니다.
//
export const NARRATIVE_API_URL = 'https://script.google.com/macros/s/AKfycbwC8T5zV3tUguoAOBb3cftgvU7VWWOTF4HKZ-GOXvHTbcyI1NIeH6e3Z_4FyxDsFG48/exec'

// =============================================================
// 캘린더 일정 설정 — Google Apps Script 웹앱 주소 (읽기+쓰기)
// =============================================================
//
// 캘린더는 서사와 같은 Apps Script 웹앱을 함께 사용합니다.
// docs/narrative.gs 를 (서사+캘린더 통합 버전으로) 붙여넣고 "새 버전"으로 재배포하면,
// 서사용 URL 과 동일한 …/exec 주소 하나로 캘린더 읽기/쓰기까지 처리됩니다.
//
// → 아래 값은 서사(NARRATIVE_API_URL)와 같은 URL 로 두면 됩니다.
//   (스크립트를 통합 버전으로 재배포해야 캘린더가 동작합니다. 그 전엔 모두 "아무 것도 안 합니다.")
//
// 시트 탭 'calendar'(date | content)는 첫 일정 저장 시 자동 생성됩니다.
//
export const CALENDAR_API_URL = 'https://script.google.com/macros/s/AKfycbwC8T5zV3tUguoAOBb3cftgvU7VWWOTF4HKZ-GOXvHTbcyI1NIeH6e3Z_4FyxDsFG48/exec'
