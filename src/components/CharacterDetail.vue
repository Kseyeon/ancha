<script setup lang="ts">
// 상세 페이지 (2번째) — 탭별 정보 + 원형 아바타. Figma node 48:260.
// 부모(stage)를 채우며, 슬라이드 트랜지션의 한 페이지로 사용됩니다.
import { computed, nextTick, ref, watch } from 'vue'
import { resolveImage, useCharacters, type Character, type EditableField } from '@/stores/characters'
import sparkle from '@/assets/characters/sparkle.png'

const props = defineProps<{ character: Character }>()
defineEmits<{ (e: 'back'): void }>()

const { update, canEdit, reload, state } = useCharacters()

const rootEl = ref<HTMLElement | null>(null)
const activeIndex = ref(0)

// 캐릭터가 바뀌면 첫 탭으로
watch(
  () => props.character.id,
  () => {
    activeIndex.value = 0
  },
)

// 탭이 바뀌면 페이지 스크롤 맨 위로 + 편집 모드 해제
watch(activeIndex, () => {
  editing.value = false
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

// 기본정보 탭 항목 (key = 수정 시 사용할 필드명)
const BASIC_FIELDS: { key: EditableField; label: string }[] = [
  { key: 'nameKo', label: '한글이름' },
  { key: 'name', label: '영문이름' },
  { key: 'surname', label: '성' },
  { key: 'age', label: '나이' },
  { key: 'gender', label: '성별' },
  { key: 'bodySpec', label: '신장·체중' },
  { key: 'race', label: '종족' },
  { key: 'affiliation', label: '소속 및 직업' },
]
const basicInfo = computed(() =>
  BASIC_FIELDS.map((f) => ({ label: f.label, value: props.character[f.key] })),
)

// 기본정보(0번)를 제외한 섹션 본문
const activeSection = computed(() => props.character.sections[activeIndex.value - 1])

// --- 수정 ---
const editing = ref(false)
const saving = ref(false)
const basicDraft = ref<Record<string, string>>({})
const bodyDraft = ref('')

function startEdit() {
  if (activeIndex.value === 0) {
    const d: Record<string, string> = {}
    for (const f of BASIC_FIELDS) d[f.key] = props.character[f.key] ?? ''
    basicDraft.value = d
  } else {
    bodyDraft.value = activeSection.value?.body ?? ''
  }
  editing.value = true
}
function cancelEdit() {
  editing.value = false
}
async function saveEdit() {
  saving.value = true
  let ok = false
  if (activeIndex.value === 0) {
    ok = await update(props.character, { fields: { ...basicDraft.value } })
  } else if (activeLabel.value) {
    ok = await update(props.character, { sections: { [activeLabel.value]: bodyDraft.value } })
  }
  saving.value = false
  if (ok) editing.value = false
}
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
      <div class="detail__card-head">
        <h2 class="detail__card-title">{{ activeLabel }}</h2>
        <div v-if="!editing" class="detail__card-actions">
          <button
            type="button"
            class="detail__icon-btn"
            :class="{ 'is-spin': state.status === 'loading' }"
            :disabled="state.status === 'loading'"
            aria-label="새로고침"
            @pointerdown.stop
            @click.stop="reload"
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
          <button v-if="canEdit" type="button" class="detail__edit-btn" @pointerdown.stop @click.stop="startEdit">
            수정
          </button>
        </div>
      </div>

      <!-- 기본정보 -->
      <template v-if="activeIndex === 0">
        <dl v-if="!editing" class="detail__info-list">
          <div v-for="f in basicInfo" :key="f.label" class="detail__info-row">
            <dt class="detail__info-label">{{ f.label }}</dt>
            <dd class="detail__info-value">{{ f.value || '-' }}</dd>
          </div>
        </dl>
        <div v-else class="detail__edit-list">
          <div v-for="f in BASIC_FIELDS" :key="f.key" class="detail__edit-row">
            <label class="detail__edit-label">{{ f.label }}</label>
            <input
              v-model="basicDraft[f.key]"
              class="detail__edit-input"
              type="text"
              @pointerdown.stop
            />
          </div>
        </div>
      </template>

      <!-- 그 외 탭: 자유 본문 -->
      <template v-else>
        <p v-if="!editing" class="detail__card-body">{{ activeSection?.body }}</p>
        <textarea
          v-else
          v-model="bodyDraft"
          class="detail__edit-area"
          rows="10"
          @pointerdown.stop
        />
      </template>

      <!-- 저장/취소 -->
      <div v-if="editing" class="detail__edit-actions">
        <button type="button" class="detail__btn" @pointerdown.stop @click.stop="cancelEdit">
          취소
        </button>
        <button
          type="button"
          class="detail__btn detail__btn--primary"
          :disabled="saving"
          @pointerdown.stop
          @click.stop="saveEdit"
        >
          {{ saving ? '저장 중…' : '저장' }}
        </button>
      </div>
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

  // 스크롤바 자리를 항상 확보 → 스크롤바 유무로 레이아웃이 좌우로 흔들리지 않음
  scrollbar-gutter: stable;

  // 커스텀 스크롤바 (Firefox)
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;

  // 커스텀 스크롤바 (Chrome/Edge/Safari)
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 999px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }
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

// 원형 아바타: 좌상단으로 이동
.detail__avatar {
  position: absolute;
  left: 5.5%;
  top: 4%;
  z-index: 4;
  width: 25%;
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

// 이름: 아바타 오른쪽
.detail__name {
  position: absolute;
  left: 35%;
  top: 5%;
  z-index: 3;
  margin: 0;
  color: #fff;
  font-size: 11cqw;
  line-height: 13cqw;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

// 기본 정보: 이름 아래(아바타 오른쪽)
.detail__info {
  position: absolute;
  left: 35%;
  top: 12%;
  z-index: 3;
  margin: 0;
  color: #fff;
  font-size: 4cqw;
  line-height: 6cqw;
  font-weight: 700;
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
  background: rgba(233, 233, 233, 0.6);
}
.detail__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2.222cqw;
}
.detail__card-title {
  margin: 0;
  font-size: 6.667cqw;
  line-height: 10.556cqw;
  font-weight: 700;
}
.detail__card-actions {
  display: flex;
  align-items: center;
  gap: 1.5cqw;
}
.detail__edit-btn {
  flex: 0 0 auto;
  padding: 1cqw 3cqw;
  border-radius: 1.5cqw;
  background: rgba(0, 0, 0, 0.12);
  color: $color-text;
  font-size: 3.6cqw;
  font-weight: 700;
  &:active { opacity: 0.6; }
}
.detail__icon-btn {
  flex: 0 0 auto;
  display: flex;
  padding: 1cqw;
  border-radius: 50%;
  background: transparent;
  color: $color-text;

  svg { width: 5cqw; height: 5cqw; }
  &:active { opacity: 0.5; }
  &:disabled { opacity: 0.6; }
  &.is-spin svg { animation: detail-spin 0.8s linear infinite; }
}
@keyframes detail-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .detail__icon-btn.is-spin svg { animation: none; }
}
.detail__card-body {
  margin: 0;
  font-size: 4.444cqw;
  line-height: 7.222cqw;
  font-weight: 400;
  white-space: pre-line;
}

// 수정 모드 입력
.detail__edit-list {
  display: flex;
  flex-direction: column;
  gap: 2.5cqw;
}
.detail__edit-row {
  display: flex;
  flex-direction: column;
  gap: 1cqw;
}
.detail__edit-label {
  color: $color-text-muted;
  font-size: 3.6cqw;
  font-weight: 700;
}
.detail__edit-input,
.detail__edit-area {
  width: 100%;
  box-sizing: border-box;
  padding: 2cqw 2.5cqw;
  border: 1px solid $color-border;
  border-radius: 2cqw;
  background: #fff;
  color: $color-text;
  font-family: inherit;
  font-size: 4cqw;
  line-height: 1.5;
}
.detail__edit-area {
  resize: vertical;
  min-height: 40cqw;
  white-space: pre-wrap;
}
.detail__edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2cqw;
  margin-top: 3cqw;
}
.detail__btn {
  padding: 1.8cqw 4cqw;
  border-radius: 2cqw;
  background: rgba(0, 0, 0, 0.12);
  color: $color-text;
  font-size: 3.7cqw;
  font-weight: 700;
  &:active { opacity: 0.6; }
  &:disabled { opacity: 0.4; }
  &--primary { background: $color-primary; color: #fff; }
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
  gap: 2cqw;
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
    font-size: 4cqw;
    font-weight: 700;
  }
}
</style>
