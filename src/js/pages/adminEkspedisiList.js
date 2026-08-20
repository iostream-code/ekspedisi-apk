import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { renderModal } from '../components/modal.js';
import { pageLoaderHtml, emptyStateHtml, setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';

/**
 * Isi form modal Tambah/Edit perusahaan ekspedisi -- dipakai KEDUANYA (beda
 * cuma nilai awal & ada/tidaknya field "Status Aktif", yang cuma masuk akal
 * saat edit -- perusahaan baru selalu mulai aktif).
 */
function formHtml(eks) {
  return `
    <form id="ekspedisi-form" class="space-y-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Kode (opsional)</label>
        <input id="f-kode" type="text" value="${eks?.kode_ekspedisi || ''}" placeholder="Contoh: EXP-001"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Nama Perusahaan</label>
        <input id="f-nama" type="text" required value="${eks?.nama_ekspedisi || ''}" placeholder="Contoh: Ekspedisi Jaya"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">PIC (opsional)</label>
        <input id="f-pic" type="text" value="${eks?.pic || ''}"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">No. Telepon (opsional)</label>
        <input id="f-telp" type="tel" value="${eks?.no_telp || ''}"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Alamat (opsional)</label>
        <textarea id="f-alamat" rows="2"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100">${eks?.alamat || ''}</textarea>
      </div>
      ${eks ? `
        <label class="flex items-center gap-2 text-sm font-medium text-slate-600">
          <input id="f-aktif" type="checkbox" ${Number(eks.is_active) ? 'checked' : ''} class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          Aktif
        </label>
      ` : ''}
      <p id="f-error" class="hidden rounded-lg bg-status-alert/10 px-3 py-2 text-sm font-medium text-status-alert"></p>
      <button type="submit" id="f-submit" class="btn-route w-full">${eks ? 'Simpan Perubahan' : 'Tambah Perusahaan'}</button>
    </form>
  `;
}

function openForm(eks, onSaved) {
  const { $body } = renderModal({ title: eks ? 'Edit Perusahaan Ekspedisi' : 'Tambah Perusahaan Ekspedisi', bodyHtml: formHtml(eks) });

  $body.find('#ekspedisi-form').on('submit', function (e) {
    e.preventDefault();
    const $err = $body.find('#f-error').addClass('hidden');
    const $btn = $body.find('#f-submit');

    const nama = $body.find('#f-nama').val().trim();
    if (!nama) {
      $err.text('Nama perusahaan wajib diisi.').removeClass('hidden');
      return;
    }

    const body = {
      kode_ekspedisi: $body.find('#f-kode').val().trim() || undefined,
      nama_ekspedisi: nama,
      pic: $body.find('#f-pic').val().trim() || undefined,
      no_telp: $body.find('#f-telp').val().trim() || undefined,
      alamat: $body.find('#f-alamat').val().trim() || undefined,
      ...(eks ? { is_active: $body.find('#f-aktif').is(':checked') } : {}),
    };

    setButtonLoading($btn, true, 'Menyimpan...');
    const request = eks ? api.put(`/admin/ekspedisi/${eks.id}`, body) : api.post('/admin/ekspedisi', body);
    request
      .then(() => {
        onSaved();
      })
      .catch((xhr) => {
        $err.text(xhr?.responseJSON?.message || 'Gagal menyimpan. Coba lagi.').removeClass('hidden');
        setButtonLoading($btn, false);
      });
  });
}

/**
 * Layar kelola perusahaan ekspedisi eksternal (`ekspedisi_m_ekspedisi`,
 * MILIK app ini sendiri -- 2026-08-20, lihat README `ekspedisi-apk-backend`
 * bagian "Master perusahaan ekspedisi eksternal" utk alasan kenapa
 * independen dari `m_expedisi` backend-production). Drill-down dari tab
 * Ekspedisi ("Kelola Ekspedisi", di samping "+ Tambah Supir").
 */
export async function renderAdminEkspedisiList($container) {
  renderNavbar($container, 'Kelola Ekspedisi', { onBack: () => navigate('/admin/ekspedisi') });

  const $main = $(`<main class="flex-1 p-4"></main>`);
  $container.append($main);

  let showInactive = false;

  async function load() {
    $main.html(`<div class="card overflow-hidden">${pageLoaderHtml('Memuat data...')}</div>`);
    let list;
    try {
      list = await api.get(`/admin/ekspedisi${showInactive ? '?all=1' : ''}`);
    } catch (e) {
      $main.html('<p class="p-4 text-status-alert">Gagal memuat data.</p>');
      return;
    }
    render(list);
  }

  function render(list) {
    const $card = $(`<div class="card overflow-hidden"></div>`);
    $main.empty().append($card);

    const $bar = $(`
      <div class="flex items-center justify-between rounded-t-2xl bg-ink px-4 py-2.5">
        <p class="text-sm font-semibold text-white">Data | ${list.length}</p>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-1.5 text-xs text-white/70">
            <input id="chk-inactive" type="checkbox" ${showInactive ? 'checked' : ''} class="h-3.5 w-3.5 rounded border-white/30" />
            Tampilkan nonaktif
          </label>
          <button id="btn-add" title="Tambah" class="rounded p-0.5 text-white/70 transition hover:text-white">+</button>
        </div>
      </div>
    `);
    $bar.find('#chk-inactive').on('change', function () {
      showInactive = $(this).is(':checked');
      load();
    });
    $bar.find('#btn-add').on('click', () => openForm(null, () => { load(); }));
    $card.append($bar);

    if (!list.length) {
      $card.append(`<div class="p-2">${emptyStateHtml()}</div>`);
      return;
    }

    const $tableWrap = $(`<div class="scroll-area max-h-[65vh] overflow-auto"></div>`);
    const $table = $(`
      <table class="w-full text-sm">
        <thead class="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <tr>
            <th class="whitespace-nowrap px-3 py-2 text-center">Kode</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Nama</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">PIC</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">No Telp</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Status</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100"></tbody>
      </table>
    `);
    const $tbody = $table.find('tbody');

    list.forEach((eks) => {
      const $tr = $(`
        <tr>
          <td class="whitespace-nowrap px-3 py-2.5 text-slate-500">${eks.kode_ekspedisi || '-'}</td>
          <td class="whitespace-nowrap px-3 py-2.5 font-medium text-ink">${eks.nama_ekspedisi}</td>
          <td class="whitespace-nowrap px-3 py-2.5 text-slate-500">${eks.pic || '-'}</td>
          <td class="whitespace-nowrap px-3 py-2.5 text-slate-500">${eks.no_telp || '-'}</td>
          <td class="whitespace-nowrap px-3 py-2.5">
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Number(eks.is_active) ? 'bg-status-online/10 text-status-online' : 'bg-slate-100 text-slate-500'}">${Number(eks.is_active) ? 'Aktif' : 'Nonaktif'}</span>
          </td>
          <td class="whitespace-nowrap px-3 py-2.5 text-right">
            <button class="btn-edit btn-table-action">Edit</button>
          </td>
        </tr>
      `);
      $tr.find('.btn-edit').on('click', () => openForm(eks, () => { load(); }));
      $tbody.append($tr);
    });

    $tableWrap.append($table);
    $card.append($tableWrap);
  }

  await load();
}
