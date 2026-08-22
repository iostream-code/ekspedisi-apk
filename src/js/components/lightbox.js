import $ from 'jquery';

const CLOSE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ROTATE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3.4-7.03"/><polyline points="21 3 21 9 15 9"/></svg>`;

const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 300;

/**
 * Popup gambar (lightbox) full-screen -- overlay gelap + gambar full di
 * tengah (`object-contain`, muat di layar). Beda dari components/modal.js
 * (panel putih, ada judul/konten terstruktur) -- ini murni gambar, tanpa
 * chrome, ditutup klik di mana pun/tombol X/Esc.
 *
 * Rotate + zoom (2026-08-21) diimplementasi sendiri di sini pakai CSS
 * transform + touch event murni -- BUKAN plugin Cordova native. Sudah dicek
 * (lihat catatan di README/percakapan): tidak ada plugin Cordova image-viewer
 * yang mendukung rotate+zoom sekaligus secara andal -- yang zoom-nya bagus
 * (cordova-plugin-photo-viewer) 9 tahun tidak di-update (risiko konflik
 * AndroidX/build gagal, sama seperti kasus adaptive-icon), yang lebih baru
 * (cordova-plugin-zoomimageview) tidak ada rotate & butuh setup Kotlin
 * tambahan. Implementasi JS di sini penuh dalam kendali kita & terintegrasi
 * langsung ke sistem `data-lightbox` yang sudah ada, tanpa dependency native
 * tambahan yang rapuh.
 */
