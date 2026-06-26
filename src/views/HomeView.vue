<script setup lang="ts">
// 메인 페이지.
// 개요(0): 좌우 스와이프 = 캐릭터 넘기기, 캐릭터 탭 = 상세로.
// 상세(1): 좌→우 스와이프 또는 아바타 탭 = 개요로 복귀.
import { computed, ref } from 'vue'
import { useCharacters } from '@/stores/characters'
import CharacterOverview from '@/components/CharacterOverview.vue'
import CharacterDetail from '@/components/CharacterDetail.vue'
import NarrativeModal from '@/components/NarrativeModal.vue'

const { characters, state } = useCharacters()

// 서사(채팅) 팝업 열림 상태
const narrativeOpen = ref(false)

const index = ref(0)
const current = computed(() => characters[Math.min(index.value, characters.length - 1)])

// 해시태그 칩 텍스트 (개요 페이지에서만 .stage 직속에 고정 표시)
const hashtags = computed(() =>
  current.value ? current.value.tags.map((t) => `#${t}`).join('  ') : '',
)

// page: 0 = 개요, 1 = 상세
const page = ref(0)
// 전환 방향: 슬라이드 왼쪽(다음)/오른쪽(이전)
const transitionName = ref<'none' | 'slide-left' | 'slide-right'>('none')

// --- 캐릭터 넘기기 (좌우 스와이프 / 화살표 버튼) ---
function nextChar() {
  if (characters.length <= 1) return
  transitionName.value = 'slide-left'
  index.value = (index.value + 1) % characters.length
}
function prevChar() {
  if (characters.length <= 1) return
  transitionName.value = 'slide-right'
  index.value = (index.value - 1 + characters.length) % characters.length
}

// --- 개요 ↔ 상세 ---
function openDetail() {
  if (page.value !== 0) return
  transitionName.value = 'slide-left'
  page.value = 1
}
function closeDetail() {
  if (page.value !== 1) return
  transitionName.value = 'slide-right'
  page.value = 0
}

// --- 스와이프/탭(포인터) 감지: 터치 + 마우스 드래그 모두 지원 ---
const TAP_MAX = 10 // 이만큼도 안 움직이면 "탭"으로 간주
const SWIPE_MIN = 40 // 가로 스와이프로 인정할 최소 이동
let startX = 0
let startY = 0
let tracking = false
function onPointerDown(e: PointerEvent) {
  tracking = true
  startX = e.clientX
  startY = e.clientY
}
function onPointerUp(e: PointerEvent) {
  if (!tracking) return
  tracking = false
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)

  // 탭: 개요에서는 상세로 진입
  if (adx < TAP_MAX && ady < TAP_MAX) {
    if (page.value === 0) openDetail()
    return
  }

  // 가로 스와이프만 처리 (세로 스크롤과 구분)
  if (adx < SWIPE_MIN || adx < ady) return
  if (page.value === 0) {
    // 개요: 캐릭터 넘기기
    if (dx < 0) nextChar() // 우 → 좌 = 다음 캐릭터
    else prevChar() // 좌 → 우 = 이전 캐릭터
  } else {
    // 상세: 좌 → 우 스와이프 = 개요(이전 메인화면)로 복귀
    if (dx > 0) closeDetail()
  }
}
function onPointerCancel() {
  tracking = false
}
</script>

<template>
  <div class="screen">
    <div
      class="stage"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <Transition :name="transitionName">
        <CharacterOverview
          v-if="current && page === 0"
          :key="'overview-' + current.id"
          :character="current"
        />
        <CharacterDetail
          v-else-if="current && page === 1"
          :key="'detail-' + current.id"
          :character="current"
          @back="closeDetail"
        />
      </Transition>

      <!-- 해시태그 칩: 페이지와 함께 슬라이드되지 않도록 .stage 직속에 고정 -->
      <div
        v-if="current && page === 0 && current.tags.length"
        class="stage__tags"
      >{{ hashtags }}</div>

      <!-- 캐릭터 전환 화살표: 슬라이드와 함께 안 움직이도록 .stage 직속에 고정 (개요에서만) -->
      <template v-if="current && page === 0">
        <button
          class="stage__nav stage__nav--prev"
          type="button"
          aria-label="이전 캐릭터"
          :disabled="characters.length <= 1"
          @pointerdown.stop
          @click.stop="prevChar"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button
          class="stage__nav stage__nav--next"
          type="button"
          aria-label="다음 캐릭터"
          :disabled="characters.length <= 1"
          @pointerdown.stop
          @click.stop="nextChar"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </template>

      <div v-if="!current" class="stage__empty">
        <template v-if="state.status === 'loading'">불러오는 중…</template>
        <template v-else-if="state.status === 'unconfigured'">
          데이터 소스가 설정되지 않았습니다.<br />
          <small>src/config.ts 에 구글 시트 CSV 주소를 넣어주세요.</small>
        </template>
        <template v-else-if="state.status === 'error'">
          데이터를 불러오지 못했습니다.<br />
          <small>{{ state.error }}</small>
        </template>
        <template v-else>표시할 캐릭터가 없습니다.</template>
      </div>

      <!-- 서사(채팅) 열기 버튼 — 우상단. 스와이프와 분리되도록 이벤트 전파 차단 -->
      <button
        class="chat-fab"
        type="button"
        aria-label="서사 열기"
        @pointerdown.stop
        @click.stop="narrativeOpen = true"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
            fill="none"
            stroke="#fff"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <!-- 서사 팝업 (stage 를 덮음) -->
      <NarrativeModal :open="narrativeOpen" @close="narrativeOpen = false" />
    </div>
  </div>
