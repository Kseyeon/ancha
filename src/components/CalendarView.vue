<script setup lang="ts">
// 캘린더 화면 — 월 달력 + 날짜 선택 + 하단 일정 카드(구글시트 연동).
import { computed, ref, watch } from 'vue'
import sparkle from '@/assets/characters/sparkle.png'
import { useCalendar } from '@/stores/calendar'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { state, eventFor, save, load } = useCalendar()

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function keyOf(y: number, m1: number, d: number) {
  return `${y}-${pad(m1)}-${pad(d)}`
}

const now = new Date()
const todayKey = keyOf(now.getFullYear(), now.getMonth() + 1, now.getDate())

const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth()) // 0-based
const selectedKey = ref(todayKey)

const monthLabel = computed(() => pad(viewMonth.value + 1))

interface Cell {
  day: number
  inMonth: boolean
  key: string
}

const cells = computed<Cell[]>(() => {
  const y = viewYear.value
  const m = viewMonth.value // 0-based
  const startWd = new Date(y, m, 1).getDay() // 0 = 일
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const prevDays = new Date(y, m, 0).getDate()

  const arr: Cell[] = []
  // 앞쪽 지난달 날짜
  for (let i = startWd - 1; i >= 0; i--) {
    arr.push({ day: prevDays - i, inMonth: false, key: '' })
  }
  // 이번 달
  for (let d = 1; d <= daysInMonth; d++) {
    arr.push({ day: d, inMonth: true, key: keyOf(y, m + 1, d) })
  }
  // 마지막 주를 채우는 다음달 날짜
  let next = 1
  while (arr.length % 7 !== 0) {
    arr.push({ day: next++, inMonth: false, key: '' })
  }
  return arr
})

const EMPTY_NOTE = '이날은 아무 것도 안 합니다.'
const selectedLabel = computed(() => selectedKey.value.replace(/-/g, '.'))
const note = computed(() => eventFor(selectedKey.value) || EMPTY_NOTE)

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}
function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}
function selectDay(c: Cell) {
  if (c.inMonth) selectedKey.value = c.key
}

// --- 일정 작성/수정 ---
const editing = ref(false)
const draft = ref('')

// 날짜를 바꾸면 편집 모드 해제
watch(selectedKey, () => {
  editing.value = false
})

function startEdit() {
  draft.value = eventFor(selectedKey.value)
  editing.value = true
}
function cancelEdit() {
  editing.value = false
}
async function saveEdit() {
  const ok = await save(selectedKey.value, draft.value)
  if (ok) editing.value = false
}
</script>

<template>
  <transition name="calendar-fade">
  <section v-if="open" class="calendar" role="dialog" aria-modal="true" aria-label="일정">
    <img class="calendar__deco" :src="sparkle" alt="" aria-hidden="true" draggable="false" />

    <h1 class="calendar__title">Calendar</h1>

    <div class="calendar__actions">
      <button
        class="calendar__icon"
        :class="{ 'is-spin': state.status === 'loading' }"
        type="button"
        aria-label="새로고침"
        :disabled="state.status === 'loading'"
        @pointerdown.stop
        @click.stop="load"
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
      <button class="calendar__icon" type="button" aria-label="닫기" @pointerdown.stop @click.stop="emit('close')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <div class="calendar__month">
      <button type="button" class="calendar__arrow" aria-label="이전 달" @pointerdown.stop @click.stop="prevMonth">‹</button>
      <span class="calendar__month-num">{{ monthLabel }}</span>
      <button type="button" class="calendar__arrow" aria-label="다음 달" @pointerdown.stop @click.stop="nextMonth">›</button>
    </div>

    <div class="calendar__weekdays">
      <span v-for="(w, i) in WEEKDAYS" :key="w" :class="{ 'is-sun': i === 0 }">{{ w }}</span>
    </div>

    <div class="calendar__grid">
      <button
        v-for="(c, i) in cells"
        :key="i"
        type="button"
        class="calendar__day"
        :class="{
          'is-out': !c.inMonth,
          'is-sun': i % 7 === 0,
          'is-selected': c.inMonth && c.key === selectedKey,
          'is-today': c.key === todayKey,
          'has-event': c.inMonth && !!eventFor(c.key),
        }"
        :disabled="!c.inMonth"
        @click.stop="selectDay(c)"
      >
        {{ c.day }}
      </button>
    </div>

    <div class="calendar__note">
      <div class="calendar__note-head">
        <p class="calendar__note-date">{{ selectedLabel }}</p>
        <button
          v-if="!editing && state.status !== 'unconfigured'"
          type="button"
          class="calendar__edit-btn"
          @pointerdown.stop
          @click.stop="startEdit"
        >
          {{ note === EMPTY_NOTE ? '추가' : '수정' }}
        </button>
      </div>

      <p v-if="!editing" class="calendar__note-text">{{ note }}</p>

      <template v-else>
        <textarea
          v-model="draft"
          class="calendar__note-input"
          rows="3"
          maxlength="2000"
          placeholder="일정을 입력하세요 (비우고 저장하면 삭제)"
          @pointerdown.stop
        />
        <div class="calendar__note-actions">
          <button type="button" class="calendar__btn" @pointerdown.stop @click.stop="cancelEdit">
            취소
          </button>
          <button
            type="button"
            class="calendar__btn calendar__btn--primary"
            :disabled="state.saving"
            @pointerdown.stop
            @click.stop="saveEdit"
          >
            {{ state.saving ? '저장 중…' : '저장' }}
          </button>
        </div>
      </template>
    </div>
  </section>
  </transition>