export function openLightbox(src, alt = '') {
  const $overlay = $(`
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/90 p-4">
      <button aria-label="Putar gambar" class="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" data-lightbox-rotate>${ROTATE_ICON}</button>
      <button aria-label="Tutup" class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" data-lightbox-close>${CLOSE_ICON}</button>
      <div class="flex h-full w-full touch-none items-center justify-center" data-lightbox-stage>
        <img src="${src}" alt="${alt}" draggable="false" class="max-h-full max-w-full select-none rounded-lg object-contain" data-lightbox-img />
      </div>
    </div>
  `);

  const $stage = $overlay.find('[data-lightbox-stage]');
  const $img = $overlay.find('[data-lightbox-img]');

  // rotateDeg: kelipatan 90 (0/90/180/270). zoomScale: dari pinch/double-tap
  // (1..MAX_SCALE). tx/ty: pan dalam px layar -- SENGAJA tidak terpengaruh
  // rotate/scale krn urutan fungsi transform CSS (translate ditulis PALING
  // KIRI = diterapkan PALING LUAR/terakhir, koordinatnya tetap px layar apa
  // adanya) -- jadi delta jari pas panning bisa dipetakan 1:1 tanpa perlu
  // dikoreksi balik thd rotasi/skala saat ini.
  let rotateDeg = 0;
  let zoomScale = 1;
  let tx = 0;
  let ty = 0;

  // Gambar rendered box (offsetWidth/Height) TIDAK berubah oleh `transform`
  // (transform murni visual, tidak mempengaruhi layout box) -- jadi ini selalu
  // ukuran gambar ter-fit di rotate 0, dipakai hitung skala tambahan supaya
  // gambar landscape/portrait yang sudah dirotasi 90/270 tidak kepotong keluar
  // layar (bounding box-nya kebalik, lebar<->tinggi).
  function fitScaleForRotation() {
    if (rotateDeg % 180 === 0) return 1;
    const w = $img[0].offsetWidth;
    const h = $img[0].offsetHeight;
    if (!w || !h) return 1;
    const stageW = $stage[0].clientWidth;
    const stageH = $stage[0].clientHeight;
    return Math.min(stageW / h, stageH / w, 1);
  }

  function applyTransform() {
    const scale = zoomScale * fitScaleForRotation();
    $img.css('transform', `translate(${tx}px, ${ty}px) rotate(${rotateDeg}deg) scale(${scale})`);
  }

  function resetView() {
    zoomScale = 1;
    tx = 0;
    ty = 0;
    applyTransform();
  }

  $overlay.find('[data-lightbox-rotate]').on('click', (e) => {
    e.stopPropagation();
    rotateDeg = (rotateDeg + 90) % 360;
    resetView();
  });

  function pinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  let pinchStartDist = null;
  let pinchStartScale = 1;
  let panStart = null; // { x, y, tx, ty }
  let lastTapAt = 0;

  $stage.on('touchstart', (e) => {
    const touches = e.originalEvent.touches;
    if (touches.length === 2) {
      pinchStartDist = pinchDistance(touches);
      pinchStartScale = zoomScale;
      panStart = null;
    } else if (touches.length === 1) {
      const now = Date.now();
      if (now - lastTapAt < DOUBLE_TAP_MS) {
        lastTapAt = 0;
        zoomScale = zoomScale > 1 ? 1 : 2;
        tx = 0;
        ty = 0;
        applyTransform();
        return;
      }
      lastTapAt = now;
      if (zoomScale > 1) {
        panStart = { x: touches[0].clientX, y: touches[0].clientY, tx, ty };
      }
    }
  });

  $stage.on('touchmove', (e) => {
    const touches = e.originalEvent.touches;
    if (touches.length === 2 && pinchStartDist) {
      e.preventDefault();
      zoomScale = Math.min(MAX_SCALE, Math.max(1, pinchStartScale * (pinchDistance(touches) / pinchStartDist)));
      applyTransform();
    } else if (touches.length === 1 && panStart) {
      e.preventDefault();
      tx = panStart.tx + (touches[0].clientX - panStart.x);
      ty = panStart.ty + (touches[0].clientY - panStart.y);
      applyTransform();
    }
  });

  $stage.on('touchend touchcancel', (e) => {
    if (e.originalEvent.touches.length < 2) pinchStartDist = null;
    if (e.originalEvent.touches.length === 0) {
      panStart = null;
      if (zoomScale <= 1) resetView();
    }
  });

  // Scroll wheel/drag mouse -- cuma relevan pas develop lewat browser (`npm
  // run dev`), tidak ada efek di WebView Android (tidak ada wheel/mouse asli),
  // tapi murah utk ditambahkan & bikin QA di browser lebih gampang.
  $stage.on('wheel', (e) => {
    e.preventDefault();
    const delta = e.originalEvent.deltaY < 0 ? 0.2 : -0.2;
    zoomScale = Math.min(MAX_SCALE, Math.max(1, zoomScale + delta));
    if (zoomScale <= 1) {
      tx = 0;
      ty = 0;
    }
    applyTransform();
  });

  let mouseDragStart = null;
  $stage.on('mousedown', (e) => {
    if (zoomScale <= 1) return;
    mouseDragStart = { x: e.clientX, y: e.clientY, tx, ty };
  });
  $(document).on('mousemove.lightbox', (e) => {
    if (!mouseDragStart) return;
    tx = mouseDragStart.tx + (e.clientX - mouseDragStart.x);
    ty = mouseDragStart.ty + (e.clientY - mouseDragStart.y);
    applyTransform();
  });
  $(document).on('mouseup.lightbox', () => {
    mouseDragStart = null;
  });

  function close() {
    $overlay.remove();
    $(document).off('keydown.lightbox mousemove.lightbox mouseup.lightbox');
  }

  // Klik di area kosong (bukan gambar/tombol) menutup -- gambar sendiri
  // dipegang $stage yang menutupi seluruh layar, jadi cek target harus
  // persis $overlay ATAU $stage (bukan img/tombol) supaya tap di luar
  // gambar (area letterbox) tetap menutup popup.
  $overlay.on('mousedown', (e) => {
    if (e.target === $overlay[0] || e.target === $stage[0]) close();
  });
  $overlay.find('[data-lightbox-close]').on('click', close);
  $(document).on('keydown.lightbox', (e) => {
    if (e.key === 'Escape') close();
  });

  $('body').append($overlay);
  return { close };
}

let delegationBound = false;

/**
 * Dipanggil SEKALI saat bootstrap (main.js) -- pasang 1 delegated click
 * listener di `document` utk SEMUA `<img data-lightbox>` di app ini, sekarang
 * maupun yang baru ditambah belakangan (mis. isi modal `components/modal.js`
 * yang dirender ulang tiap dibuka). Jauh lebih simpel drpd bind ulang
 * per-halaman/per-render -- tinggal tempel atribut `data-lightbox` ke `<img>`
 * mana pun yang perlu bisa di-tap-zoom, tidak perlu wiring tambahan di
 * pemanggilnya.
 */
export function initLightboxDelegation() {
  if (delegationBound) return;
  delegationBound = true;
  $(document).on('click', 'img[data-lightbox]', function (e) {
    e.preventDefault();
    openLightbox(this.src, this.alt || '');
  });
}
