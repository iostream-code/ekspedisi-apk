import $ from 'jquery';

const CLOSE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

/**
 * Modal generik (overlay + panel) -- KOMPONEN PERTAMA app ini yang butuh
 * modal (sebelumnya toggle "Riwayat" cukup ganti mode di tempat, tanpa
 * overlay terpisah). Dipasang langsung ke <body> (bukan $container halaman)
 * supaya selalu di atas navbar `sticky` & tidak ikut kepotong `overflow-hidden`
 * elemen manapun. Sheet dari bawah di layar sempit (mobile-first, konsisten
 * sama gaya app ini), jadi dialog center di layar >= sm.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.bodyHtml
 * @returns {{ close: Function, $body: jQuery }} `$body` (2026-08-20, dipakai
 *   form CRUD kayak "Kelola Ekspedisi") -- elemen `.p-4` yang membungkus
 *   `bodyHtml`, dipakai pemanggil buat `$body.find(...)` & bind event
 *   handler (submit form, dst) SETELAH modal-nya kepasang ke DOM.
 */
export function renderModal({ title, bodyHtml }) {
  const $overlay = $(`
    <div class="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div class="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-card sm:max-w-md sm:rounded-2xl">
        <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
          <p class="font-display text-base font-semibold text-ink">${title}</p>
          <button aria-label="Tutup" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" data-modal-close>${CLOSE_ICON}</button>
        </div>
        <div class="p-4" data-modal-body>${bodyHtml}</div>
      </div>
    </div>
  `);

  function close() {
    $overlay.remove();
    $(document).off('keydown.modal');
  }

  $overlay.on('mousedown', (e) => {
    if (e.target === $overlay[0]) close();
  });
  $overlay.find('[data-modal-close]').on('click', close);
  $(document).on('keydown.modal', (e) => {
    if (e.key === 'Escape') close();
  });

  $('body').append($overlay);

  return { close, $body: $overlay.find('[data-modal-body]') };
}
