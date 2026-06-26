<script setup lang="ts">
// 서사(채팅) 팝업 — stage(폰 화면)를 덮는 오버레이.
// 카톡 느낌: 말풍선 + 작성시간. 내가 쓴 이름의 글은 오른쪽 정렬.
import { computed, nextTick, ref, watch } from 'vue'
import { useNarrative } from '@/stores/narrative'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { state, load, send, loadName } = useNarrative()

const myName = ref(loadName())
const draft = ref('')
const listEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)

// 입력 내용(줄 수)에 맞춰 textarea 높이 자동 조절 (CSS max-height 까지만 늘고 이후 스크롤)
function autoGrow() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// 열릴 때마다 최신 목록을 가져오고 맨 아래로 스크롤
watch(
  () => props.open,
  (open) => {
    if (!open) return
    myName.value = loadName()
    void load().then(scrollToBottom)
  },
)

watch(
  () => state.messages.length,
  () => {
    if (props.open) scrollToBottom()
  },
)

function scrollToBottom() {
  void nextTick(() => {
    const el = listEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

const canSend = computed(
  () => !state.sending && myName.value.trim() !== '' && draft.value.trim() !== '',
)

async function onSubmit() {
  if (!canSend.value) return
  const ok = await send(myName.value, draft.value)
  if (ok) {
    draft.value = ''
    void nextTick(autoGrow) // 보낸 뒤 textarea 높이 원상복구
    scrollToBottom()
  }
}

function isMine(sender: string): boolean {
  const me = myName.value.trim()
  return me !== '' && sender.trim() === me
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay ? `${hh}:${mm}` : `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`
}
</script>

<template>
  <transition name="nr-fade" @after-enter="scrollToBottom">
    <section v-if="open" class="nr" role="dialog" aria-modal="true" aria-label="서사">
      <header class="nr__bar">
        <h2 class="nr__title">서사</h2>
        <div class="nr__actions">
          <button
            class="nr__icon"
            :class="{ 'nr__icon--spin': state.status === 'loading' }"
            type="button"
            aria-label="새로고침"
            :disabled="state.status === 'loading'"
            @click="load"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20 11a8 8 0 1 0-.5 3M20 5v6h-6"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button class="nr__icon" type="button" aria-label="닫기" @click="emit('close')">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <div ref="listEl" class="nr__list">
        <template v-if="state.status === 'unconfigured'">
          <p class="nr__notice">
            아직 서사가 설정되지 않았습니다.<br />
            <small>src/config.ts 의 NARRATIVE_API_URL 을 설정해 주세요.</small>
          </p>
        </template>
        <template v-else-if="state.status === 'loading' && state.messages.length === 0">
          <p class="nr__notice">불러오는 중…</p>
        </template>
        <template v-else-if="state.status === 'error' && state.messages.length === 0">
          <p class="nr__notice">
            불러오지 못했습니다.<br /><small>{{ state.error }}</small>
          </p>
        </template>
        <template v-else-if="state.messages.length === 0">
          <p class="nr__notice">첫 메시지를 남겨보세요!</p>
        </template>

        <div
          v-for="(msg, i) in state.messages"
          :key="i"
          class="nr__row"
          :class="{ 'nr__row--mine': isMine(msg.sender) }"
        >
          <span v-if="!isMine(msg.sender)" class="nr__sender">{{ msg.sender }}</span>
          <div class="nr__bubbleline">
            <p class="nr__bubble">{{ msg.message }}</p>
            <time class="nr__time">{{ fmtTime(msg.timestamp) }}</time>
          </div>
        </div>
      </div>

      <form class="nr__form" @submit.prevent="onSubmit">
        <input
          v-model="myName"
          class="nr__name"
          type="text"
          maxlength="20"
          placeholder="이름"
          aria-label="이름"
        />
        <div class="nr__send">
          <textarea
            ref="inputEl"
            v-model="draft"
            class="nr__input"
            rows="1"
            maxlength="2000"
            placeholder="메시지를 입력하세요"
            aria-label="메시지"
            @input="autoGrow"
          />
          <button class="nr__submit" type="submit" :disabled="!canSend" aria-label="전송">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12l16-8-6 16-3-7-7-1z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </form>
    </section>
  </transition>
</template>

<style scoped lang="scss">
.nr {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  background: #ece5dd; // 카톡풍 연한 베이지 배경
  color: $color-text;
}

// 상단 바
.nr__bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-4;
  background: #2b2b30;
  color: #fff;
}
.nr__title {
  margin: 0;
  font-size: $font-size-lg;
  font-weight: 700;
}
.nr__actions {
  display: flex;
  align-items: center;
  gap: $space-1;
}
.nr__icon {
  display: flex;
  padding: $space-1;
  background: transparent;
  color: #fff;
  border-radius: $radius-full;
  transition: opacity 0.15s ease;

  svg { width: 24px; height: 24px; }
  &:active { opacity: 0.6; }
  &:disabled { opacity: 0.5; }
}
.nr__icon--spin svg {
  animation: nr-spin 0.8s linear infinite;
}
@keyframes nr-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .nr__icon--spin svg { animation: none; }
}

// 메시지 목록
.nr__list {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: $space-4;
  display: flex;
  flex-direction: column;
  gap: $space-3;
  -webkit-overflow-scrolling: touch;
}

.nr__notice {
  margin: auto;
  color: $color-text-muted;
  text-align: center;
  line-height: 1.8;

  small { font-size: $font-size-sm; opacity: 0.8; }
}

// 한 줄(보낸이 이름 + 말풍선)
.nr__row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 80%;
}
.nr__row--mine {
  align-self: flex-end;
  align-items: flex-end;
}

