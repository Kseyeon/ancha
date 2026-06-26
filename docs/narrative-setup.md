# 서사(채팅) 설정 가이드

서사는 구글 시트에 메시지를 저장합니다. 읽기·쓰기를 모두
**Google Apps Script 웹앱**으로 처리하므로 새 글이 즉시 반영됩니다.

작성시간(timestamp)은 글을 남길 때 서버에서 **자동으로 기록**됩니다.

---

## 1. Apps Script 코드 붙여넣기

1. 캐릭터 데이터가 들어 있는 **구글 시트**를 엽니다.
2. 상단 메뉴 **확장 프로그램(Extensions) → Apps Script** 클릭.
3. 편집기에 있던 기본 코드를 모두 지우고,
   [`narrative.gs`](./narrative.gs) 의 내용을 **전부 복사해서 붙여넣기**.
4. 💾 저장(Ctrl+S).

> 메시지를 저장하는 시트 탭은 따로 만들 필요 없습니다 — 첫 글이 등록될 때 자동 생성됩니다.

## 2. 웹 앱으로 배포

1. 우측 상단 **배포(Deploy) → 새 배포(New deployment)**.
2. 톱니바퀴(유형 선택) → **웹 앱(Web app)** 선택.
3. 설정:
   - **설명**: 아무거나 (예: narrative)
   - **실행 계정(Execute as)**: `나(Me)`
   - **액세스 권한(Who has access)**: `모든 사용자(Anyone)`
4. **배포** 클릭 → 권한 승인(처음 한 번, 본인 구글 계정으로 허용).
5. 나오는 **웹 앱 URL**을 복사 (형태: `https://script.google.com/macros/s/AKfy.../exec`).

## 3. 앱에 URL 연결

[`src/config.ts`](../src/config.ts) 의 `NARRATIVE_API_URL` 에 2번에서 복사한 URL을 붙여넣습니다.

```ts
export const NARRATIVE_API_URL = 'https://script.google.com/macros/s/AKfy.../exec'
```

저장 후 앱을 새로고침하면, 메인 화면 우상단의 **말풍선 아이콘**으로 서사가 열립니다.

---

## 코드를 고친 뒤에는?

`narrative.gs` 를 수정하면 **배포 → 배포 관리(Manage deployments) → 연필(수정) →
버전을 "새 버전"으로 → 배포** 해야 변경이 반영됩니다.
(URL은 그대로 유지되므로 config 는 다시 안 바꿔도 됩니다.)

## 시트 구조

스크립트가 자동으로 만드는 탭은 이렇게 생깁니다:

| timestamp | sender | message |
|-----------|--------|---------|
| 2026-06-26T05:30:12.000Z | 철수 | 안녕! |

`timestamp` 는 서버가 자동으로 채우는 작성시간입니다. 직접 건드릴 필요 없습니다.
