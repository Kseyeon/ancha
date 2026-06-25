// =============================================================
// 캐릭터 데이터 스토어 — 구글 시트(CSV) 에서 가져옴
// - 앱 시작 시 SHEET_CSV_URL 에서 CSV 를 fetch → 파싱 → 화면에 표시
// - 시트의 열: name, age, gender, tags, image + 나머지 열 = 상세 탭
// =============================================================
import { reactive } from 'vue'
import heeImage from '@/assets/characters/hee.png'
import { SHEET_CSV_URL } from '@/config'

/** 상세 페이지의 탭 한 개 (제목 + 본문) */
export interface CharacterSection {
  label: string
  body: string
}

export interface Character {
  id: string
  name: string
  age: string
  gender: string
  tags: string[]
  /** 'builtin:<key>' 형태이거나 외부 이미지 URL */
  image: string
  /** 상세 페이지 탭별 본문 */
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
      age: '???',
      gender: '여',
      tags: ['특징', '성격', '해시태그'],
      image: 'builtin:hee',
      sections: [
        { label: '성격', body: '성격입니다.\nㅇㄹㅇ\nㅇㅁㄹ\nㅁㄴㅇㅁ\nㅁㄴㅇㄹ' },
        { label: '특징', body: '' },
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

const RESERVED = ['name', 'age', 'gender', 'tags', 'image']

function rowsToCharacters(rows: string[][]): Character[] {
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''))
  if (nonEmpty.length < 2) return []

  const headers = (nonEmpty[0] ?? []).map((h) => h.trim())
  const lower = headers.map((h) => h.toLowerCase())
  const col = (key: string) => lower.indexOf(key)
  const nameI = col('name')
  const ageI = col('age')
  const genderI = col('gender')
  const tagsI = col('tags')
  const imageI = col('image')

  // 예약 열을 제외한 나머지 열 = 상세 탭 (열 순서 유지)
  const sectionCols = headers
    .map((label, i) => ({ label, i }))
    .filter(({ label, i }) => label !== '' && !RESERVED.includes(lower[i] ?? ''))

  const out: Character[] = []
  for (let r = 1; r < nonEmpty.length; r++) {
    const cells = nonEmpty[r] ?? []
    const get = (i: number) => (i >= 0 && i < cells.length ? (cells[i] ?? '').trim() : '')
    const name = get(nameI)
    if (!name) continue
    const tagsRaw = get(tagsI)
    out.push({
      id: `${name}-${r}`,
      name,
      age: get(ageI),
      gender: get(genderI),
      tags: tagsRaw
        ? tagsRaw
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      image: get(imageI),
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

/** 컴포넌트에서 사용하는 진입점 */
export function useCharacters() {
  return {
    characters: state.characters,
    /** 'loading' | 'ready' | 'error' | 'unconfigured' */
    state,
    /** 다시 불러오기 */
    reload: fetchCharacters,
  }
}
