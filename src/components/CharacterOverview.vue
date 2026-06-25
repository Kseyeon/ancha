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
const hashtags = computed(() => props.character.tags.map((t) => `#${t}`).join('  '))
</script>

<template>
  <article class="card">
    <!-- 배경 반짝이 장식 (캐릭터 뒤 레이어) -->
    <img class="card__sparkle" :src="sparkle" alt="" aria-hidden="true" draggable="false" />

    <!-- 캐릭터 일러스트 -->
    <img
      v-if="imageSrc"
      class="card__char"
      :src="imageSrc"
      :alt="`${character.name} 캐릭터 일러스트`"
      draggable="false"
      referrerpolicy="no-referrer"
    />

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

    <!-- 해시태그 칩 -->
    <div v-if="character.tags.length" class="card__tags">{{ hashtags }}</div>
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
  bottom: -100px;
  max-width: none;
  width: 159.722%;
  height: auto;
  z-index: 2;
  user-select: none;
  transform: translateX(-50%);
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

  &:not(:disabled):hover { opacity: 0.75; }
  &:not(:disabled):active { transform: translateY(-50%) scale(0.92); }

  &:disabled { cursor: default; } // 캐릭터 1명일 때 (아이콘은 그대로 표시)
}

.card__chevron {
  position: absolute;
  left: 0;
  display: block;
  width: 20cqw;
  height: auto;
}

// 해시태그 칩: [158,582 173x38], 흰 89% 배경, 검정 14px
.card__tags {
  position: absolute;
  left: 43.889%;
  top: 90.938%;
  z-index: 3;
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
}
</style>
