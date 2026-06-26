<script setup lang="ts">
// 상세 페이지 (2번째) — 탭별 정보 + 원형 아바타. Figma node 48:260.
// 부모(stage)를 채우며, 슬라이드 트랜지션의 한 페이지로 사용됩니다.
import { computed, nextTick, ref, watch } from 'vue'
import { resolveImage, type Character } from '@/stores/characters'
import sparkle from '@/assets/characters/sparkle.png'

const props = defineProps<{ character: Character }>()
defineEmits<{ (e: 'back'): void }>()

const rootEl = ref<HTMLElement | null>(null)
const activeIndex = ref(0)

// 캐릭터가 바뀌면 첫 탭으로
watch(
  () => props.character.id,
  () => {
    activeIndex.value = 0
  },
)

// 탭이 바뀌면 페이지 스크롤을 맨 위로
watch(activeIndex, () => {
  void nextTick(() => {
    if (rootEl.value) rootEl.value.scrollTop = 0
  })
})

function selectTab(i: number) {
  activeIndex.value = i
}

const imageSrc = computed(() => resolveImage(props.character.image))

// 탭 라벨: "기본정보" + 시트의 섹션 열들(성격/특징/외관/기타…)
const tabLabels = computed(() => ['기본정보', ...props.character.sections.map((s) => s.label)])
const activeLabel = computed(
  () => tabLabels.value[Math.min(activeIndex.value, tabLabels.value.length - 1)],
)

// 기본정보 탭에 표시할 항목들
const basicInfo = computed(() => {
  const c = props.character
  return [
    { label: '한글이름', value: c.nameKo },
    { label: '영문이름', value: c.nameEn },
    { label: '나이', value: c.age },
    { label: '성별', value: c.gender },
    { label: '신장·체중', value: c.bodySpec },
    { label: '종족', value: c.race },
    { label: '소속 및 직업', value: c.affiliation },
  ]
})

// 기본정보(0번)를 제외한 섹션 본문
const activeSection = computed(() => props.character.sections[activeIndex.value - 1])
</script>

<template>
  <section ref="rootEl" class="detail">
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
      <h2 class="detail__card-title">{{ activeLabel }}</h2>

      <!-- 기본정보: 항목 리스트 -->
      <dl v-if="activeIndex === 0" class="detail__info-list">
        <div v-for="f in basicInfo" :key="f.label" class="detail__info-row">
          <dt class="detail__info-label">{{ f.label }}</dt>
          <dd class="detail__info-value">{{ f.value || '-' }}</dd>
        </div>
      </dl>

      <!-- 그 외 탭: 자유 본문 -->
      <p v-else class="detail__card-body">{{ activeSection?.body }}</p>
    </div>

    <!-- 하단 탭 -->
    <nav class="detail__tabs">
      <button
        v-for="(label, i) in tabLabels"
        :key="i"
        type="button"
        class="detail__tab"
        :class="{ 'is-active': i === activeIndex }"
        @click="selectTab(i)"
      >
        {{ label }}
      </button>
    </nav>
  </section>
</template>

<style scoped lang="scss">
// 부모(stage, 360×640 비율 + container-type)를 채움.
// 카드 내부 스크롤 대신 이 컨테이너(=상세 페이지 전체)가 세로로 스크롤된다.
.detail {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  background: #222222;
  touch-action: pan-y; // 세로는 페이지 스크롤, 가로는 페이지 스와이프(JS)로 전달
  -webkit-overflow-scrolling: touch;
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

// 콘텐츠 카드: 정상 흐름에 배치되어 내용만큼 늘어남(내부 스크롤 없음).
// flex-grow 로 내용이 짧아도 카드가 영역을 채워 탭이 하단에 머물게 한다.
.detail__card {
  position: relative;
  z-index: 3;
  flex: 1 0 auto;
  margin: 48cqw 6.667% 0; // 상단 = 이름/아바타 영역만큼 띄움
  padding: 4.444cqw;
  border-radius: 2.222cqw;
  background: rgba(255, 255, 255, 0.2);
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

// 기본정보: 라벨 + 값 행 목록
.detail__info-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 3.333cqw;
}
.detail__info-row {
  display: flex;
  gap: 3.333cqw;
  color: #fff;
  font-size: 4.444cqw;
  line-height: 6.667cqw;
}
.detail__info-label {
  flex: 0 0 26cqw;
  font-weight: 700;
}
.detail__info-value {
  flex: 1;
  margin: 0;
  font-weight: 400;
  white-space: pre-line;
  word-break: break-word;
}

// 하단 탭: 스크롤해도 화면 하단에 sticky 로 고정
.detail__tabs {
  position: sticky;
  bottom: -1px;
  z-index: 4;
  width: 100%;
  padding: 20px 20px 0;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 2.222cqw;
  background: #222;
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
