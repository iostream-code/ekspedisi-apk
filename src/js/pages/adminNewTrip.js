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
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Nomor Surat Jalan (opsional)</label>
        <div class="flex gap-2">
          <input id="no-surat-jalan" type="text" placeholder="Contoh: SJ_000811"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          <button type="button" id="btn-cek-sj" class="btn-ghost shrink-0 !py-2.5 px-4 text-sm">Cek</button>
        </div>
        <p class="mt-1.5 text-xs text-slate-400">Kalau perjalanan ini terkait SJ resmi yang sudah dibuat (mis. lewat app Surat Jalan), isi nomornya supaya tertaut -- opsional, boleh dikosongkan.</p>
        <div id="sj-preview" class="mt-2 hidden rounded-lg bg-brand-50 p-3 text-xs text-brand-700"></div>
      </div>
      <p id="form-error" class="hidden rounded-lg bg-status-alert/10 px-3 py-2 text-sm font-medium text-status-alert"></p>
      <button type="submit" id="btn-submit" class="btn-route w-full">Buat Perjalanan</button>
    </form>
  `);

  $main.find('#btn-cek-sj').on('click', function () {
    const no = $('#no-surat-jalan').val().trim();
    const $preview = $('#sj-preview');
    if (!no) {
      $preview.addClass('hidden');
      return;
    }

    const $btn = $(this);
    setButtonLoading($btn, true, '...');
    api.get(`/admin/surat-jalan/${encodeURIComponent(no)}`)
      .then((sj) => {
        $preview.removeClass('hidden').removeClass('bg-status-alert/10 text-status-alert').addClass('bg-brand-50 text-brand-700').html(`
          <p class="font-semibold">${sj.client_nama || '-'}</p>
          <p class="mt-0.5">${sj.kendaraan || '-'}${sj.plat ? ' (' + sj.plat + ')' : ''} — ${sj.pengirim || '-'}</p>
        `);
      })
      .catch(() => {
        $preview.removeClass('hidden').removeClass('bg-brand-50 text-brand-700').addClass('bg-status-alert/10 text-status-alert')
          .html('Nomor SJ tidak ditemukan.');
      })
      .always(() => setButtonLoading($btn, false));
  });

  $main.find('#new-trip-form').on('submit', function (e) {
    e.preventDefault();
    const destination = $('#destination').val().trim();
    const noSuratJalan = $('#no-surat-jalan').val().trim();
    const $btn = $('#btn-submit');
    const $err = $('#form-error');
    $err.addClass('hidden');
    setButtonLoading($btn, true, 'Membuat perjalanan...');

    api.post(`/admin/drivers/${driverId}/trip`, { destination, no_surat_jalan: noSuratJalan })
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
