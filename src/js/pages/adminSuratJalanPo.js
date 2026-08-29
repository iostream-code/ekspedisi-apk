import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { renderAdminTabs } from '../components/adminTabs.js';
import { renderSjSubTabs } from '../components/sjSubTabs.js';
import { renderTableToolbar } from '../components/tableToolbar.js';
import { renderPagination } from '../components/pagination.js';
import { renderModal } from '../components/modal.js';
import { pageLoaderHtml, emptyStateHtml, setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { takePhoto } from '../camera.js';

/**
 * Kartu "PO Menunggu Siap Kirim" (2026-08-26, SUSULAN) -- APPROVED belum
 * READY, ditandai Admin di sini (GET /admin/sj-po/approved-po, POST
 * /admin/sj-po/po/{id}/ready). Dipindah dari produksi-apk (tombol "Siap
 * Kirim" yang dulu ada di popup detail PO Jakarta, SUDAH DICABUT dari sana,
 * commit terpisah) -- Admin/Pusat yang menentukan kapan barang siap
 * diambil/dikirim, bukan Jakarta yang menunggu barang datang. Begitu
 * ditandai READY, PO itu otomatis muncul di dropdown "Buat SJ Tarik"
 * (outstanding-po, lihat adminNewSuratJalanPo.js) -- TIDAK ADA link
 * langsung ke situ dari sini, admin cukup buka menu itu sendiri sesudahnya.
 *
 * **Tombol "Siap Kirim" wajib ambil foto (2026-08-29, susulan)** -- backend
 * `PoSuratJalan::markReady()` (backend-migrasi, port `PoReadinessController`
 * asli backend-production) MEWAJIBKAN foto (`pur_t_po_readiness.photo_path`
 * NOT NULL di skema aslinya) -- bukan basa-basi, itu bukti fisik barang
 * benar-benar sudah dicek siap sebelum ditandai READY. Dulu tombol ini
 * langsung `api.post(...)` body kosong (endpoint backend-nya belum ada sama
 * sekali saat itu) -- sekarang `takePhoto()` dulu (pola SAMA PERSIS dgn
 * tombol Validasi/Serah Terima di `adminSuratJalan.js`) baru `uploadFile`.
 * `items`/qty per lini TIDAK diminta dari sini (beda dari alur Jakarta
 * aslinya yg py input per-lini) -- backend otomatis isi `qty_ready` = SISA
 * outstanding tiap lini PO ini, sesuai sifat kartu ini yang 1 tombol polos
 * "semua beres", lihat docblock `PoSuratJalan::markReady()`.
 */
async function renderApprovedPoCard($container, onReady) {
  let approved = [];
  try {
    approved = await api.get('/admin/sj-po/approved-po');
  } catch (e) {
    return; // gagal diam-diam -- kartu ini cuma nice-to-have, tidak boleh gagalin seluruh halaman
  }
  if (!approved.length) return;

  const $card = $(`
    <div class="card mb-3 space-y-2 p-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">PO Menunggu Siap Kirim (${approved.length})</p>
      <div data-approved-rows class="space-y-2"></div>
    </div>
  `);
  const $rows = $card.find('[data-approved-rows]');

  approved.forEach((po) => {
    const $row = $(`
      <div class="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5">
        <div class="flex-1 min-w-0">
          <p class="truncate text-sm font-medium text-ink">${po.po_number}</p>
          <p class="truncate text-xs text-slate-400">${po.supplier_name} &middot; ${po.items.length} item</p>
        </div>
        <button class="btn-ghost shrink-0 !py-2 px-3 text-xs">Siap Kirim</button>
      </div>
    `);
    $row.find('button').on('click', async function () {
      const $btn = $(this);
      let blob;
      try {
        blob = await takePhoto();
      } catch (e) {
        return; // batal ambil foto
      }
      setButtonLoading($btn, true, '...');
      try {
        await api.uploadFile(`/admin/sj-po/po/${po.po_id}/ready`, blob, 'photo');
        onReady();
      } catch (xhr) {
        alert(xhr?.responseJSON?.message || 'Gagal menandai Siap Kirim.');
        setButtonLoading($btn, false);
      }
    });
    $rows.append($row);
  });

  $container.append($card);
}

const STATUS_LABEL = { DRAFT: 'Draft', SENT: 'Dikirim', PARTIAL_RECEIVED: 'Sebagian Diterima', RECEIVED: 'Diterima', CANCELLED: 'Dibatalkan' };
const STATUS_CLASS = {
  DRAFT: 'bg-yellow-50 text-yellow-700',
  SENT: 'bg-status-online/10 text-status-online',
  PARTIAL_RECEIVED: 'bg-blue-50 text-blue-700',
  RECEIVED: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-status-alert/10 text-status-alert',
};

function formatTanggal(value) {
  return value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
}

function detailBodyHtml(sj) {
  const items = sj.items || [];
  const itemRows = items.map((it) => `
    <tr class="border-t border-slate-100 text-sm">
      <td class="py-1.5 pr-2 text-slate-700">${it.material_name || '-'}<span class="text-xs text-slate-400"> ${it.unit_code || ''}</span></td>
      <td class="py-1.5 text-right font-medium text-ink">${it.qty}</td>
    </tr>
  `).join('');

  return `
    <dl class="space-y-4 text-sm">
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Ringkasan</dt>
        <dd class="mt-1 text-slate-700">
          <p class="font-medium text-ink">${sj.sj_number || '-'}</p>
          <p class="mt-0.5 text-xs text-slate-400">Supplier: ${sj.supplier_name || '-'}</p>
        </dd>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Supir</dt>
          <dd class="mt-1 text-slate-700">${sj.transporter_name || '-'}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Kendaraan</dt>
          <dd class="mt-1 text-slate-700">${sj.vehicle_number || '-'}</dd>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Dikirim</dt>
          <dd class="mt-1 text-slate-700">${formatTanggal(sj.sent_at) || '-'}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Dibuat</dt>
          <dd class="mt-1 text-slate-700">${formatTanggal(sj.sj_date) || '-'}</dd>
        </div>
      </div>
      ${sj.notes ? `
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Catatan</dt>
        <dd class="mt-1 text-slate-700">${sj.notes}</dd>
      </div>` : ''}
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt>
        <dd class="mt-1"><span class="rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[sj.status] || 'bg-slate-100 text-slate-600'}">${STATUS_LABEL[sj.status] || sj.status}</span></dd>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Item</dt>
        <dd class="mt-1">
          <table class="w-full text-sm">
            <tbody>${itemRows || '<tr><td class="py-2 text-slate-400">Tidak ada item.</td></tr>'}</tbody>
          </table>
        </dd>
      </div>
      ${sj.status === 'DRAFT' ? '<div data-confirm-slot></div>' : ''}
    </dl>
  `;
}

/**
 * Submenu "PO" di tab SJ (2026-08-26) -- SJ Tarik utk Purchase Order,
 * pur_t_surat_jalan (skema MILIK modul Purchase backend-production, baca/
 * tulis LANGSUNG dari sini via PoSuratJalanController di backend-migrasi --
 * lihat docblock controller itu utk alasan lengkap kenapa fitur ini ada).
 *
 * **Diseragamkan dgn submenu "Customer" (2026-08-29, susulan)** -- semula
 * MVP tanpa filter tahun/kolom Aksi/pagination & masih py kolom Status di
 * tabel, beda tampilan dari "Customer" padahal 2 sub-tab yang sama-sama di
 * bawah tab SJ. Backend (`GET /admin/sj-po`) TETAP balikin array polos
 * (LIMIT 200, tanpa page/per_page/total kayak `SuratJalan::list()`) --
 * bukan tidak sengaja dilewat, cuma volume SJ PO masih jauh dari 200 (lihat
 * histori chat), jadi filter tahun/pencarian/pagination di bawah ini SEMUA
 * client-side atas `allRows` yang sudah kepanggil sekali per toggle Aktif/
 * Riwayat -- TIDAK ada request baru ke server tiap ganti halaman/tahun/kata
 * kunci pencarian, beda dari "Customer" yang semuanya round-trip ke server
 * (volume 1000+ baris di sana, tidak muat direct di memori kayak di sini).
 * Kalau nanti volumenya sudah besar, upgrade ke server-side pagination sama
 * pola dgn "Customer" (2026-08-20).
 *
 * **Kolom Status DICOPOT dari tabel** (ikut alasan yang sama persis dgn
 * "Customer" 2026-08-23: mode Aktif/Riwayat sendiri sudah membedakan
 * kelompok status besarnya, badge Status detailnya tetap ada di modal
 * Detail lewat detailBodyHtml() -- lihat sana). **Kolom Aksi ditambah** --
 * tombol "Konfirmasi Kirim" inline utk baris `status='DRAFT'` (dulu cuma
 * ada di dalam modal, harus dobel klik dulu) -- pola SAMA PERSIS dgn tombol
 * Validasi "Customer" (stopPropagation, mutate row di closure, tidak ada
 * refetch). Modal Detail (dobel klik) TETAP ada & TETAP punya tombol
 * "Konfirmasi Kirim"-nya sendiri (data lengkap termasuk breakdown item cuma
 * ada di sana) -- tombol baris ini cuma jalan pintas.
 *
 * Mode Aktif = status DRAFT/SENT (belum dikonfirmasi Jakarta), Riwayat =
 * RECEIVED/CANCELLED. PARTIAL_RECEIVED (dari confirm-jakarta produksi-apk
 * SEBELUM full-received) tetap masuk Aktif -- masih ada sisa yang jadi
 * urusan Ekspedisi kalau mau dikirim susulan.
 */
export async function renderAdminSuratJalanPo($container) {
  renderNavbar($container, 'Ekspedisi');
  renderAdminTabs($container, 'sj');
  renderSjSubTabs($container, 'po');

  const $main = $(`<main class="flex-1 space-y-3 p-4"></main>`);
  $container.append($main);

  const $readySection = $(`<div></div>`);
  $main.append($readySection);
  function loadApprovedCard() {
    $readySection.empty();
    renderApprovedPoCard($readySection, loadApprovedCard);
  }
  loadApprovedCard();

  const $tableSection = $(`<div></div>`);
  $main.append($tableSection);

  let historyMode = false;
  let query = '';
  const currentYear = new Date().getFullYear();
  let tahun = String(currentYear);
  let page = 1;
  const perPage = 20;
  let allRows = [];

  async function load() {
    $tableSection.html(`<div class="card overflow-hidden">${pageLoaderHtml('Memuat data...')}</div>`);

    const statusFilter = historyMode ? 'RECEIVED,CANCELLED' : 'DRAFT,SENT,PARTIAL_RECEIVED';
    try {
      allRows = await api.get(`/admin/sj-po?${new URLSearchParams({ status: statusFilter })}`);
    } catch (e) {
      $tableSection.html('<p class="p-4 text-status-alert">Gagal memuat data.</p>');
      return;
    }
    render();
  }

  // Tanggal acuan tahun = sent_at (kalau sudah SENT/RECEIVED) fallback sj_date
  // (masih DRAFT) -- sama polanya dgn "Customer" (tgl_kirim fallback created_at).
  function tahunOf(sj) {
    const raw = sj.sent_at || sj.sj_date;
    return raw ? String(new Date(raw).getFullYear()) : null;
  }

  function filtered() {
    const q = query.trim().toLowerCase();
    return allRows.filter((sj) => {
      if (tahunOf(sj) !== tahun) return false;
      if (!q) return true;
      return (sj.sj_number || '').toLowerCase().includes(q) || (sj.supplier_name || '').toLowerCase().includes(q);
    });
  }

  function render() {
    const $card = $(`<div class="card overflow-hidden"></div>`);
    $tableSection.empty().append($card);

    const matched = filtered();
    // Tahun yang BENERAN ada di allRows (bucket Aktif/Riwayat yang lagi
    // ditampilkan) -- bukan dari server terpisah kayak "Customer" krn semua
    // baris memang sudah di memori (lihat docblock render fungsi ini).
    // Tahun berjalan tetap SELALU ada di opsi (sama alasan dgn "Customer" --
    // supaya default-nya tidak pernah "hilang" dari dropdown).
    let years = [...new Set(allRows.map(tahunOf).filter(Boolean))].sort((a, b) => b - a);
    if (!years.includes(String(currentYear))) years = [currentYear, ...years].sort((a, b) => b - a);

    renderTableToolbar($card, {
      count: matched.length,
      historyActive: historyMode,
      onRefresh: load,
      onToggleHistory: () => { historyMode = !historyMode; page = 1; load(); },
      addLabel: '+ Buat SJ Tarik',
      onAdd: () => navigate('/admin/sj/po/new'),
      searchValue: query,
      onSearch: (val) => { query = val; page = 1; render(); },
      yearOptions: years,
      yearValue: tahun,
      onYearChange: (val) => { tahun = val; page = 1; render(); },
    });

    if (!matched.length) {
      $card.append(`<div class="p-2">${emptyStateHtml()}</div>`);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(matched.length / perPage));
    if (page > totalPages) page = totalPages;
    const list = matched.slice((page - 1) * perPage, page * perPage);

    // Aksi cuma relevan di mode Aktif (sama pola dgn "Customer") -- dicopot
    // SELURUHNYA (bukan cuma dikosongkan) di mode Riwayat.
    const showAksi = !historyMode;
    const $tableWrap = $(`<div class="scroll-area max-h-[65vh] overflow-auto"></div>`);
    const $table = $(`
      <table class="w-full text-sm tbl-bordered">
        <thead class="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <tr>
            <th class="whitespace-nowrap px-3 py-2 text-center">No SJ</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Supplier</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Supir / Kendaraan</th>
            ${showAksi ? '<th class="whitespace-nowrap px-3 py-2 text-center">Aksi</th>' : ''}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100"></tbody>
      </table>
    `);
    const $tbody = $table.find('tbody');

    list.forEach((sj) => {
      const $tr = $(`
        <tr class="cursor-pointer hover:bg-slate-50" title="Dobel klik untuk lihat detail">
          <td class="whitespace-nowrap px-3 py-2.5 align-top font-medium text-ink">${sj.sj_number || '-'}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-slate-600">${sj.supplier_name || '-'}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-slate-500">${sj.transporter_name || '-'}${sj.vehicle_number ? ' &middot; ' + sj.vehicle_number : ''}</td>
          ${showAksi ? '<td class="whitespace-nowrap px-3 py-2.5 align-top"><div class="flex gap-1.5" data-aksi></div></td>' : ''}
        </tr>
      `);

      $tr.on('dblclick', () => openDetail(sj.id));

      if (showAksi && sj.status === 'DRAFT') {
        const $btn = $(`<button class="btn-table-action">Konfirmasi Kirim</button>`);
        $btn.on('click', async (e) => {
          e.stopPropagation();
          setButtonLoading($btn, true, '');
          try {
            await api.post(`/admin/sj-po/${sj.id}/confirm`, {});
            sj.status = 'SENT';
            render();
          } catch (xhr) {
            alert(xhr?.responseJSON?.message || 'Gagal konfirmasi kirim.');
            setButtonLoading($btn, false);
          }
        });
        $tr.find('[data-aksi]').append($btn);
      }

      $tbody.append($tr);
    });

    $tableWrap.append($table);
    $card.append($tableWrap);

    renderPagination($card, {
      page,
      perPage,
      total: matched.length,
      onPageChange: (p) => { page = p; render(); },
    });
  }

  async function openDetail(id) {
    let sj;
    try {
      sj = await api.get(`/admin/sj-po/${id}`);
    } catch (e) {
      alert('Gagal memuat detail SJ.');
      return;
    }

    const { close, $body } = renderModal({ title: 'Detail SJ Tarik', bodyHtml: detailBodyHtml(sj) });

    if (sj.status === 'DRAFT') {
      const $slot = $body.find('[data-confirm-slot]');
      const $btn = $(`<button class="btn-route w-full">Konfirmasi Kirim</button>`);
      $btn.on('click', async () => {
        setButtonLoading($btn, true, 'Memproses...');
        try {
          await api.post(`/admin/sj-po/${id}/confirm`, {});
          close();
          load();
        } catch (xhr) {
          alert(xhr?.responseJSON?.message || 'Gagal konfirmasi kirim.');
          setButtonLoading($btn, false);
        }
      });
      $slot.append($btn);
    }
  }

  await load();
}
