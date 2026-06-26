<script setup lang="ts">
// 갤러리 화면 — 캐릭터 일러스트 그리드(메이슨리). 탭하면 확대 오버레이.
import { computed, ref } from 'vue'
import { useCharacters, resolveImage } from '@/stores/characters'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { characters } = useCharacters()

const items = computed(() =>
  characters
    .map((c) => ({ id: c.id, name: c.name, img: resolveImage(c.image) }))
    .filter((c) => c.img),
)

// 확대된 이미지 (null = 닫힘) + 추가 줌 단계
const zoomed = ref<{ name: string; img: string } | null>(null)
const zoomedIn = ref(false) // 한 단계 더 확대

function openZoom(it: { name: string; img: string }) {
  zoomed.value = it
  zoomedIn.value = false
}
function closeZoom() {
  zoomed.value = null
  zoomedIn.value = false
}
function toggleZoomIn() {
  zoomedIn.value = !zoomedIn.value
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

    <div class="gallery__grid">
      <button
        v-for="it in items"
        :key="it.id"
        type="button"
        class="gallery__item"
        @click.stop="openZoom(it)"
      >
        <img :src="it.img" :alt="it.name" draggable="false" referrerpolicy="no-referrer" />
      </button>
    </div>

    <p v-if="items.length === 0" class="gallery__empty">표시할 이미지가 없습니다.</p>

    <!-- 확대 오버레이: 이미지 클릭 = 한 단계 더 확대(토글), 바깥(오버레이) 클릭 = 닫기 -->
    <div
      v-if="zoomed"
      class="gallery__lightbox"
      @pointerdown.stop
      @click="closeZoom"
    >
      <img
        :src="zoomed.img"
        :alt="zoomed.name"
        class="gallery__lightbox-img"
        :class="{ 'is-zoom': zoomedIn }"
        draggable="false"
        referrerpolicy="no-referrer"
        @click.stop="toggleZoomIn"
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

// 2단 메이슨리
.gallery__grid {
  column-count: 2;
  column-gap: 3.5cqw;
  padding: 0 6.667% 12cqw;
}
.gallery__item {
  display: block;
  width: 100%;
  margin: 0 0 3.5cqw;
  padding: 0;
  border-radius: 3.5cqw;
  overflow: hidden;
  background: #2c2c30;
  break-inside: avoid;
  transition: filter 0.15s ease, transform 0.1s ease;
  cursor: pointer;

  img { display: block; width: 100%; height: auto; }
  &:hover { filter: brightness(0.85); }
  &:active { transform: scale(0.98); }
}

.gallery__empty {
  padding: 12cqw;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

// 확대 오버레이 (flex + margin:auto → 더 확대해도 모든 방향으로 스크롤 가능)
.gallery__lightbox {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  overflow: auto;
  padding: 8cqw;
  background: rgba(0, 0, 0, 0.85);
  cursor: zoom-out; // 바깥 = 닫기
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { width: 0; height: 0; }
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
    cursor: zoom-out;
  }
}
</style>