</template>

<style scoped lang="scss">
html,body {
  background: #222;
}
.screen {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100dvh;
  background: #222; // 모바일: 카드와 동일하게 letterbox 블렌드

  @include mq(md) {
    background: #141414; // 데스크톱: 카드 가장자리가 보이도록 더 어둡게
    padding: $space-8;
  }
}

// 카드 사이즈/클리핑 박스 (두 페이지의 공통 무대)
.stage {
  position: relative;
  width: 100%;
  max-width: 100%;
  height: 100%;
  aspect-ratio: 360 / 640;
  overflow: hidden;
  background: #222222;
  container-type: inline-size; // 자식 페이지의 cqw 기준
  touch-action: pan-y; // 세로 스크롤 허용, 가로 스와이프는 직접 처리

  @include mq(md) {
    max-width: 390px;
    border-radius: 24px;
    box-shadow: $shadow-lg;
  }
}

// 해시태그 칩: .stage 기준으로 고정 (개요에서만 표시, 전환 시 슬라이드 안 함)
.stage__tags {
  position: absolute; // .stage가 relative+container라 stage 기준으로 고정됨
  left: 43.889%;
  top: 90.938%;
  z-index: 5; // 슬라이드되는 페이지들 위로
  width: 48.056%;
  height: 5.938%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5.56cqw;
  background: rgba(255, 255, 255, 0.89);
  color: #000;
  font-size: 3.889cqw;
  font-weight: 700;
  white-space: nowrap;
  // 해시태그: 가장 마지막으로 위→아래로 하강
  animation: tags-fall-in 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both;
}

// 위(상)에서 아래(하)로 떨어지며 페이드인
@keyframes tags-fall-in {
  from { opacity: 0; transform: translateY(-28px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .stage__tags { animation: none; }
}

// 캐릭터 전환 화살표: .stage 직속이라 슬라이드와 함께 안 움직임 (개요에서만 표시)
.stage__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 5;
  display: flex;
  align-items: center;
  background: transparent;
  transition: opacity 0.15s ease, transform 0.15s ease;
  animation: btn-pulse 6s ease-in-out infinite;

  svg { display: block; width: 10cqw; height: auto; }
  &:not(:disabled):hover { opacity: 0.75; animation: none; }
  &:not(:disabled):active { transform: translateY(-50%) scale(0.92); }
  &:disabled { cursor: default; }
}
.stage__nav--prev { left: 0; }
.stage__nav--next { right: 0; }

@keyframes btn-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
@media (prefers-reduced-motion: reduce) {
  .stage__nav { animation: none; }
}

// 서사 열기 버튼 (우상단 떠 있는 원형)
.chat-fab {
  position: absolute;
  top: 3.5%;
  right: 4%;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 11cqw;
  height: 11cqw;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  transition: opacity 0.15s ease, transform 0.1s ease;

  svg { width: 6cqw; height: 6cqw; }
  &:hover { opacity: 0.85; }
  &:active { transform: scale(0.9); }
}

.stage__empty {
  position: relative;
  z-index: 3;
  display: grid;
  place-content: center;
  height: 100%;
  padding: $space-8;
  color: #fff;
  text-align: center;
  line-height: 1.8;

  small { color: rgba(255, 255, 255, 0.6); font-size: $font-size-sm; }
}
</style>

<!-- 페이지 슬라이드 트랜지션 (자식 컴포넌트 루트에 적용되므로 비-scoped) -->
<style lang="scss">
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-left-enter-from {
  transform: translateX(100%);
}
.slide-left-leave-to {
  transform: translateX(-100%);
}
.slide-right-enter-from {
  transform: translateX(-100%);
}
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
