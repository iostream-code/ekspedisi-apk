import $ from 'jquery';

const REFRESH_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`;
const HISTORY_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const LIST_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;
const PLUS_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const SEARCH_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

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
 * @param {string} [opts.addLabel] - kalau diisi, tampilkan tombol tambah (ikon "+") di toolbar,
 *   dipakai sebagai tooltip title-nya (mis. "Buat SJ") -- gaya tombol sama persis dengan
 *   Riwayat/Refresh (ikon polos, bukan tombol berwarna), cuma beda ikon.
 * @param {Function} [opts.onAdd]
 * @param {string} [opts.searchValue] - nilai awal kotak cari (dipertahankan lintas
 *   refresh/toggle-riwayat, lihat pemanggil)
 * @param {Function} [opts.onSearch] - kalau diisi, tampilkan kotak cari di bawah bar gelap.
 *   Dipanggil dgn teks pencarian (debounced ~400ms sambil ngetik, langsung saat Enter).
 * @param {number[]} [opts.yearOptions] - kalau diisi (bareng onYearChange), tampilkan dropdown
 *   filter tahun SEJAJAR kotak cari (2026-08-20, diminta khusus tab "SJ") -- daftar tahun yang
 *   ADA di data (dari backend, bukan range hardcode), diurutkan terbaru dulu. TIDAK ADA pilihan
 *   "semua tahun" (2026-08-20, sengaja dicabut) -- selalu 1 tahun spesifik terpilih, pemanggil
 *   yang jamin `yearOptions` selalu mengandung tahun default (lihat adminSuratJalan.js). Opt-in
 *   supaya tab lain yang juga pakai toolbar ini (mis. SPK) tidak ikut kena filter yang tidak relevan.
 * @param {string} [opts.yearValue] - tahun yang lagi aktif dipilih.
 * @param {Function} [opts.onYearChange] - dipanggil dgn tahun yang baru dipilih.
 */
export function renderTableToolbar($container, { count, historyActive, onRefresh, onToggleHistory, addLabel, onAdd, searchValue, onSearch, yearOptions, yearValue, onYearChange }) {
  const $bar = $(`
    <div class="flex items-center justify-between rounded-t-2xl bg-ink px-4 py-2.5">
      <p class="text-sm font-semibold text-white">Data | ${count}</p>
      <div class="flex items-center gap-3">
        ${addLabel ? `<button id="btn-toolbar-add" title="${addLabel}" class="rounded p-0.5 text-white/70 transition hover:text-white">${PLUS_ICON}</button>` : ''}
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

  if (onSearch) {
    const yearOptionsHtml = onYearChange
      ? (yearOptions || [])
          .map((y) => `<option value="${y}" ${String(y) === String(yearValue || '') ? 'selected' : ''}>${y}</option>`)
          .join('')
      : '';
    const $searchRow = $(`
      <div class="flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-2">
        <div class="relative flex-1">
          <span class="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-slate-400">${SEARCH_ICON}</span>
          <input type="text" value="${searchValue || ''}" placeholder="Cari..."
            class="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
        ${onYearChange ? `<select class="shrink-0 rounded-lg border border-slate-200 py-1.5 pl-2 pr-6 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100">${yearOptionsHtml}</select>` : ''}
      </div>
    `);
    let debounceTimer;
    $searchRow.find('input').on('input', function () {
      clearTimeout(debounceTimer);
      const val = $(this).val();
      debounceTimer = setTimeout(() => onSearch(val), 400);
    }).on('keydown', function (e) {
      if (e.key === 'Enter') {
        clearTimeout(debounceTimer);
        onSearch($(this).val());
      }
    });
    if (onYearChange) {
      $searchRow.find('select').on('change', function () {
        onYearChange($(this).val());
      });
    }
    $container.append($searchRow);
  }
}
