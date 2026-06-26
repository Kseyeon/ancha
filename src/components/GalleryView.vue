<script setup lang="ts">
// 갤러리 화면 — 캐릭터 일러스트 + 추가 사진(URL) 그리드. 탭하면 확대 오버레이.
import { computed, ref, watch } from 'vue'
import { useCharacters, resolveImage } from '@/stores/characters'
import { useGallery } from '@/stores/gallery'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { characters } = useCharacters()
const { state: gState, load: loadGallery, add: addPhoto, remove: removePhoto, canEdit } = useGallery()

interface Item {
  id: string
  name: string
  img: string
  deletable: boolean
}

// 캐릭터 일러스트(삭제 불가) + 추가 사진(삭제 가능)
const items = computed<Item[]>(() => {
  const chars = characters
    .map((c) => ({ id: c.id, name: c.name, img: resolveImage(c.image), deletable: false }))
    .filter((c) => c.img)
  const photos = gState.photos.map((url, i) => ({
    id: `g-${i}-${url}`,
    name: '',
    img: url,
    deletable: true,
  }))
  return [...chars, ...photos]
})

// 열릴 때 추가 사진 새로고침
watch(
  () => props.open,
  (open) => {
    if (open) void loadGallery()
  },
)

// 사진 추가 입력
const adding = ref(false)
const newUrl = ref('')
async function submitAdd() {
  const ok = await addPhoto(newUrl.value)
  if (ok) {
    newUrl.value = ''
    adding.value = false
  }
}
async function onDelete(url: string) {
  if (!confirm('이 사진을 삭제할까요?')) return
  await removePhoto(url)
}

// 확대된 이미지 (null = 닫힘) + 추가 줌 단계
const zoomed = ref<{ name: string; img: string } | null>(null)
const zoomedIn = ref(false) // 한 단계 더 확대

function openZoom(it: { name: string; img: string }) {
  zoomed.value = it
  zoomedIn.value = false
}
function closeZoom() {
  if (dragMoved) { dragMoved = false; return } // 드래그 끝의 클릭은 무시
  zoomed.value = null
  zoomedIn.value = false
}
function onImgClick() {
  if (dragMoved) { dragMoved = false; return }
  zoomedIn.value = !zoomedIn.value
}

// --- PC 마우스 드래그로 패닝 (터치는 네이티브 스크롤 유지) ---
const lbEl = ref<HTMLElement | null>(null)
let panning = false
let dragMoved = false
let panStartX = 0
let panStartY = 0
let panLeft = 0
let panTop = 0

function onPanStart(e: PointerEvent) {
  if (!zoomedIn.value || e.pointerType !== 'mouse') return
  panning = true
  dragMoved = false
  panStartX = e.clientX
  panStartY = e.clientY
  const el = lbEl.value
  if (el) {
    panLeft = el.scrollLeft
    panTop = el.scrollTop
  }
}
function onPanMove(e: PointerEvent) {
  if (!panning) return
  const el = lbEl.value
  if (!el) return
  const dx = e.clientX - panStartX
  const dy = e.clientY - panStartY
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true
  el.scrollLeft = panLeft - dx
  el.scrollTop = panTop - dy
}
function onPanEnd() {
  panning = false
}
</script>

<template>
  <transition name="gallery-fade">
  <section v-if="open" class="gallery" role="dialog" aria-modal="true" aria-label="갤러리">
    <button class="gallery__close" type="button" aria-label="닫기" @click="emit('close')">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>

    <h1 class="gallery__title">Gallery</h1>

    <!-- 사진 추가 (이미지 URL) -->
    <div v-if="canEdit" class="gallery__add">
      <template v-if="adding">
        <input
          v-model="newUrl"
          class="gallery__add-input"
          type="url"
          placeholder="이미지 주소(URL) 붙여넣기"
          @pointerdown.stop
          @keydown.enter="submitAdd"
        />
        <button class="gallery__add-btn" :disabled="gState.saving" @pointerdown.stop @click.stop="submitAdd">
          {{ gState.saving ? '추가 중…' : '추가' }}
        </button>
        <button class="gallery__add-btn gallery__add-btn--ghost" @pointerdown.stop @click.stop="adding = false">
          취소
        </button>
      </template>
      <button v-else class="gallery__add-toggle" @pointerdown.stop @click.stop="adding = true">
        ＋ 사진 추가
      </button>
    </div>

    <div class="gallery__grid">
      <div v-for="it in items" :key="it.id" class="gallery__cell">
        <button type="button" class="gallery__item" @click.stop="openZoom(it)">
          <img :src="it.img" :alt="it.name" draggable="false" referrerpolicy="no-referrer" />
        </button>
        <button
          v-if="it.deletable"
          type="button"
          class="gallery__del"
          aria-label="사진 삭제"
          @pointerdown.stop
          @click.stop="onDelete(it.img)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <p v-if="items.length === 0" class="gallery__empty">표시할 이미지가 없습니다.</p>

    <!-- 확대 오버레이: 이미지 클릭 = 한 단계 더 확대(토글), 바깥 클릭 = 닫기, 마우스 드래그 = 이동 -->
    <div
      v-if="zoomed"
      ref="lbEl"
      class="gallery__lightbox"
      :class="{ 'is-zoom': zoomedIn }"
      @pointerdown.stop="onPanStart"
      @pointermove="onPanMove"
      @pointerup="onPanEnd"
      @pointercancel="onPanEnd"
      @click="closeZoom"
    >
      <img
        :src="zoomed.img"
        :alt="zoomed.name"
        class="gallery__lightbox-img"
        :class="{ 'is-zoom': zoomedIn }"
        draggable="false"
        referrerpolicy="no-referrer"
        @click.stop="onImgClick"
      />
    </div>
  </section>
  </transition>
