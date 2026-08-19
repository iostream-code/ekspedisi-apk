import $ from 'jquery';

const REFRESH_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`;
const HISTORY_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const LIST_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;

/**
 * Toolbar gaya "data table" (judul tetap "Data | <jumlah>" di kiri, tombol
 * tambah opsional + Riwayat + Refresh di kanan) -- dipasang di atas elemen
 * <table> pada halaman list admin (tab SPK & SJ). Meniru pola card-header di
 * surat-jalan-apk (judul "Data | ..." + ikon refresh/riwayat, lihat
 * pages/surat_jalan.html), disesuaikan ke sistem desain Tailwind app ini
 * (bukan tema gelap Framework7 aslinya).
 *
 * @param {object} opts
 * @param {number} opts.count
 * @param {boolean} opts.historyActive - true kalau sedang di mode Riwayat --
 *   ikon "Riwayat" berubah jadi ikon "kembali ke daftar aktif".
 * @param {Function} opts.onRefresh
 * @param {Function} opts.onToggleHistory
 * @param {string} [opts.addLabel] - kalau diisi, tampilkan tombol tambah di toolbar (mis. "+ Buat SJ")
 * @param {Function} [opts.onAdd]
 */
export function renderTableToolbar($container, { count, historyActive, onRefresh, onToggleHistory, addLabel, onAdd }) {
  const $bar = $(`
    <div class="flex items-center justify-between rounded-t-2xl bg-ink px-4 py-2.5">
      <p class="text-sm font-semibold text-white">Data | ${count}</p>
      <div class="flex items-center gap-3">
        ${addLabel ? `<button id="btn-toolbar-add" class="rounded-lg bg-route px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">${addLabel}</button>` : ''}
        <button id="btn-toggle-history" title="${historyActive ? 'Lihat daftar aktif' : 'Lihat riwayat'}"
          class="rounded p-0.5 text-white/70 transition hover:text-white">
          ${historyActive ? LIST_ICON : HISTORY_ICON}
        </button>
        <button id="btn-refresh" title="Refresh" class="rounded p-0.5 text-white/70 transition hover:text-white">
          ${REFRESH_ICON}
        </button>
      </div>
    </div>
  `);
  if (addLabel) $bar.find('#btn-toolbar-add').on('click', onAdd);
  $bar.find('#btn-toggle-history').on('click', onToggleHistory);
  $bar.find('#btn-refresh').on('click', onRefresh);
  $container.append($bar);
}
