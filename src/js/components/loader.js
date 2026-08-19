import $ from 'jquery';

/**
 * SVG spinner (pola spinner Tailwind yang umum dipakai). className wajib mengandung
 * ukuran (mis. 'h-5 w-5') dan warna (mis. 'text-white' / 'text-brand-600').
 */
export function spinnerSvg(className = 'h-5 w-5 text-brand-600') {
  return `
    <svg class="animate-spin ${className}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
    </svg>
  `;
}

/**
 * Blok loading full-width buat dipasang di tengah halaman/section saat fetch data awal
 * (pengganti teks polos "Memuat...").
 */
export function pageLoaderHtml(label = 'Memuat...') {
  return `
    <div class="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-slate-400">
      ${spinnerSvg('h-7 w-7 text-brand-600')}
      <p class="text-sm">${label}</p>
    </div>
  `;
}

/**
 * Ikon kosong + label singkat buat state list yang belum ada isinya --
 * mis. trip-list dashboard supir & riwayat perjalanan di detail supir (admin).
 */
export function emptyStateHtml() {
  return `
    <div class="flex flex-col items-center justify-center gap-1.5 py-6 text-slate-300">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 8l-2-5H5L3 8" />
        <path d="M3 8v11a2 2 0 002 2h14a2 2 0 002-2V8" />
        <path d="M3 8h18" />
        <path d="M9 12v3h6v-3" />
      </svg>
      <p class="text-xs font-medium text-slate-400">Data Kosong</p>
    </div>
  `;
}

/**
 * Toggle state loading pada tombol: disable + ganti isi jadi spinner+label,
 * lalu kembalikan ke tampilan semula (disimpan otomatis) saat loading = false.
 */
export function setButtonLoading($btn, loading, loadingLabel = 'Memproses...') {
  if (loading) {
    if ($btn.data('original-html') === undefined) {
      $btn.data('original-html', $btn.html());
    }
    $btn.prop('disabled', true).html(`${spinnerSvg('h-4 w-4 text-white')}<span>${loadingLabel}</span>`);
  } else {
    const original = $btn.data('original-html');
    $btn.prop('disabled', false);
    if (original !== undefined) $btn.html(original);
  }
}
