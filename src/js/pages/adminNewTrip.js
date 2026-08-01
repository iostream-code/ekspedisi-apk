import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { pageLoaderHtml, setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';

export async function renderAdminNewTrip($container, params) {
  const driverId = params.driverId;
  renderNavbar($container, 'Perjalanan Baru', { onBack: () => navigate(`/admin/driver/${driverId}`) });

  const $main = $(`<main class="flex-1 p-4">${pageLoaderHtml('Memuat data supir...')}</main>`);
  $container.append($main);

  let driver;
  try {
    driver = await api.get(`/admin/drivers/${driverId}`);
  } catch (e) {
    $main.html('<p class="text-status-alert">Gagal memuat data supir.</p>');
    return;
  }

  $main.html(`
    <section class="card mb-4 p-4">
      <p class="text-xs font-medium uppercase tracking-wide text-slate-400">Perjalanan untuk</p>
      <div class="mt-1.5 flex items-center gap-2">
        <span class="status-dot ${driver.status}"></span>
        <p class="font-display font-semibold text-ink">${driver.name}</p>
      </div>
    </section>

    <form id="new-trip-form" class="card space-y-4 p-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Tujuan perjalanan</label>
        <input id="destination" type="text" required placeholder="Contoh: Gudang Sidoarjo -> Toko Makmur Jaya"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        <p class="mt-1.5 text-xs text-slate-400">Supir akan melihat perjalanan ini langsung di dashboard-nya dan diminta mengisi 3 checkpoint foto (berangkat, serah terima, SJ).</p>
      </div>
      <p id="form-error" class="hidden rounded-lg bg-status-alert/10 px-3 py-2 text-sm font-medium text-status-alert"></p>
      <button type="submit" id="btn-submit" class="btn-route w-full">Buat Perjalanan</button>
    </form>
  `);

  $main.find('#new-trip-form').on('submit', function (e) {
    e.preventDefault();
    const destination = $('#destination').val().trim();
    const $btn = $('#btn-submit');
    const $err = $('#form-error');
    $err.addClass('hidden');
    setButtonLoading($btn, true, 'Membuat perjalanan...');

    api.post(`/admin/drivers/${driverId}/trip`, { destination })
      .then(() => {
        navigate(`/admin/driver/${driverId}`);
      })
      .catch((xhr) => {
        const msg = xhr?.responseJSON?.message || 'Gagal membuat perjalanan. Coba lagi.';
        $err.text(msg).removeClass('hidden');
        setButtonLoading($btn, false);
      });
  });
}
