import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { pageLoaderHtml, emptyStateHtml, setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { formatSpkNo } from '../format.js';
import { takePhoto } from '../camera.js';

/**
 * 1 slot dokumen (SIM/KTP/STNK) -- kalau sudah ada fotonya, tampilkan
 * thumbnail (data-lightbox, lihat components/lightbox.js). Kalau belum,
 * tombol "Upload Foto" yang langsung ambil+kirim foto begitu diklik (beda
 * dari adminNewDriver.js yang nunda kirim sampai form disubmit -- di sini
 * driver-nya SUDAH ADA, jadi upload bisa langsung per-slot, mirip pola
 * tombol "Validasi" di adminSuratJalan.js). Dipakai buat melengkapi dokumen
 * supir INTERNAL yang ke-provision otomatis lewat login pertama (tidak
 * pernah lewat form "Tambah Supir" sama sekali, lihat README backend), atau
 * ganti foto yang salah/kadaluarsa.
 */
function renderDocSlot($container, driverId, key, label, url) {
  const $slot = $(`<div><p class="mb-1 text-xs font-medium text-slate-500">${label}</p></div>`);
  $container.append($slot);

  function showPhoto(photoUrl) {
    $slot.find('img, button').remove();
    $slot.append(`<img src="${photoUrl}" data-lightbox class="h-16 w-16 cursor-zoom-in rounded-lg border border-slate-200 object-cover" />`);
  }

  if (url) {
    showPhoto(url);
    return;
  }

  const $btn = $(`<button class="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">Upload Foto</button>`);
  $slot.append($btn);
  $btn.on('click', async () => {
    let blob;
    try {
      blob = await takePhoto();
    } catch (e) {
      return; // batal ambil foto
    }
    setButtonLoading($btn, true, '...');
    api.postMultipart(`/admin/drivers/${driverId}/documents`, { [key]: blob })
      .then((updated) => showPhoto(updated[key]))
      .catch((xhr) => {
        alert(xhr?.responseJSON?.message || 'Gagal mengunggah dokumen. Coba lagi.');
        setButtonLoading($btn, false);
      });
  });
}

export async function renderAdminDriverDetail($container, params) {
  const driverId = params.driverId;
  renderNavbar($container, 'Detail Supir', { onBack: () => navigate('/admin/ekspedisi') });

  const $main = $(`<main class="flex-1 p-4">${pageLoaderHtml('Memuat detail supir...')}</main>`);
  $container.append($main);

  let detail;
  try {
    detail = await api.get(`/admin/drivers/${driverId}`);
  } catch (e) {
    $main.html('<p class="text-status-alert">Gagal memuat detail supir.</p>');
    return;
  }

  $main.empty();
  $main.append(`
    <section class="card mb-4 p-4">
      <div class="flex items-center gap-3">
        <span class="status-dot ${detail.status}"></span>
        <div>
          <p class="font-display text-lg font-semibold text-ink">${detail.name}</p>
          <p class="text-sm text-slate-500">${detail.phone || '-'}</p>
        </div>
      </div>
    </section>

    <section class="card mb-4 p-4">
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Dokumen</p>
      <div id="doc-slots" class="grid grid-cols-3 gap-3"></div>
    </section>

    <button id="btn-new-trip" class="btn-route mb-4 w-full">+ Perjalanan Baru</button>

    <p class="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Riwayat Perjalanan</p>
    <div id="trip-list" class="space-y-3"></div>
  `);

  const $docSlots = $main.find('#doc-slots');
  renderDocSlot($docSlots, driverId, 'foto_sim', 'SIM', detail.foto_sim);
  if (detail.tipe === 'eksternal') {
    renderDocSlot($docSlots, driverId, 'foto_ktp', 'KTP', detail.foto_ktp);
    renderDocSlot($docSlots, driverId, 'foto_stnk', 'STNK', detail.foto_stnk);
  }

  $main.find('#btn-new-trip').on('click', () => navigate(`/admin/driver/${driverId}/trip/new`));

  const $tripList = $main.find('#trip-list');
  (detail.trips || []).forEach((trip) => {
    const isActive = trip.status_label === 'Sedang Berjalan';
    const $card = $(`
      <div class="card p-4">
        <div class="flex items-center justify-between">
          <p class="font-medium text-ink">${trip.destination || 'Perjalanan #' + trip.id}</p>
          <span class="rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? 'bg-status-online/10 text-status-online' : 'bg-slate-100 text-slate-600'}">${trip.status_label}</span>
        </div>
        <p class="mt-1 text-xs text-slate-400">${trip.created_at}${trip.penjualan_id ? ' &middot; ' + formatSpkNo(trip.penjualan_id) : ''}${trip.no_surat_jalan ? ' &middot; SJ ' + trip.no_surat_jalan : ''}</p>
        <div class="mt-3 flex gap-2" data-photos></div>
      </div>
    `);
    const $photos = $card.find('[data-photos]');
    (trip.photos || []).forEach((p) => {
      $photos.append(`
        <img src="${p.url}" data-lightbox class="h-16 w-16 cursor-zoom-in rounded-lg border border-slate-200 object-cover" />
      `);
    });
    if (!(trip.photos || []).length) {
      $photos.append('<p class="text-xs text-slate-400">Belum ada foto checkpoint.</p>');
    }
    // Supir eksternal tidak punya akun -> tidak bisa checkpoint foto/selesai
    // sendiri lewat app. Satu-satunya jalan: admin tandai manual di sini.
    if (isActive && detail.tipe === 'eksternal') {
      const $btn = $(`<button class="btn-ghost mt-3 w-full !py-2.5 text-sm">Tandai Selesai</button>`);
      $btn.on('click', function () {
        if (!confirm('Tandai perjalanan ini sebagai selesai? Supir eksternal tidak bisa membatalkan ini sendiri.')) return;
        setButtonLoading($btn, true, 'Menyimpan...');
        api.post(`/admin/trips/${trip.id}/complete`, {})
          .then(() => {
            $card.find('span.rounded-full').removeClass('bg-status-online/10 text-status-online').addClass('bg-slate-100 text-slate-600').text('Selesai');
            $btn.remove();
          })
          .catch((xhr) => {
            alert(xhr?.responseJSON?.message || 'Gagal menandai perjalanan selesai. Coba lagi.');
            setButtonLoading($btn, false);
          });
      });
      $card.append($btn);
    }
    $tripList.append($card);
  });

  if (!(detail.trips || []).length) {
    $tripList.append(emptyStateHtml());
  }
}
