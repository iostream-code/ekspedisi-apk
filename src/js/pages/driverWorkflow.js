import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { pageLoaderHtml, setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { geo } from '../geo.js';
import { takePhoto } from '../camera.js';
import { navigate } from '../router.js';

const STEPS = [
  { key: 'berangkat', title: 'Foto Berangkat', desc: 'Foto kendaraan/muatan sebelum berangkat.' },
  { key: 'serah_terima', title: 'Foto Serah Terima Barang', desc: 'Foto saat barang diserahkan ke penerima.' },
  { key: 'sj', title: 'Foto Surat Jalan (SJ)', desc: 'Foto SJ yang sudah ditandatangani/dicap.' },
];

export async function renderDriverWorkflow($container, params) {
  const tripId = params.tripId;
  renderNavbar($container, 'Checkpoint Perjalanan', { onBack: () => navigate('/driver') });

  const $main = $(`<main class="flex-1 p-4">${pageLoaderHtml('Memuat data perjalanan...')}</main>`);
  $container.append($main);

  let trip;
  try {
    trip = await api.get(`/driver/trip/${tripId}`);
  } catch (e) {
    $main.html('<p class="p-4 text-status-alert">Gagal memuat data perjalanan.</p>');
    return;
  }

  // completed_steps: array of step keys yang sudah selesai, dikirim dari BE
  const completed = new Set(trip.completed_steps || []);
  const activeIndex = STEPS.findIndex((s) => !completed.has(s.key));

  $main.html(`
    ${trip.destination ? `<p class="mb-3 px-1 text-sm text-slate-500">${trip.destination}</p>` : ''}
    <div class="card route-track p-5" id="route-track"></div>
    <p id="workflow-note" class="mt-4 text-center text-xs text-slate-400"></p>
  `);

  const $track = $('#route-track');

  STEPS.forEach((step, idx) => {
    const isDone = completed.has(step.key);
    const isActive = idx === activeIndex;
    const stateClass = isDone ? 'done' : isActive ? 'active' : '';

    const $step = $(`
      <div class="route-step ${stateClass}" data-key="${step.key}">
        <div class="route-marker">${isDone ? '&#10003;' : idx + 1}</div>
        <div class="flex-1 pt-0.5">
          <p class="font-display font-semibold text-ink">${step.title}</p>
          <p class="mt-0.5 text-sm text-slate-500">${step.desc}</p>
          <div class="thumb-slot mt-2"></div>
          ${isActive ? '<button class="btn-route btn-capture mt-3 !py-2.5 text-sm">Ambil Foto</button>' : ''}
          ${isDone ? '<p class="mt-2 text-xs font-medium text-brand-600">Selesai dikirim</p>' : ''}
        </div>
      </div>
    `);
    $track.append($step);
  });

  if (activeIndex === -1) {
    $('#workflow-note').text('Semua checkpoint sudah selesai untuk perjalanan ini.');
  }

  // Pakai event delegation di $track supaya tombol "Ambil Foto" yang muncul belakangan
  // (untuk step berikutnya) otomatis ke-handle tanpa perlu rebind manual.
  $track.on('click', '.btn-capture', async function () {
    const $btn = $(this);
    const $step = $btn.closest('.route-step');
    const stepKey = $step.data('key');
    setButtonLoading($btn, true, 'Membuka kamera...');

    try {
      const photoBlob = await takePhoto();
      const pos = await geo.getCurrentPosition().catch(() => null);

      setButtonLoading($btn, true, 'Mengunggah...');
      await api.uploadFile(`/driver/trip/${tripId}/photo`, photoBlob, 'photo', {
        type: stepKey,
        lat: pos ? pos.coords.latitude : '',
        lng: pos ? pos.coords.longitude : '',
      });

      // Tandai step ini selesai di UI
      const objUrl = URL.createObjectURL(photoBlob);
      $step.removeClass('active').addClass('done');
      $step.find('.route-marker').html('&#10003;');
      $step.find('.thumb-slot').html(`<img src="${objUrl}" class="mt-1 h-20 w-20 rounded-lg object-cover" />`);
      $btn.remove();
      $step.append('<p class="mt-2 text-xs font-medium text-brand-600">Selesai dikirim</p>');

      const nextStep = $step.next('.route-step');
      if (nextStep.length) {
        nextStep.addClass('active');
        nextStep.find('.route-marker').removeClass('border-slate-300 text-slate-400');
        nextStep.find('.thumb-slot').after('<button class="btn-route btn-capture mt-3 !py-2.5 text-sm">Ambil Foto</button>');
      } else {
        // Semua step selesai -> selesaikan trip di server
        await api.post(`/driver/trip/${tripId}/complete`, {});
        $('#workflow-note').text('Perjalanan selesai. Terima kasih!');
        setTimeout(() => navigate('/driver'), 1500);
      }
    } catch (err) {
      setButtonLoading($btn, false);
      alert('Gagal mengambil/mengunggah foto. Coba lagi.');
    }
  });
}
