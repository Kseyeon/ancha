// =============================================================
// 서사(채팅) 스토어 — Google Apps Script 웹앱에서 읽고 씀
// - 읽기: NARRATIVE_API_URL 로 GET → JSON 메시지 목록
// - 쓰기: 같은 URL 로 POST → 시트에 행 추가(작성시간 자동 기록)
// =============================================================
import { reactive } from 'vue'
import { NARRATIVE_API_URL } from '@/config'

export interface NarrativeMessage {
  /** ISO 문자열(서버 작성시간) */
  timestamp: string
  sender: string
  message: string
}

export type NarrativeStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured'

const NAME_KEY = 'ancha.narrative.name'

const state = reactive<{
  messages: NarrativeMessage[]
  status: NarrativeStatus
  error: string
  sending: boolean
}>({
  messages: [],
  status: NARRATIVE_API_URL ? 'idle' : 'unconfigured',
  error: '',
  sending: false,
})

/** 마지막으로 쓴 이름(브라우저에 기억) — 내 말풍선을 오른쪽에 표시하는 데 사용 */
function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}
function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    /* 저장 실패는 무시 */
  }
}

/** 메시지 목록 불러오기 */
async function load(): Promise<void> {
  if (!NARRATIVE_API_URL) {
    state.status = 'unconfigured'
    return
  }
  state.status = 'loading'
  state.error = ''
  try {
    const res = await fetch(NARRATIVE_API_URL, { redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as {
      ok?: boolean
      error?: string
      messages?: NarrativeMessage[]
    }
    if (!data.ok) throw new Error(data.error || '불러오기 실패')
    state.messages.splice(0, state.messages.length, ...(data.messages ?? []))
    state.status = 'ready'
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e)
    state.status = 'error'
    console.error('[narrative] 불러오기 실패:', state.error)
  }
}

/**
 * 메시지 보내기. 성공하면 true.
 * Apps Script POST 는 CORS 사전요청(preflight)을 피하기 위해
 * no-cors + text/plain 으로 보냄 → 응답은 불투명(opaque)이라 읽을 수 없으므로,
 * 보낸 뒤 다시 load() 해서 서버 기준 목록으로 동기화한다.
 */
async function send(sender: string, message: string): Promise<boolean> {
  if (!NARRATIVE_API_URL) return false
  const s = sender.trim()
  const m = message.trim()
  if (!s || !m) return false
  state.sending = true
  state.error = ''
  try {
    await fetch(NARRATIVE_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ sender: s, message: m }),
    })
    saveName(s)
    await load() // 서버에서 작성시간 포함한 최신 목록 다시 가져오기
    return true
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e)
    console.error('[narrative] 전송 실패:', state.error)
    return false
  } finally {
    state.sending = false
  }
}

export function useNarrative() {
  return { state, load, send, loadName, saveName }
}
