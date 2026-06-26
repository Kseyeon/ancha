// =============================================================
// 캐릭터 데이터 스토어 — 구글 시트(CSV) 에서 가져옴
// - 앱 시작 시 SHEET_CSV_URL 에서 CSV 를 fetch → 파싱 → 화면에 표시
// - 시트의 열: name, age, gender, tags, image + 나머지 열 = 상세 탭
// =============================================================
import { reactive } from 'vue'
import heeImage from '@/assets/characters/hee.png'
// NARRATIVE_API_URL = 서사/일정/캐릭터가 공유하는 Apps Script 웹앱 주소(쓰기용)
import { SHEET_CSV_URL, NARRATIVE_API_URL } from '@/config'

/** 상세 페이지의 탭 한 개 (제목 + 본문) */
export interface CharacterSection {
  label: string
  body: string
}

export interface Character {
  id: string
  /** 개요 큰 제목 + 상세 헤더에 쓰는 대표 이름 = 영문이름 */
  name: string
  /** 기본정보 탭: 성(姓) */
  surname: string
  /** 기본정보 탭: 한글이름 */
  nameKo: string
  /** (구) 영문이름 열 — 현재는 name 을 영문이름으로 사용. 호환용으로만 보관 */
  nameEn: string
  age: string
  gender: string
  /** 기본정보 탭: 신장·체중 */
  bodySpec: string
  /** 기본정보 탭: 종족 */
  race: string
  /** 기본정보 탭: 소속 및 직업 */
  affiliation: string
  tags: string[]
  /** 'builtin:<key>' 형태이거나 외부 이미지 URL */
  image: string
  /** 상세 페이지 탭별 본문 (성격/특징/외관/기타 등) */
  sections: CharacterSection[]
}

export type LoadStatus = 'loading' | 'ready' | 'error' | 'unconfigured'

// 빌트인(번들) 이미지 매핑. 'builtin:hee' → 실제 import URL 로 해석.
const builtinImages: Record<string, string> = {
  hee: heeImage,
}

/** 저장된 image 값을 실제 <img src> 로 변환 */
export function resolveImage(image: string): string {
  if (image && image.startsWith('builtin:')) {
    return builtinImages[image.slice('builtin:'.length)] ?? ''
  }
  return image ?? ''
}

// 시트가 비었거나(미설정) 불러오기 실패 시 보여줄 데모 데이터
function demoCharacters(): Character[] {
  return [
    {
      id: 'hee',
      name: 'HEE',
      surname: '',
      nameKo: '희',
      nameEn: 'HEE',
      age: '불명',
      gender: '여',
      bodySpec: '-',
      race: '불명',
      affiliation: '-',
      tags: ['특징', '성격', '해시태그'],
      image: 'builtin:hee',
      sections: [
        { label: '성격', body: '성격입니다.\nㅇㄹㅇ\nㅇㅁㄹ\nㅁㄴㅇㅁ\nㅁㄴㅇㄹ' },
        { label: '특징', body: '' },
        { label: '외관', body: '' },
        { label: '기타', body: '' },
      ],
    },
  ]
}

// --- CSV 파서 (따옴표/줄바꿈/이스케이프 처리) ---
function parseCSV(input: string): string[][] {
  let text = input
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // BOM 제거
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }
    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (ch === '\r') {
      i++
      continue
    }
    if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    field += ch
    i++
  }
  row.push(field)
  rows.push(row)
  return rows
}

// 고정 의미를 가지는 열(=탭으로 만들지 않는 열).
// 헤더 이름을 정규화(소문자·공백/·/슬래시 제거)한 키 → Character 필드 매핑.
type ReservedField =
  | 'name'
  | 'surname'
  | 'nameKo'
  | 'nameEn'
  | 'age'
  | 'gender'
  | 'bodySpec'
  | 'race'
  | 'affiliation'
  | 'tags'
  | 'image'

const RESERVED_FIELD: Record<string, ReservedField> = {
  name: 'name',
  성: 'surname',
  age: 'age',
  나이: 'age',
  gender: 'gender',
  성별: 'gender',
  tags: 'tags',
  태그: 'tags',
  image: 'image',
  이미지: 'image',
  한글이름: 'nameKo',
  국문이름: 'nameKo',
  영문이름: 'nameEn',
  nameen: 'nameEn',
  신장체중: 'bodySpec',
  신장몸무게: 'bodySpec',
  종족: 'race',
  race: 'race',
  소속및직업: 'affiliation',
  소속직업: 'affiliation',
  소속: 'affiliation',
  직업: 'affiliation',
}

/** 헤더 비교용 정규화: 소문자 + 공백·중점(·)·슬래시·점·괄호·"및" 제거 */
function normKey(h: string): string {
  return h.toLowerCase().replace(/[\s·/.,()]|및/g, '')
}

