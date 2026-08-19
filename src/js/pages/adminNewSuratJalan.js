import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';

/**
 * Bikin surat jalan MANUAL dari layar admin -- tidak terikat trip manapun
 * (beda dari jalur otomatis lewat checkpoint foto "sj" supir). Supir opsional
 * -- SJ boleh dibuat dulu, diisi supirnya belakangan lewat PUT /admin/sj/{id}
 * (belum ada UI edit-nya, backend sudah siap).
 */
export async function renderAdminNewSuratJalan($container) {
  renderNavbar($container, 'Buat Surat Jalan', { onBack: () => navigate('/admin/sj') });

  const $main = $(`<main class="flex-1 p-4"></main>`);
  $container.append($main);

  let drivers = [];
  try {
    drivers = await api.get('/admin/drivers');
  } catch (e) {
    drivers = [];
  }
  const driverOptions = drivers
    .map((d) => `<option value="${d.id}">${d.name}${d.tipe === 'eksternal' ? ' (Eksternal)' : ''}</option>`)
    .join('');

  $main.html(`
    <form id="new-sj-form" class="card space-y-4 p-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Tujuan</label>
        <input id="tujuan" type="text" placeholder="Contoh: Toko Makmur Jaya, Sidoarjo"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Supir (opsional)</label>
        <select id="driver_id" class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100">
          <option value="">-- Belum ditentukan --</option>
          ${driverOptions}
        </select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Kendaraan</label>
          <input id="kendaraan" type="text" placeholder="Grandmax"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Plat</label>
          <input id="plat" type="text" placeholder="P 1234 XY"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Jumlah kirim</label>
        <input id="jumlah_kirim" type="number" min="0" placeholder="0"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Catatan (opsional)</label>
        <textarea id="catatan" rows="2"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"></textarea>
      </div>
      <p id="form-error" class="hidden rounded-lg bg-status-alert/10 px-3 py-2 text-sm font-medium text-status-alert"></p>
      <button type="submit" id="btn-submit" class="btn-route w-full">Buat Surat Jalan</button>
    </form>
  `);

  $main.find('#new-sj-form').on('submit', function (e) {
    e.preventDefault();
    const $btn = $('#btn-submit');
    const $err = $('#form-error');
    $err.addClass('hidden');
    setButtonLoading($btn, true, 'Menyimpan...');

    api.post('/admin/sj', {
      tujuan: $('#tujuan').val().trim(),
      driver_id: $('#driver_id').val() || undefined,
      kendaraan: $('#kendaraan').val().trim(),
      plat: $('#plat').val().trim(),
      jumlah_kirim: $('#jumlah_kirim').val() || undefined,
      catatan: $('#catatan').val().trim(),
    })
      .then(() => {
        navigate('/admin/sj');
      })
      .catch((xhr) => {
        const msg = xhr?.responseJSON?.message || 'Gagal membuat surat jalan. Coba lagi.';
        $err.text(msg).removeClass('hidden');
        setButtonLoading($btn, false);
      });
  });
}
