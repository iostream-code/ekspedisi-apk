import $ from 'jquery';
import { getSession, logout } from '../auth.js';
import { geo } from '../geo.js';
import { navigate } from '../router.js';

/**
 * @param {object} opts
 * @param {Function} [opts.onBack] - kalau diisi, tampilkan tombol back di kiri title
 *   yang manggil fungsi ini saat diklik (biasanya navigate(...) ke halaman sebelumnya).
 */
export function renderNavbar($container, title, opts = {}) {
  const { onBack } = opts;
  const session = getSession();
  const name = session?.user?.name || 'Pengguna';

  const backButtonHtml = onBack
    ? `
      <button id="btn-back" aria-label="Kembali" title="Kembali"
        class="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 active:scale-95">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
    `
    : '';

  const $nav = $(`
    <header class="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur">
      <div class="flex min-w-0 items-center">
        ${backButtonHtml}
        <div class="min-w-0">
          <p class="truncate font-display text-lg font-semibold leading-none text-ink">${title}</p>
          <p class="mt-0.5 truncate text-xs text-slate-500">${name}</p>
        </div>
      </div>
      <button id="btn-logout" aria-label="Keluar" title="Keluar"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-status-alert/10 hover:text-status-alert active:scale-95">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
      </button>
    </header>
  `);

  if (onBack) $nav.find('#btn-back').on('click', onBack);

  $nav.find('#btn-logout').on('click', () => {
    geo.stopTracking();
    logout();
    navigate('/login');
  });

  $container.append($nav);
}