.nr__sender {
  margin: 0 0 2px 4px;
  font-size: $font-size-xs;
  color: $color-text-muted;
}

// 말풍선 + 시간 (시간은 풍선 아래쪽 모서리에 붙임)
.nr__bubbleline {
  display: flex;
  align-items: flex-end;
  gap: $space-2;
}
.nr__row--mine .nr__bubbleline {
  flex-direction: row-reverse;
}

.nr__bubble {
  margin: 0;
  padding: $space-2 $space-3;
  border-radius: 14px;
  background: #fff;
  font-size: $font-size-sm;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  box-shadow: $shadow-sm;
}
.nr__row--mine .nr__bubble {
  background: #ffe45c; // 내 말풍선 (카톡 노랑)
}

.nr__time {
  flex: 0 0 auto;
  font-size: 10px;
  color: $color-text-muted;
}

// 입력 폼
.nr__form {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding: $space-3 $space-4 calc(#{$space-3} + env(safe-area-inset-bottom, 0px));
  background: #f7f4ef;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.nr__name {
  align-self: flex-start;
  width: 40%;
  min-width: 120px;
  padding: $space-2 $space-3;
  border: 1px solid $color-border;
  border-radius: $radius-full;
  background: #fff;
  font-size: $font-size-sm;
}

.nr__send {
  display: flex;
  align-items: flex-end;
  gap: $space-2;
}

.nr__input {
  flex: 1 1 auto;
  box-sizing: border-box;
  min-height: 38px; // 1줄 기본 높이
  max-height: 140px; // 이 높이까지 자동으로 늘어난 뒤 스크롤
  padding: $space-2 $space-3;
  border: 1px solid $color-border;
  border-radius: 18px;
  background: #fff;
  font-family: inherit;
  font-size: $font-size-sm;
  line-height: 1.5;
  resize: none;
  overflow-y: auto;
}

.nr__submit {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: $radius-full;
  background: $color-primary;
  color: #fff;
  transition: opacity 0.15s ease, transform 0.1s ease;

  svg { width: 20px; height: 20px; }
  &:not(:disabled):active { transform: scale(0.92); }
  &:disabled { opacity: 0.4; }
}

// 등장/퇴장
.nr-fade-enter-active,
.nr-fade-leave-active {
  transition: opacity 0.2s ease;
}
.nr-fade-enter-from,
.nr-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .nr-fade-enter-active,
  .nr-fade-leave-active {
    transition: none;
  }
}
</style>
