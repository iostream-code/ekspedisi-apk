import $ from 'jquery';

const CLOSE_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

/**
 * Popup gambar (lightbox) full-screen -- overlay gelap + gambar full di
 * tengah (`object-contain`, muat di layar). Beda dari components/modal.js
 * (panel putih, ada judul/konten terstruktur) -- ini murni gambar, tanpa
 * chrome, ditutup klik di mana pun/tombol X/Esc.
 */
export function openLightbox(src, alt = '') {
  const $overlay = $(`
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/90 p-4">
      <button aria-label="Tutup" class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" data-lightbox-close>${CLOSE_ICON}</button>
      <img src="${src}" alt="${alt}" class="max-h-full max-w-full rounded-lg object-contain" />
    </div>
  `);

  function close() {
    $overlay.remove();
    $(document).off('keydown.lightbox');
  }

  $overlay.on('mousedown', (e) => {
    if (e.target === $overlay[0]) close();
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
