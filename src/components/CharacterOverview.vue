<script setup lang="ts">
// 개요 페이지 (1번째) — 캐릭터 카드. Figma node 45:191.
// 부모(stage)를 채우며, 슬라이드 트랜지션의 한 페이지로 사용됩니다.
import { computed } from 'vue'
import { resolveImage, type Character } from '@/stores/characters'
import sparkle from '@/assets/characters/sparkle.png'

const props = defineProps<{
  character: Character
  charactersCount: number
}>()

defineEmits<{ (e: 'next-char'): void }>()

const imageSrc = computed(() => resolveImage(props.character.image))
</script>

<template>
  <article class="card">
    <!-- 배경 반짝이 장식 (캐릭터 뒤 레이어) -->
    <img class="card__sparkle" :src="sparkle" alt="" aria-hidden="true" draggable="false" />

    <!-- 캐릭터 일러스트 (래퍼=등장 상승 / 안쪽 img=위아래 부유) -->
    <div v-if="imageSrc" class="card__char">
      <img
        class="card__char-img"
        :src="imageSrc"
        :alt="`${character.name} 캐릭터 일러스트`"
        draggable="false"
        referrerpolicy="no-referrer"
      />
    </div>

    <!-- 이름 -->
    <h1 class="card__name">{{ character.name }}</h1>

    <!-- 기본 정보 -->
    <p class="card__info">
      나이: {{ character.age }}<br />
      성별: {{ character.gender }}
    </p>

    <!-- 캐릭터 전환 버튼 (우측 가운데, 왼쪽 이중 화살표) -->
    <button
      class="card__next"
      type="button"
      aria-label="캐릭터 전환"
      :disabled="charactersCount <= 1"
      @click="$emit('next-char')"
    >
      <svg class="card__chevron" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M15 5l-7 7 7 7"
          fill="none"
          stroke="#fff"
          stroke-width="1"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <svg class="card__chevron" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M15 5l-7 7 7 7"
          fill="none"
          stroke="#fff"
          stroke-width="1"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

  </article>
</template>

<style scoped lang="scss">
// 부모(stage, 360×640 비율 + container-type)를 채움
.card {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #222222;
}

// 반짝이 장식: Figma box [117,-109 340x363]
.card__sparkle {
  position: absolute;
  left: 32.5%;
  top: -17.031%;
  width: 94.444%;
  height: auto;
  z-index: 1;
  pointer-events: none;
  user-select: none;
}

// 캐릭터 이미지: Figma box [-78,40 575x716] (이미지 원본 비율과 일치)
.card__char {
  position: absolute;
  left: calc(50% + 50px);
  bottom: -10vh;
  max-width: none;
  width: 159.722%;
  height: auto;
  z-index: 2;
  user-select: none;
  transform: translateX(-50%);
  // 이미지: 가운데 정렬(translateX -50%) 유지한 채 아래→위로 상승
  animation: rise-in-char 2s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both;
}
// 안쪽 이미지: 등장(0.25s+2s=2.25s)이 끝난 뒤 위아래로 느리게 계속 부유
.card__char-img {
  display: block;
  width: 100%;
  height: auto;
  animation: float-y 6s ease-in-out 2.25s infinite;
}

// 이름 "HEE": [24,8] 64px / lh 76.8
.card__name {
  position: absolute;
  left: 6.667%;
  top: 1.25%;
  z-index: 3;
  margin: 0;
  color: #fff;
  font-size: 17.778cqw;
  line-height: 21.333cqw;
  font-weight: 700;
  letter-spacing: -0.01em;
  // 타이틀: 가장 먼저 위→아래로 하강
  animation: fall-in 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both;
}

// 기본 정보: [30,83] 16px / lh 25.6
.card__info {
  position: absolute;
  left: 8.333%;
  top: 12.969%;
  z-index: 3;
  margin: 0;
  color: #fff;
  font-size: 4.444cqw;
  line-height: 7.111cqw;
  font-weight: 700;
  // 기본 정보: 타이틀 다음으로 위→아래로 하강
  animation: fall-in 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
}

// 전환 버튼: 우측 가운데(세로 50%), 배경 투명, 왼쪽 이중 화살표
.card__next {
  position: absolute;
  top: 50%;
  right: 4%;
  transform: translateY(-50%);
  z-index: 3;
  display: flex;
  align-items: center;
  padding: 6cqw;
  background: transparent;
  transition: opacity 0.15s ease, transform 0.15s ease;

  animation: btn-pulse 6s ease-in-out infinite;

  &:not(:disabled):hover { opacity: 0.75; animation: none; }
  &:not(:disabled):active { transform: translateY(-50%) scale(0.92); }

  &:disabled { cursor: default; } // 캐릭터 1명일 때 (아이콘은 그대로 표시)
}

.card__chevron {
  position: absolute;
  left: 0;
  display: block;
  width: 20cqw;
  height: auto;

  &:last-child {
    left: 12px;
    opacity: .6;
  }
}

// 위(상)에서 아래(하)로 떨어지며 페이드인 — 일반 요소용
@keyframes fall-in {
  from { opacity: 0; transform: translateY(-32px); }
  to   { opacity: 1; transform: translateY(0); }
}
// 이미지용 — 아래에서 위로, 가로 가운데 정렬(translateX -50%)을 유지
@keyframes rise-in-char {
  from { opacity: 0; transform: translate(-50%, 56px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
// 위아래로 느리게 부유 (0에서 시작·종료해 등장과 자연스럽게 연결)
@keyframes float-y {
  0%   { transform: translateY(0); }
  25%  { transform: translateY(-4px); }
  75%  { transform: translateY(4px); }
  100% { transform: translateY(0); }
}
// 화살표 버튼 opacity 펄스
@keyframes btn-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}

// 모션 최소화 선호 시 애니메이션 비활성화
@media (prefers-reduced-motion: reduce) {
  .card__name,
  .card__info,
  .card__char,
  .card__char-img,
  .card__next {
    animation: none;
  }
}
</style>