</template>

<style scoped lang="scss">
.gallery {
  position: absolute;
  inset: 0;
  z-index: 10;
  overflow-y: auto;
  overflow-x: hidden;
  background: #222222;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; // 갤러리는 스크롤바 숨김
  &::-webkit-scrollbar { width: 0; height: 0; }
}

.gallery__close {
  position: absolute;
  top: 3.5%;
  right: 4%;
  z-index: 2;
  display: flex;
  padding: 1.5cqw;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  border-radius: 50%;
  backdrop-filter: blur(4px);

  svg { width: 6cqw; height: 6cqw; }
  &:active { opacity: 0.6; }
}

// 등장/퇴장
.gallery-fade-enter-active,
.gallery-fade-leave-active {
  transition: opacity 0.2s ease;
}
.gallery-fade-enter-from,
.gallery-fade-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .gallery-fade-enter-active,
  .gallery-fade-leave-active { transition: none; }
}

.gallery__title {
  margin: 0;
  padding: 4cqw 6.667% 5cqw;
  color: #fff;
  font-size: 14cqw;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-shadow: 0 0 6cqw rgba(255, 255, 255, 0.45);
}

// 사진 추가 바
.gallery__add {
  display: flex;
  gap: 2cqw;
  padding: 0 6.667% 4cqw;
}
.gallery__add-input {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: 2cqw 3cqw;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 2cqw;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 3.6cqw;
}
.gallery__add-btn {
  flex: 0 0 auto;
  padding: 2cqw 3.5cqw;
  border-radius: 2cqw;
  background: $color-primary;
  color: #fff;
  font-size: 3.6cqw;
  font-weight: 700;
  &:disabled { opacity: 0.5; }
  &:active { opacity: 0.7; }
  &--ghost { background: rgba(255, 255, 255, 0.15); }
}
.gallery__add-toggle {
  padding: 2cqw 3.5cqw;
  border-radius: 2cqw;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 3.6cqw;
  font-weight: 700;
  &:active { opacity: 0.6; }
}

// 2단 메이슨리
.gallery__grid {
  column-count: 2;
  column-gap: 3.5cqw;
  padding: 0 6.667% 12cqw;
}
.gallery__cell {
  position: relative;
  margin: 0 0 3.5cqw;
  break-inside: avoid;
}
.gallery__item {
  display: block;
  width: 100%;
  padding: 0;
  border-radius: 3.5cqw;
  overflow: hidden;
  background: #2c2c30;
  transition: filter 0.15s ease, transform 0.1s ease;
  cursor: pointer;

  img { display: block; width: 100%; height: auto; }
  &:hover { filter: brightness(0.85); }
  &:active { transform: scale(0.98); }
}
.gallery__del {
  position: absolute;
  top: 2cqw;
  right: 2cqw;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 7cqw;
  height: 7cqw;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);

  svg { width: 4cqw; height: 4cqw; }
  &:active { opacity: 0.6; }
}

.gallery__empty {
  padding: 12cqw;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

// 확대 오버레이 (flex + margin:auto → 더 확대해도 모든 방향으로 스크롤 가능)
.gallery__lightbox {
  position: sticky;
  inset: 0;
  z-index: 20;
  display: flex;
  overflow: auto;
  height: 100%;
  padding: 8cqw;
  background: rgba(0, 0, 0, 0.85);
  cursor: zoom-out; // 바깥 = 닫기
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { width: 0; height: 0; }

  &.is-zoom { cursor: grab; } // 확대 시 마우스 드래그로 이동
}
.gallery__lightbox-img {
  margin: auto; // 작을 땐 가운데, 클 땐 스크롤
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 2cqw;
  cursor: zoom-in; // 이미지 = 더 확대
  transition: max-width 0.2s ease, max-height 0.2s ease;

  &.is-zoom {
    max-width: none;
    max-height: none;
    width: 200%; // 한 단계 더 확대
    height: auto;
    border-radius: 0;
    cursor: grab;
  }
}
</style>