</template>

<style scoped lang="scss">
.calendar {
  position: absolute;
  inset: 0;
  z-index: 10;
  overflow-y: auto;
  overflow-x: hidden;
  background: #1c1c1f;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { width: 0; height: 0; }
}

// 등장/퇴장
.calendar-fade-enter-active,
.calendar-fade-leave-active {
  transition: opacity 0.2s ease;
}
.calendar-fade-enter-from,
.calendar-fade-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .calendar-fade-enter-active,
  .calendar-fade-leave-active { transition: none; }
}

// 뒤 컴퍼스 장식
.calendar__deco {
  position: absolute;
  top: 46%;
  left: 50%;
  width: 95cqw;
  height: auto;
  transform: translate(-50%, -50%);
  opacity: 0.12;
  pointer-events: none;
  user-select: none;
}

.calendar__title {
  position: relative;
  margin: 0;
  padding: 4cqw 6.667%;
  color: #fff;
  font-size: 14cqw;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-shadow: 0 0 6cqw rgba(255, 255, 255, 0.45);
}

// 우상단 액션 (새로고침 + 닫기)
.calendar__actions {
  position: absolute;
  top: 3.5%;
  right: 4%;
  z-index: 2;
  display: flex;
  gap: 1cqw;
}
.calendar__icon {
  display: flex;
  padding: 1.5cqw;
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  backdrop-filter: blur(4px);

  svg { width: 6cqw; height: 6cqw; }
  &:active { opacity: 0.5; }
  &:disabled { opacity: 0.6; }
  &.is-spin svg { animation: cal-spin 0.8s linear infinite; }
}
@keyframes cal-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .calendar__refresh.is-spin svg { animation: none; }
}

// 월 이동
.calendar__month {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12cqw;
  padding: 2cqw 0 5cqw;
}
.calendar__arrow {
  background: transparent;
  color: #fff;
  font-size: 8cqw;
  line-height: 1;
  padding: 2cqw 3cqw;
  &:active { opacity: 0.5; }
}
.calendar__month-num {
  color: #fff;
  font-size: 8cqw;
  font-weight: 700;
  min-width: 14cqw;
  text-align: center;
}

// 요일 / 날짜 그리드 공통 7열
.calendar__weekdays,
.calendar__grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 4%;
}
.calendar__weekdays {
  margin-bottom: 1cqw;
  span {
    text-align: center;
    color: #fff;
    font-size: 4.2cqw;
    font-weight: 700;
    padding: 1.5cqw 0;
  }
  .is-sun { color: #ff6b6b; }
}

.calendar__grid {
  row-gap: 1cqw;
}
.calendar__day {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  width: 9.5cqw;
  height: 9.5cqw;
  border-radius: 2.5cqw;
  background: transparent;
  color: #fff;
  font-size: 4.2cqw;
  font-weight: 500;
  transition: background 0.12s ease;

  &.is-sun { color: #ff6b6b; }
  &.is-out { color: rgba(255, 255, 255, 0.25); }
  &.is-today { font-weight: 800; }
  &.is-selected { background: rgba(255, 255, 255, 0.18); }
  &:not(.is-out):active { background: rgba(255, 255, 255, 0.1); }

  // 일정 있는 날 표시 점
  &.has-event::after {
    content: '';
    position: absolute;
    bottom: 1cqw;
    left: 50%;
    transform: translateX(-50%);
    width: 1.4cqw;
    height: 1.4cqw;
    border-radius: 50%;
    background: $color-primary;
  }
}

// 하단 일정 카드
.calendar__note {
  position: relative;
  margin: 6cqw 6.667% 8cqw;
  padding: 4.5cqw;
  border-radius: 3cqw;
  background: rgba(255, 255, 255, 0.12);
}
.calendar__note-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2cqw;
}
.calendar__note-date {
  margin: 0;
  color: #fff;
  font-size: 4.2cqw;
  font-weight: 700;
}
.calendar__edit-btn {
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 3.6cqw;
  font-weight: 700;
  padding: 1cqw 2cqw;
  border-radius: 1.5cqw;
  &:active { opacity: 0.5; }
}
.calendar__note-text {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 3.9cqw;
  line-height: 1.5;
  white-space: pre-line;
}
.calendar__note-input {
  width: 100%;
  box-sizing: border-box;
  padding: 2.5cqw;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 2cqw;
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  font-family: inherit;
  font-size: 3.9cqw;
  line-height: 1.5;
  resize: none;
}
.calendar__note-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2cqw;
  margin-top: 2.5cqw;
}
.calendar__btn {
  padding: 1.8cqw 4cqw;
  border-radius: 2cqw;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 3.7cqw;
  font-weight: 700;
  transition: opacity 0.15s ease;
  &:active { opacity: 0.6; }
  &:disabled { opacity: 0.4; }
  &--primary { background: $color-primary; }
}
</style>
