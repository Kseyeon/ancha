<script setup lang="ts">
// 메인 페이지 — 개요(1) ↔ 상세(2) 두 페이지를 스와이프로 전환.
// 우→좌 스와이프 = 상세 페이지, 좌→우 = 개요.
import { computed, ref } from 'vue'
import { useCharacters } from '@/stores/characters'
import CharacterOverview from '@/components/CharacterOverview.vue'
import CharacterDetail from '@/components/CharacterDetail.vue'

const { characters, state } = useCharacters()

const index = ref(0)
const current = computed(() => characters[Math.min(index.value, characters.length - 1)])

// page: 0 = 개요, 1 = 상세
const page = ref(0)
const transitionName = ref<'slide-left' | 'slide-right'>('slide-left')

function goNext() {
  if (page.value !== 0) return
  transitionName.value = 'slide-left'
  page.value = 1
}
function goPrev() {
  if (page.value !== 1) return
  transitionName.value = 'slide-right'
  page.value = 0
}

// 캐릭터 전환 (개요의 화살표 버튼)
function nextChar() {
  if (characters.length === 0) return
  index.value = (index.value + 1) % characters.length
}

// --- 스와이프(포인터) 감지: 터치 + 마우스 드래그 모두 지원 ---
let startX = 0
let startY = 0
let tracking = false
// 제스처가 "세로 스크롤 가능한 내용 박스"에서 시작했는지 → 그 경우 좌우 스왑 막음
let startedInScrollableBox = false
function onPointerDown(e: PointerEvent) {
  tracking = true
  startX = e.clientX
  startY = e.clientY
  const box = (e.target as HTMLElement | null)?.closest?.('.detail__card') as HTMLElement | null
  startedInScrollableBox = !!box && box.scrollHeight - box.clientHeight > 1
}
function onPointerUp(e: PointerEvent) {
  if (!tracking) return
  tracking = false
  // 스크롤되는 내용 박스 위에서 시작한 제스처는 페이지 전환하지 않음 (세로 스크롤 우선)
  if (startedInScrollableBox) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  // 가로 이동이 충분하고 세로보다 클 때만 페이지 전환
  if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
  if (dx < 0) goNext() // 우 → 좌
  else goPrev() // 좌 → 우
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
          key="overview"
          :character="current"
          :characters-count="characters.length"
          @next-char="nextChar"
        />
        <CharacterDetail
          v-else-if="current && page === 1"
          key="detail"
          :character="current"
          @back="goPrev"
        />
      </Transition>

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
    </div>
  </div>
</template>

<style scoped lang="scss">
.screen {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
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
  height: 100vh;
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
