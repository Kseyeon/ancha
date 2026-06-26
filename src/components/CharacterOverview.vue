<script setup lang="ts">
// 개요 페이지 (1번째) — 캐릭터 카드. Figma node 45:191.
// 부모(stage)를 채우며, 슬라이드 트랜지션의 한 페이지로 사용됩니다.
import { computed } from 'vue'
import { resolveImage, type Character } from '@/stores/characters'
import sparkle from '@/assets/characters/sparkle.png'

const props = defineProps<{
  character: Character
}>()

const imageSrc = computed(() => resolveImage(props.character.image))

// 캐릭터별 이미지 전용 클래스 (이름 기반). 예: HEE → card__char--hee, BRYAN → card__char--bryan
const charClass = computed(() => {
  const slug = props.character.name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug ? `card__char--${slug}` : ''
})
</script>

<template>
  <article class="card">
    <!-- 배경 반짝이 장식 (캐릭터 뒤 레이어) -->
    <img class="card__sparkle" :src="sparkle" alt="" aria-hidden="true" draggable="false" />

    <!-- 캐릭터 일러스트 (래퍼=등장 상승 / 안쪽 img=위아래 부유) -->
    <div v-if="imageSrc" class="card__char" :class="charClass">
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

  </article>
</template>

<style scoped lang="scss">
// 부모(stage, 360×640 비율 + container-type)를 채움
.card {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #222222;
  // 개요는 스크롤이 없으므로 세로/가로 스와이프를 모두 JS 가 처리하도록 네이티브 제스처 차단.
  // (pan-y 면 모바일에서 위로 스와이프가 스크롤로 가로채여 페이지 전환이 안 먹음)
  touch-action: none;
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
  transition: filter 0.15s ease;
}

// 이미지 위에 마우스 오버 / 누름 → 어둡게 (탭하면 상세로 가는 피드백)
.card__char {
  cursor: pointer;

  &:hover .card__char-img { filter: brightness(0.82); }
  &:active .card__char-img { filter: brightness(0.65); }
}

// 캐릭터별 이미지 위치/크기 조정 — 기본값(.card__char)을 덮어씀.
// 값만 바꿔서 BRYAN 이미지를 원하는 위치로 맞추세요.
.card__char--bryan {
  left: 45%; // 가로 위치 (translateX(-50%) 기준점)
  bottom: -0.5vh; // 세로 위치
  width: 130%; // 크기
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
// 모션 최소화 선호 시 애니메이션 비활성화
@media (prefers-reduced-motion: reduce) {
  .card__name,
  .card__info,
  .card__char,
  .card__char-img {
    animation: none;
  }
}
</style>
