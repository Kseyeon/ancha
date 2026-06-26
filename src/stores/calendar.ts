// =============================================================
// 캘린더 일정 스토어 — Google Apps Script 웹앱에서 읽고 씀 (서사와 같은 URL 공유)
// - 읽기: GET ?type=calendar → { events: [{date, content}] }
// - 쓰기: POST { type:'calendar', date, content } → 해당 날짜 upsert (내용 비우면 삭제)
// =============================================================
import { reactive } from 'vue'
import { CALENDAR_API_URL } from '@/config'

export type CalendarStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured'

const state = reactive<{
  events: Record<string, string>
  status: CalendarStatus
  error: string
  saving: boolean
}>({
  events: {},
  status: CALENDAR_API_URL ? 'idle' : 'unconfigured',
  error: '',
  saving: false,
})

/** 2026-06-16 / 2026.06.16 / 2026/6/16 → 2026-06-16 */
export function normDateKey(s: string): string {
  const m = s.trim().match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (!m) return ''
  const y = m[1] ?? ''
  const mo = (m[2] ?? '').padStart(2, '0')
  const d = (m[3] ?? '').padStart(2, '0')
  return `${y}-${mo}-${d}`
}

/** 일정 목록 불러오기 */
async function load(): Promise<void> {
  if (!CALENDAR_API_URL) {
    state.status = 'unconfigured'
    return
  }
  state.status = 'loading'
  state.error = ''
  try {
    const url = CALENDAR_API_URL + (CALENDAR_API_URL.includes('?') ? '&' : '?') + 'type=calendar'
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as {
      ok?: boolean
      error?: string
      events?: { date: string; content: string }[]
    }
    if (!data.ok) throw new Error(data.error || '불러오기 실패')
    const map: Record<string, string> = {}
    for (const e of data.events ?? []) {
      const key = normDateKey(e.date)
      if (key && e.content) map[key] = e.content
    }
    state.events = map
    state.status = 'ready'
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e)
    state.status = 'error'
    console.error('[calendar] 불러오기 실패:', state.error)
  }
}

/**
 * 일정 저장(upsert). 내용을 비우면 해당 날짜 삭제. 성공하면 true.
 * 서사와 동일하게 no-cors + text/plain 으로 보낸 뒤 다시 load() 로 동기화.
 */
async function save(dateKey: string, content: string): Promise<boolean> {
  if (!CALENDAR_API_URL) return false
  const key = normDateKey(dateKey)
  if (!key) return false
  state.saving = true
  state.error = ''
  try {
    await fetch(CALENDAR_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type: 'calendar', date: key, content: content.trim() }),
    })
    await load()
    return true
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e)
    console.error('[calendar] 저장 실패:', state.error)
    return false
  } finally {
    state.saving = false
  }
}

void load()

export function useCalendar() {
  return {
    state,
    load,
    save,
    /** 해당 날짜키(YYYY-MM-DD)의 일정 내용. 없으면 '' */
    eventFor: (key: string) => state.events[key] ?? '',
  }
}
