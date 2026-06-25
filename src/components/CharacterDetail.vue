<script setup lang="ts">
// 상세 페이지 (2번째) — 탭별 정보 + 원형 아바타. Figma node 48:260.
// 부모(stage)를 채우며, 슬라이드 트랜지션의 한 페이지로 사용됩니다.
import { computed, ref, watch } from 'vue'
import { resolveImage, type Character } from '@/stores/characters'
import sparkle from '@/assets/characters/sparkle.png'

const props = defineProps<{ character: Character }>()
defineEmits<{ (e: 'back'): void }>()

const activeIndex = ref(0)
// 캐릭터가 바뀌면 첫 탭으로
watch(
  () => props.character.id,
  () => {
    activeIndex.value = 0
  },
)

const imageSrc = computed(() => resolveImage(props.character.image))

// 첫 탭 "기본정보"(나이/성별) + 어드민에서 관리하는 섹션 탭들
const tabs = computed(() => [
  {
    label: '기본정보',
    body: `나이: ${props.character.age}\n성별: ${props.character.gender}`,
  },
  ...props.character.sections.map((s) => ({ label: s.label, body: s.body })),
])
const active = computed(() => tabs.value[Math.min(activeIndex.value, tabs.value.length - 1)])
</script>

<template>
  <section class="detail">
    <!-- 배경: 중앙 큰 반짝이 (상세 페이지에는 캐릭터 일러스트 대신 반짝이만) -->
    <img class="detail__sparkle" :src="sparkle" alt="" aria-hidden="true" draggable="false" />

    <!-- 이름 / 기본 정보 -->
    <h1 class="detail__name">{{ character.name }}</h1>
    <p class="detail__info">
      나이: {{ character.age }}<br />
      성별: {{ character.gender }}
    </p>

    <!-- 원형 아바타 (클릭 시 개요로) -->
    <button
      class="detail__avatar"
      type="button"
      aria-label="개요로 돌아가기"
      @click="$emit('back')"
    >
      <img
        v-if="imageSrc"
        :src="imageSrc"
        :alt="character.name"
        draggable="false"
        referrerpolicy="no-referrer"
      />
    </button>

    <!-- 콘텐츠 카드 -->
    <div class="detail__card">
      <h2 class="detail__card-title">{{ active?.label }}</h2>
      <p class="detail__card-body">{{ active?.body }}</p>
    </div>

    <!-- 하단 탭 -->
    <nav class="detail__tabs">
      <button
        v-for="(t, i) in tabs"
        :key="i"
        type="button"
        class="detail__tab"
        :class="{ 'is-active': i === activeIndex }"
        @click="activeIndex = i"
      >
        {{ t.label }}
      </button>
    </nav>
  </section>
</template>

<style scoped lang="scss">
// 부모(stage, 360×640 비율 + container-type)를 채움
.detail {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #222222;
}

// 중앙 반짝이: stage 가로/세로 비율과 무관하게 정중앙에 크게 배치
.detail__sparkle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120cqw; // stage 너비의 1.2배 → 팔(라인)이 카드 밖까지 뻗어 보임
  height: auto;
  transform: translate(-50%, -50%);
  z-index: 2;
  pointer-events: none;
  user-select: none;
}

// 이름 "HEE": [24,8] 64px
.detail__name {
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

// 기본 정보: [30,83] 16px
.detail__info {
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

// 원형 아바타: Figma box [247,27 100x100]
.detail__avatar {
  position: absolute;
  left: 68.611%;
  top: 4.219%;
  z-index: 4;
  width: 27.778%;
  aspect-ratio: 1;
  border-radius: 50%;
  overflow: hidden;
  background: #000;
  box-shadow: 0 0 5cqw rgba(0, 0, 0, 0.6);
  transition: transform 0.15s ease;

  img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
  &:hover { transform: scale(1.03); }
  &:active { transform: scale(0.97); }
}

// 콘텐츠 카드: Figma box [24,159 312x415], 흰 20%, radius 8
.detail__card {
  position: absolute;
  left: 6.667%;
  top: 24.844%;
  z-index: 3;
  width: 86.667%;
  height: 64.844%;
  padding: 4.444cqw;
  border-radius: 2.222cqw;
  background: rgba(255, 255, 255, 0.2);
  overflow-y: auto;
  touch-action: pan-y; // 세로는 박스 스크롤, 가로는 페이지 스와이프(JS)로 전달
}
.detail__card-title {
  margin: 0 0 2.222cqw;
  color: #fff;
  font-size: 6.667cqw;
  line-height: 10.556cqw;
  font-weight: 700;
}
.detail__card-body {
  margin: 0;
  color: #fff;
  font-size: 4.444cqw;
  line-height: 7.222cqw;
  font-weight: 400;
  white-space: pre-line;
}

// 하단 탭: Group 25 [32,598 296x49]
.detail__tabs {
  position: absolute;
  left: 8.889%;
  bottom: 0;
  z-index: 4;
  width: 82.222%;
  display: flex;
  align-items: flex-end;
  gap: 2.222cqw;
}
.detail__tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 10.556cqw;
  padding: 1cqw;
  border-radius: 2.222cqw 2.222cqw 0 0;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 3.889cqw;
  font-weight: 400;
  line-height: 1.2;
  text-align: center;
  transition: background 0.15s ease;

  &.is-active {
    min-height: 11.667cqw;
    background: rgba(255, 255, 255, 0.2);
    font-size: 4.444cqw;
    font-weight: 700;
  }
}
</style>