function rowsToCharacters(rows: string[][]): Character[] {
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (nonEmpty.length < 2) return []

  const headers = (nonEmpty[0] ?? []).map((h) => h.trim())
  const keys = headers.map(normKey)

  // 필드 → 열 인덱스 (먼저 나온 열 우선)
  const fieldIndex: Partial<Record<ReservedField, number>> = {}
  keys.forEach((k, i) => {
    const field = RESERVED_FIELD[k]
    if (field && fieldIndex[field] === undefined) fieldIndex[field] = i
  })
  const idx = (field: ReservedField) => fieldIndex[field] ?? -1

  // 예약 열을 제외한 나머지 열 = 상세 탭 (열 순서 유지)
  const sectionCols = headers
    .map((label, i) => ({ label, i }))
    .filter(({ label, i }) => label !== '' && !RESERVED_FIELD[keys[i] ?? ''])

  const out: Character[] = []
  for (let r = 1; r < nonEmpty.length; r++) {
    const cells = nonEmpty[r] ?? []
    const get = (i: number) => (i >= 0 && i < cells.length ? (cells[i] ?? '').trim() : '')
    const name = get(idx('name'))
    if (!name) continue
    const tagsRaw = get(idx('tags'))
    out.push({
      id: `${name}-${r}`,
      name,
      surname: get(idx('surname')),
      nameKo: get(idx('nameKo')),
      nameEn: get(idx('nameEn')),
      age: get(idx('age')),
      gender: get(idx('gender')),
      bodySpec: get(idx('bodySpec')),
      race: get(idx('race')),
      affiliation: get(idx('affiliation')),
      tags: tagsRaw
        ? tagsRaw
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      image: get(idx('image')),
      sections: sectionCols.map(({ label, i }) => ({
        label,
        body: (cells[i] ?? '').trim(),
      })),
    })
  }
  return out
}

// 모듈 전역 싱글톤 상태
const state = reactive<{
  characters: Character[]
  status: LoadStatus
  error: string
}>({
  characters: SHEET_CSV_URL ? [] : demoCharacters(),
  status: SHEET_CSV_URL ? 'loading' : 'unconfigured',
  error: '',
})

async function fetchCharacters(): Promise<void> {
  if (!SHEET_CSV_URL) {
    state.status = 'unconfigured'
    if (state.characters.length === 0) {
      state.characters.splice(0, 0, ...demoCharacters())
    }
    return
  }
  state.status = 'loading'
  state.error = ''
  try {
    const res = await fetch(SHEET_CSV_URL, { redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    const chars = rowsToCharacters(parseCSV(text))
    state.characters.splice(0, state.characters.length, ...chars)
    state.status = 'ready'
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e)
    state.status = 'error'
    // 실패해도 화면이 비지 않도록 데모 유지
    if (state.characters.length === 0) {
      state.characters.splice(0, 0, ...demoCharacters())
    }
    console.error('[characters] 구글 시트 불러오기 실패:', state.error)
  }
}

// 모듈 로드 시 1회 가져오기
void fetchCharacters()

/** 편집 가능한 기본정보 필드 (name = 영문이름) */
export type EditableField =
  | 'name'
  | 'surname'
  | 'nameKo'
  | 'age'
  | 'gender'
  | 'bodySpec'
  | 'race'
  | 'affiliation'

/**
 * 캐릭터 수정 — Apps Script 로 저장 + 화면 즉시 반영(낙관적 업데이트).
 * (CSV 캐시 때문에 하드 새로고침 시 몇 분 지연될 수 있으나 시트엔 즉시 저장됨)
 */
async function updateCharacter(
  target: Character,
  changes: { fields?: Partial<Record<EditableField, string>>; sections?: Record<string, string> },
): Promise<boolean> {
  if (!NARRATIVE_API_URL) return false
  try {
    await fetch(NARRATIVE_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        type: 'character',
        name: target.name,
        fields: changes.fields ?? {},
        sections: changes.sections ?? {},
      }),
    })
    // 낙관적 반영 (시트 재조회 없이 화면 즉시 갱신)
    if (changes.fields) Object.assign(target, changes.fields)
    if (changes.sections) {
      for (const [label, body] of Object.entries(changes.sections)) {
        const sec = target.sections.find((s) => s.label === label)
        if (sec) sec.body = body
      }
    }
    return true
  } catch (e) {
    console.error('[characters] 수정 저장 실패:', e)
    return false
  }
}

/** 컴포넌트에서 사용하는 진입점 */
export function useCharacters() {
  return {
    characters: state.characters,
    /** 'loading' | 'ready' | 'error' | 'unconfigured' */
    state,
    /** 다시 불러오기 */
    reload: fetchCharacters,
    /** 캐릭터 수정 저장 */
    update: updateCharacter,
    /** 수정(쓰기) 가능 여부 = Apps Script 설정됨 */
    canEdit: !!NARRATIVE_API_URL,
  }
}
