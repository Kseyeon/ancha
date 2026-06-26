// =============================================================
// 갤러리(추가 사진) 스토어 — Apps Script 웹앱 공유 (서사/일정/캐릭터와 같은 URL)
// - 읽기: GET ?type=gallery → { photos: [{url}] }
// - 추가: POST { type:'gallery', action:'add', url }
// - 삭제: POST { type:'gallery', action:'delete', url }
// 캐릭터 일러스트와 별개로, 사용자가 URL 로 추가한 사진만 다룬다.
// =============================================================
import { reactive } from 'vue'
import { NARRATIVE_API_URL } from '@/config'

export type GalleryStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured'

const state = reactive<{
  photos: string[]
  status: GalleryStatus
  error: string
  saving: boolean
}>({
  photos: [],
  status: NARRATIVE_API_URL ? 'idle' : 'unconfigured',
  error: '',
  saving: false,
})

async function load(): Promise<void> {
  if (!NARRATIVE_API_URL) {
    state.status = 'unconfigured'
    return
  }
  state.status = 'loading'
  state.error = ''
  try {
    const url = NARRATIVE_API_URL + (NARRATIVE_API_URL.includes('?') ? '&' : '?') + 'type=gallery'
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { ok?: boolean; error?: string; photos?: { url: string }[] }
    if (!data.ok) throw new Error(data.error || '불러오기 실패')
    state.photos = (data.photos ?? []).map((p) => p.url).filter(Boolean)
    state.status = 'ready'
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e)
    state.status = 'error'
    console.error('[gallery] 불러오기 실패:', state.error)
  }
}

async function post(body: Record<string, unknown>): Promise<boolean> {
  if (!NARRATIVE_API_URL) return false
  state.saving = true
  state.error = ''
  try {
    await fetch(NARRATIVE_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type: 'gallery', ...body }),
    })
    await load()
    return true
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e)
    console.error('[gallery] 저장 실패:', state.error)
    return false
  } finally {
    state.saving = false
  }
}

/** 사진 추가 (이미지 URL) */
async function add(url: string): Promise<boolean> {
  const u = url.trim()
  if (!u) return false
  return post({ action: 'add', url: u })
}

/** 사진 삭제 (URL 일치 행 제거) */
async function remove(url: string): Promise<boolean> {
  return post({ action: 'delete', url })
}

void load()

export function useGallery() {
  return {
    state,
    load,
    add,
    remove,
    canEdit: !!NARRATIVE_API_URL,
  }
}
