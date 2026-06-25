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
//  name | age | gender | tags | image | 성격 | 특징 | 기타 | ...
//  ─ name/age/gender/tags/image 는 고정 의미의 열
//  ─ 그 외 열(성격/특징/기타 등)은 그대로 "상세 페이지 탭"이 됩니다 (열 순서대로)
//  ─ tags 는 한 셀 안에서 쉼표로 구분 (예: 특징, 성격, 해시태그)
//  ─ image 는 "builtin:hee"(번들 이미지) 또는 이미지 URL
//  ─ 본문에 줄바꿈은 셀 안에서 Alt+Enter 로 입력 가능
//
export const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS9jhtoHEVtUEAdnpJ6bpAKydvzdSnR6a3UgiM6f5YaQXJLyt-DUwWzumjASLRWo34wAciYnMVAfpJ4/pub?output=csv'
