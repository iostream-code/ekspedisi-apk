import $ from 'jquery';
import { getSession, logout } from '../auth.js';
import { geo } from '../geo.js';
import { navigate } from '../router.js';
import { initConnectionIndicator } from '../connection.js';

const BACK_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatClockDate(d) {
  const year = String(d.getFullYear()).slice(-2);
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${year}`;
}

function formatClockTime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * @param {object} opts
 * @param {Function} [opts.onBack] - kalau diisi, tampilkan bar "Kembali" TERPISAH
 *   di bawah topbar utama (2026-08-20, dulu tombol back nempel di dalam topbar
 *   hijau bareng judul -- dipisah supaya topbar cuma isi identitas/status,
 *   navigasi "kembali" jadi elemen sendiri) yang manggil fungsi ini saat diklik.
 */
export function renderNavbar($container, title, opts = {}) {
  const { onBack } = opts;
  const session = getSession();
  const name = session?.user?.name || 'Pengguna';

  const $nav = $(`
    <header class="sticky top-0 z-20 flex items-center justify-between bg-brand-600 px-3 py-2.5 shadow-card">
      <div class="flex min-w-0 items-center gap-2">
        <div id="connection-indicator" class="connection-indicator" title="Status koneksi"></div>
        <div class="min-w-0">
          <p class="truncate font-display text-lg font-semibold leading-none text-white">${title}</p>
          <p class="mt-0.5 truncate text-xs text-white/70">${name}</p>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <div class="text-right leading-tight text-white/80">
          <p class="text-[11px] font-medium" data-clock-date></p>
          <p class="text-xs font-semibold tabular-nums" data-clock-time></p>
        </div>
        <button id="btn-logout" aria-label="Keluar" title="Keluar"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white active:scale-95">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
        </button>
      </div>
    </header>
  `);

  $nav.find('#btn-logout').on('click', () => {
    geo.stopTracking();
    logout();
    navigate('/login');
  });

  $container.append($nav);
  initConnectionIndicator($nav.find('#connection-indicator'));

  if (onBack) {
    const $backBar = $(`
      <div class="flex items-center border-b border-slate-200 bg-white px-2 py-1.5">
        <button id="btn-back" class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 active:scale-95">
          ${BACK_ICON}
          Kembali
        </button>
      </div>
    `);
    $backBar.find('#btn-back').on('click', onBack);
    $container.append($backBar);
  }

  // Jam jalan (2026-08-20) -- update tiap detik, dibersihkan pas pindah
  // halaman (pola sama dgn auto-refresh adminDashboard.js/polling adminSpkBelumSj.js)
  // supaya tidak numpuk interval tiap kali navbar dirender ulang.
  function tickClock() {
    const now = new Date();
    $nav.find('[data-clock-date]').text(formatClockDate(now));
    $nav.find('[data-clock-time]').text(formatClockTime(now));
  }
  tickClock();
  const clockTimer = setInterval(tickClock, 1000);
  window.addEventListener('hashchange', function cleanup() {
    clearInterval(clockTimer);
    window.removeEventListener('hashchange', cleanup);
  }, { once: true });
}
