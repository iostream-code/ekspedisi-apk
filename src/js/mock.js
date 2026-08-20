import $ from 'jquery';

// Semua data di sini cuma hidup di memori browser (hilang kalau refresh).
// Tujuannya: supaya alur lengkap (login -> dashboard -> checkpoint -> admin map) bisa
// didemokan tanpa backend nyala. Path & bentuk response sengaja dibuat SAMA PERSIS
// dengan kontrak API asli di ../driver-apk-backend, supaya gampang dicabut nanti
// (tinggal set MOCK_MODE: false di config.js).

const PLACEHOLDER_PHOTO = 'https://placehold.co/200x200/16A34A/FFFFFF?text=Foto';

// Titik-titik dummy di sekitar Sidoarjo, Jawa Timur
const BASE_LAT = -7.4478;
const BASE_LNG = 112.7183;
function jitter(base) { return base + (Math.random() - 0.5) * 0.08; }

const STEP_LABELS = { berangkat: 'Foto Berangkat', serah_terima: 'Serah Terima Barang', sj: 'Foto SJ' };
const STEPS = ['berangkat', 'serah_terima', 'sj'];

// id supir yang dianggap "sedang login" saat demo (dipakai endpoint /driver/*)
const CURRENT_DRIVER_ID = 1;

const store = {
  nextTripId: 100,
  trips: {}, // id -> { id, driver_id, destination, status, completed_steps }
  nextDriverId: 6,
  drivers: [
    { id: 1, tipe: 'internal', name: 'Budi Santoso', status: 'online', lat: jitter(BASE_LAT), lng: jitter(BASE_LNG) },
    { id: 2, tipe: 'internal', name: 'Agus Wijaya', status: 'resting', lat: jitter(BASE_LAT), lng: jitter(BASE_LNG) },
    { id: 3, tipe: 'internal', name: 'Rudi Hartono', status: 'offline', lat: jitter(BASE_LAT), lng: jitter(BASE_LNG) },
    { id: 4, tipe: 'internal', name: 'Slamet Riyadi', status: 'online', lat: jitter(BASE_LAT), lng: jitter(BASE_LNG) },
    { id: 5, tipe: 'eksternal', name: 'Herman (Ekspedisi Jaya)', status: 'offline', lat: null, lng: null },
  ],
  nextSjId: 2,
  // Modul surat jalan MILIK app ini sendiri (ekspedisi_t_surat_jalan) -- lihat
  // App\Support\SuratJalan di driver-apk-backend, bentuk field sama persis.
  suratJalan: [
    {
      id: 1, no_surat_jalan: 'SJ-20260819-0001', trip_id: 101, penjualan_id: null,
      driver_id: 1, nama_supir: 'Budi Santoso', tujuan: 'Gudang Sidoarjo -> Toko Makmur Jaya',
      kendaraan: null, plat: null, penerima: null, jumlah_kirim: null, tgl_kirim: null,
      foto_surat_jalan: null, foto_validasi: null, divalidasi_oleh: null, divalidasi_at: null,
      nama_validator: null, items: [], catatan: null, status: 'draft', asal: 'native',
      created_at: new Date().toISOString(),
    },
    // Contoh baris hasil migrate_legacy_surat_jalan.php (ekspedisi-apk-backend)
    // -- driver_id NULL (pengirim lama cuma teks bebas), foto URL ABSOLUT ke
    // host lama (bukan disalin fisik), badge "Data Lama" muncul di list.
    {
      id: 2, no_surat_jalan: 'SJ_000499', trip_id: null, penjualan_id: null,
      driver_id: null, nama_supir: null, tujuan: null,
      kendaraan: 'Grandmax', plat: 'P 9012 XY', penerima: null, jumlah_kirim: 12, tgl_kirim: '2024-03-11',
      foto_surat_jalan: 'https://indokoper.com/foto_surat_jalan/foto_surat_jalan_1643341150.jpeg',
      foto_validasi: null, divalidasi_oleh: null, divalidasi_at: null, nama_validator: null,
      items: [], catatan: 'Dimigrasi dari surat_jalan lama (backend-production) -- pengirim (data lama): Yoyo (diambil)',
      status: 'terkirim', asal: 'migrasi_legacy', created_at: '2024-03-11T08:00:00.000Z',
    },
  ],
};

// Dummy daftar ekspedisi buat demo GET /admin/ekspedisi (lihat ExpedisiLookup
// di driver-apk-backend -- bentuk field sama persis).
const DUMMY_EKSPEDISI = [
  { id_expedisi: 10, kode_expedisi: 'EXP-20260418-7620', nama_expedisi: 'Ekspedisi Jaya', pic: 'Supriyadi', no_telp: '08123456789' },
];

// Seed 2 perjalanan aktif buat driver id=1, biar waktu demo dashboard supir langsung
// kelihatan mendukung lebih dari 1 perjalanan aktif.
function seedTrip(driverId, destination, noSuratJalan = null, penjualanId = null) {
  const trip = {
    id: store.nextTripId++,
    driver_id: driverId,
    destination,
    no_surat_jalan: noSuratJalan,
    penjualan_id: penjualanId,
    status: 'in_progress',
    completed_steps: [],
  };
  store.trips[trip.id] = trip;
  return trip;
}
seedTrip(1, 'Gudang Sidoarjo -> Toko Makmur Jaya', 'SJ_000811');
seedTrip(1, 'Gudang Sidoarjo -> Toko Sumber Rejeki');
// Supir eksternal (id 5) tidak bisa checkpoint foto -- dipakai buat demo tombol "Tandai Selesai".
seedTrip(5, 'Gudang Sidoarjo -> Gudang Ekspedisi Jaya Surabaya');

// Dummy data SJ buat demo lookup GET /admin/surat-jalan/:no (lihat SuratJalanLookup
// di driver-apk-backend -- bentuk field SAMA PERSIS dengan response asli).
const DUMMY_SURAT_JALAN = {
  SJ_000811: { no_surat_jalan: 'SJ_000811', kendaraan: 'Grandmax', plat: 'P 9659 GC', pengirim: 'Zamzam sopir', client_nama: 'Toko Makmur Jaya', client_alamat: 'Jl. Contoh No. 1, Sidoarjo' },
};

// Dummy data SPK siap kirim buat demo GET /admin/spk-ready-kirim (lihat
// App\Support\SpkReadyKirim di driver-apk-backend -- bentuk field sama persis).
// Baris yang sudah diplot (ada di store.trips) SENGAJA tidak dikeluarkan di
// sini secara otomatis kayak query aslinya -- daftar ini statis, dianggap
// selalu "belum diplot" tiap reload demo.
const DUMMY_SPK_READY_KIRIM = [
  { penjualan_id: 'INV_01701-5', no_spk: '01701', client_nama: 'DGI', kota_asal: 'Pusat', kota_tujuan: 'KOTA JAKARTA TIMUR', penjualan_tanggal_kirim: '2026-08-25' },
  { penjualan_id: 'INV_01806-1', no_spk: '01806', client_nama: 'Alisha Rafina', kota_asal: 'Pusat', kota_tujuan: 'KOTA DENPASAR', penjualan_tanggal_kirim: '2026-08-27' },
];

// Dummy lini produk per SPK buat demo GET /admin/sj/spk/:id/items (lihat
// App\Support\PenjualanItemLookup di driver-apk-backend -- bentuk field sama
// persis). `sisa` berkurang tiap kali SJ dibuat dengan items menyentuh lini
// ini (lihat handler POST /admin/sj di bawah), supaya validasi sisa qty
// kelihatan nyata waktu demo.
const DUMMY_PENJUALAN_ITEMS = {
  'INV_01701-5': [
    { penjualan_detail_performa_id: 501, penjualan_jenis: 'Koper Cabin 20"', penjualan_qty: 50, terkirim: 10, sisa: 40 },
    { penjualan_detail_performa_id: 502, penjualan_jenis: 'Koper Medium 24"', penjualan_qty: 30, terkirim: 0, sisa: 30 },
  ],
  'INV_01806-1': [
    { penjualan_detail_performa_id: 503, penjualan_jenis: 'Tas Ransel', penjualan_qty: 20, terkirim: 20, sisa: 0 },
  ],
};

// Cari 1 lini produk by id, TERLEPAS dari SPK mana asalnya -- meniru
// PenjualanItemLookup::findLine() di driver-apk-backend (dipakai POST
// /admin/sj krn 1 SJ sekarang boleh berisi lini produk dari beberapa SPK).
function findDummyLine(penjualanDetailPerformaId) {
  for (const [spkId, lines] of Object.entries(DUMMY_PENJUALAN_ITEMS)) {
    const line = lines.find((l) => l.penjualan_detail_performa_id === penjualanDetailPerformaId);
    if (line) return { spkId, line };
  }
  return null;
}

function nextStepLabel(trip) {
  const next = STEPS.find((s) => !trip.completed_steps.includes(s));
  return next ? STEP_LABELS[next] : 'Selesai';
}

function formatTrip(trip) {
  return {
    id: trip.id,
    destination: trip.destination,
    no_surat_jalan: trip.no_surat_jalan || null,
    penjualan_id: trip.penjualan_id || null,
    status: trip.status,
    completed_steps: trip.completed_steps,
    current_step_label: nextStepLabel(trip),
  };
}

function tripsForDriver(driverId, status = null) {
  return Object.values(store.trips).filter((t) => t.driver_id === driverId && (!status || t.status === status));
}

function delay(value, ms = 350) {
  // simulasi latency network dikit biar spinner/loading state kelihatan waktu demo,
  // dibungkus $.Deferred supaya interface-nya sama persis dengan jqXHR asli (.then/.catch/.fail/.always)
  const deferred = $.Deferred();
  setTimeout(() => deferred.resolve(value), ms);
  return deferred.promise();
}

export function mockLogin(username) {
  const isAdmin = username.trim().toLowerCase().includes('admin');
  // Bentuk response SAMA PERSIS dengan POST /login di driver-apk-backend
  // (lihat driver-apk-backend/app/Http/Controllers/API/AuthController.php).
  return delay({
    token: 'dummy-token-' + Date.now(),
    role: isAdmin ? 'admin' : 'driver',
    user: {
      id: isAdmin ? 999 : CURRENT_DRIVER_ID,
      name: isAdmin ? 'Admin Dispatcher' : 'Budi Santoso',
    },
  });
}

export function mockRequest(rawPath, method, data) {
  // Beberapa endpoint (GET /admin/sj, /admin/spk-belum-sj) sekarang dipanggil
  // dgn query string (?q=&page=&per_page=&status=) -- pisahkan dulu supaya
  // matching `path === '/admin/sj'` di bawah tetap jalan, `query` dipakai
  // handler yang butuh.
  const [path, queryString] = rawPath.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryString || ''));

  // GET /driver/me
  if (method === 'GET' && path === '/driver/me') {
    const activeTrips = tripsForDriver(CURRENT_DRIVER_ID, 'in_progress').map(formatTrip);
    const driver = store.drivers.find((d) => d.id === CURRENT_DRIVER_ID);
    return delay({ id: driver.id, name: driver.name, status: driver.status, active_trips: activeTrips });
  }

  // POST /driver/status
  if (method === 'POST' && path === '/driver/status') {
    const driver = store.drivers.find((d) => d.id === CURRENT_DRIVER_ID);
    driver.status = data.status;
    return delay({ status: driver.status });
  }

  // POST /driver/location
  if (method === 'POST' && path === '/driver/location') {
    return delay({ ok: true });
  }

  // GET /driver/trip/:id
  let m = path.match(/^\/driver\/trip\/(\d+)$/);
  if (method === 'GET' && m) {
    const trip = store.trips[m[1]];
    return delay(formatTrip(trip));
  }

  // POST /driver/trip/:id/photo
  m = path.match(/^\/driver\/trip\/(\d+)\/photo$/);
  if (method === 'POST' && m) {
    const trip = store.trips[m[1]];
    const type = data.get ? data.get('type') : data.type; // FormData atau object biasa
    if (trip && !trip.completed_steps.includes(type)) trip.completed_steps.push(type);

    // Checkpoint "sj" upsert ke modul surat jalan sendiri (sama seperti
    // SuratJalan::upsertFromTripPhoto() di driver-apk-backend).
    if (trip && type === 'sj') {
      let sj = store.suratJalan.find((s) => s.trip_id === trip.id);
      if (!sj) {
        sj = {
          id: store.nextSjId++,
          trip_id: trip.id,
          penjualan_id: trip.penjualan_id || null,
          driver_id: trip.driver_id,
          nama_supir: (store.drivers.find((d) => d.id === trip.driver_id) || {}).name || null,
          tujuan: trip.destination || null,
          kendaraan: null,
          plat: null,
          penerima: null,
          jumlah_kirim: null,
          tgl_kirim: null,
          foto_validasi: null,
          divalidasi_oleh: null,
          divalidasi_at: null,
          nama_validator: null,
          items: [],
          catatan: null,
          asal: 'native',
          created_at: new Date().toISOString(),
        };
        sj.no_surat_jalan = `SJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(sj.id).padStart(4, '0')}`;
        store.suratJalan.push(sj);
      }
      sj.foto_surat_jalan = null; // mock: tidak simpan blob foto sungguhan, cukup tandai terkirim
      // Checkpoint lapangan tidak boleh menurunkan status yang sudah tervalidasi.
      if (sj.status !== 'tervalidasi') sj.status = 'terkirim';
    }

    return delay({ ok: true, completed_steps: trip.completed_steps });
  }

  // POST /driver/trip/:id/complete
  m = path.match(/^\/driver\/trip\/(\d+)\/complete$/);
  if (method === 'POST' && m) {
    const trip = store.trips[m[1]];
    trip.status = 'completed';
    return delay(formatTrip(trip));
  }

  // POST /admin/trips/:id/complete -> admin tandai manual (supir eksternal, tidak bisa checkpoint sendiri)
  m = path.match(/^\/admin\/trips\/(\d+)\/complete$/);
  if (method === 'POST' && m) {
    const trip = store.trips[m[1]];
    const driver = trip ? store.drivers.find((d) => d.id === trip.driver_id) : null;
    const deferred = $.Deferred();
    setTimeout(() => {
      if (!trip) { deferred.reject({ responseJSON: { message: 'Perjalanan tidak ditemukan.' } }); return; }
      if (!driver || driver.tipe !== 'eksternal') { deferred.reject({ responseJSON: { message: 'Supir internal wajib menyelesaikan checkpoint foto lewat app, tidak bisa ditandai selesai manual dari admin.' } }); return; }
      if (trip.status === 'completed') { deferred.reject({ responseJSON: { message: 'Perjalanan ini sudah selesai.' } }); return; }
      trip.status = 'completed';
      deferred.resolve(formatTrip(trip));
    }, 350);
    return deferred.promise();
  }

  // GET /admin/drivers
  if (method === 'GET' && path === '/admin/drivers') {
    return delay(store.drivers.map((d) => {
      const active = tripsForDriver(d.id, 'in_progress');
      let stepLabel = null;
      if (active.length === 1) stepLabel = nextStepLabel(active[0]);
      else if (active.length > 1) stepLabel = `${active.length} perjalanan aktif`;
      return { ...d, current_step_label: stepLabel };
    }));
  }

  // POST /admin/drivers -> ADMIN tambah supir baru, internal (by username) atau eksternal
  if (method === 'POST' && path === '/admin/drivers') {
    const tipe = data.tipe === 'eksternal' ? 'eksternal' : 'internal';
    const newDriver = {
      id: store.nextDriverId++,
      tipe,
      name: tipe === 'eksternal' ? data.nama : data.username,
      status: 'offline',
      lat: tipe === 'internal' ? jitter(BASE_LAT) : null,
      lng: tipe === 'internal' ? jitter(BASE_LNG) : null,
    };
    store.drivers.push(newDriver);
    return delay({ id: newDriver.id, name: newDriver.name, status: newDriver.status, tipe }, 400);
  }

  // GET /admin/ekspedisi -> daftar perusahaan ekspedisi aktif
  if (method === 'GET' && path === '/admin/ekspedisi') {
    return delay(DUMMY_EKSPEDISI, 200);
  }

  // GET /admin/sj -> daftar surat jalan (modul milik app ini sendiri), query opsional q/status/page/per_page
  if (method === 'GET' && path === '/admin/sj') {
    let list = [...store.suratJalan].sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id);
    if (query.status) list = list.filter((sj) => sj.status === query.status);
    if (query.q) {
      const q = query.q.toLowerCase();
      list = list.filter((sj) => [sj.no_surat_jalan, sj.tujuan, sj.penerima, sj.nama_supir, ...(sj.items || []).map((it) => it.penjualan_id)]
        .some((v) => String(v || '').toLowerCase().includes(q)));
    }
    const page = Number(query.page) || 1;
    const perPage = Number(query.per_page) || 20;
    const start = (page - 1) * perPage;
    return delay({ data: list.slice(start, start + perPage), total: list.length, page, per_page: perPage }, 300);
  }

  // GET /admin/sj/spk/:penjualan_id/items -> lini produk 1 SPK + sisa qty (lihat PenjualanItemLookup)
  m = path.match(/^\/admin\/sj\/spk\/([^/]+)\/items$/);
  if (method === 'GET' && m) {
    const lines = DUMMY_PENJUALAN_ITEMS[decodeURIComponent(m[1])];
    const deferred = $.Deferred();
    setTimeout(() => {
      if (lines) deferred.resolve(lines.map((l) => ({ ...l })));
      else deferred.reject({ responseJSON: { message: 'SPK/penjualan_id tidak ditemukan, cek lagi penulisannya.' } });
    }, 300);
    return deferred.promise();
  }

  // POST /admin/sj -> bikin surat jalan manual dari admin -- driver_id WAJIB,
  // items opsional (breakdown per lini produk, BOLEH lintas beberapa SPK sekaligus)
  if (method === 'POST' && path === '/admin/sj') {
    const deferredStore = $.Deferred();
    setTimeout(() => {
      if (!data.driver_id) { deferredStore.reject({ responseJSON: { message: 'Supir wajib dipilih.' } }); return; }
      const driver = store.drivers.find((d) => d.id === Number(data.driver_id));
      if (!driver) { deferredStore.reject({ responseJSON: { message: 'Supir tidak ditemukan.' } }); return; }

      const items = (data.items || []).map((it) => {
        const found = findDummyLine(Number(it.penjualan_detail_performa_id));
        if (found) {
          // Kurangi sisa dummy supaya validasi kelihatan nyata kalau dicek lagi/dikirim lagi.
          found.line.terkirim += Number(it.jumlah_kirim);
          found.line.sisa = Math.max(0, found.line.penjualan_qty - found.line.terkirim);
        }
        return {
          id: Math.random(),
          penjualan_detail_performa_id: Number(it.penjualan_detail_performa_id),
          jumlah_kirim: Number(it.jumlah_kirim),
          penjualan_jenis: found ? found.line.penjualan_jenis : null,
          penjualan_id: found ? found.spkId : null,
        };
      });
      const jumlahKirim = items.length ? items.reduce((sum, it) => sum + it.jumlah_kirim, 0) : (data.jumlah_kirim ? Number(data.jumlah_kirim) : null);

      const sj = {
        id: store.nextSjId++,
        trip_id: null,
        penjualan_id: null,
        driver_id: driver.id,
        nama_supir: driver.name,
        tujuan: data.tujuan || null,
        kendaraan: data.kendaraan || null,
        plat: data.plat || null,
        penerima: data.penerima || null,
        jumlah_kirim: jumlahKirim,
        tgl_kirim: data.tgl_kirim || null,
        items,
        foto_surat_jalan: null,
        foto_validasi: null,
        divalidasi_oleh: null,
        divalidasi_at: null,
        nama_validator: null,
        catatan: data.catatan || null,
        status: 'draft',
        asal: 'native',
        created_at: new Date().toISOString(),
      };
      sj.no_surat_jalan = `SJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(sj.id).padStart(4, '0')}`;
      store.suratJalan.push(sj);
      deferredStore.resolve(sj);
    }, 400);
    return deferredStore.promise();
  }

  // POST /admin/sj/:id/photo -> lampirkan foto ke SJ (mis. dari form manual admin)
  m = path.match(/^\/admin\/sj\/(\d+)\/photo$/);
  if (method === 'POST' && m) {
    const sj = store.suratJalan.find((s) => s.id === Number(m[1]));
    if (sj) {
      sj.foto_surat_jalan = null; // mock: tidak simpan blob foto sungguhan, cukup tandai terkirim
      if (sj.status !== 'tervalidasi') sj.status = 'terkirim';
    }
    return delay(sj, 400);
  }

  // POST /admin/sj/:id/validasi -> admin upload foto SJ final bertandatangan, tutup alur validasi
  m = path.match(/^\/admin\/sj\/(\d+)\/validasi$/);
  if (method === 'POST' && m) {
    const sj = store.suratJalan.find((s) => s.id === Number(m[1]));
    const deferred = $.Deferred();
    setTimeout(() => {
      if (!sj) { deferred.reject({ responseJSON: { message: 'Surat jalan tidak ditemukan.' } }); return; }
      if (sj.status === 'tervalidasi') { deferred.reject({ responseJSON: { message: 'Surat jalan ini sudah tervalidasi.' } }); return; }
      sj.foto_validasi = null; // mock: tidak simpan blob foto sungguhan
      sj.status = 'tervalidasi';
      sj.nama_validator = 'Admin Dispatcher';
      sj.divalidasi_at = new Date().toISOString();
      deferred.resolve(sj);
    }, 400);
    return deferred.promise();
  }

  // GET /admin/drivers/:id
  m = path.match(/^\/admin\/drivers\/(\d+)$/);
  if (method === 'GET' && m) {
    const driverId = Number(m[1]);
    const driver = store.drivers.find((d) => d.id === driverId);
    const trips = tripsForDriver(driverId).map((t) => ({
      id: t.id,
      destination: t.destination,
      status_label: t.status === 'completed' ? 'Selesai' : 'Sedang Berjalan',
      created_at: new Date().toLocaleString('id-ID'),
      photos: t.completed_steps.map((type) => ({ type, url: PLACEHOLDER_PHOTO })),
    }));
    return delay({ id: driver.id, tipe: driver.tipe, name: driver.name, phone: '08123456789', status: driver.status, trips });
  }

  // POST /admin/drivers/:id/trip  -> ADMIN bikin perjalanan baru untuk supir tsb
  m = path.match(/^\/admin\/drivers\/(\d+)\/trip$/);
  if (method === 'POST' && m) {
    const trip = seedTrip(Number(m[1]), data.destination || 'Perjalanan tanpa tujuan', data.no_surat_jalan || null, data.penjualan_id || null);
    return delay(formatTrip(trip), 400);
  }

  // GET /admin/spk-ready-kirim -> daftar SPK siap diplot (lihat SpkReadyKirim di driver-apk-backend)
  if (method === 'GET' && path === '/admin/spk-ready-kirim') {
    return delay(DUMMY_SPK_READY_KIRIM, 300);
  }

  // GET /admin/spk-belum-sj -> tab "SPK" -- SPK ready-kirim yang belum ada SJ sama sekali
  // (kriteria beda dari spk-ready-kirim di atas, lihat SpkReadyKirim::listBelumSj()).
  // Dicek dari header penjualan_id (jalur trip-linked lama) DAN items[].penjualan_id
  // (jalur manual breakdown produk, bisa lintas SPK) -- sama seperti query aslinya.
  if (method === 'GET' && path === '/admin/spk-belum-sj') {
    const spkYangSudahAdaSj = new Set();
    store.suratJalan.forEach((sj) => {
      if (sj.penjualan_id) spkYangSudahAdaSj.add(sj.penjualan_id);
      (sj.items || []).forEach((it) => { if (it.penjualan_id) spkYangSudahAdaSj.add(it.penjualan_id); });
    });
    let list = DUMMY_SPK_READY_KIRIM.filter((spk) => !spkYangSudahAdaSj.has(spk.penjualan_id));
    if (query.q) {
      const q = query.q.toLowerCase();
      list = list.filter((spk) => [spk.client_nama, spk.no_spk].some((v) => String(v || '').toLowerCase().includes(q)));
    }
    const page = Number(query.page) || 1;
    const perPage = Number(query.per_page) || 20;
    const start = (page - 1) * perPage;
    return delay({ data: list.slice(start, start + perPage), total: list.length, page, per_page: perPage }, 300);
  }

  // GET /admin/surat-jalan/:no  -> cek nomor SJ asli (lihat SuratJalanLookup di driver-apk-backend)
  m = path.match(/^\/admin\/surat-jalan\/(.+)$/);
  if (method === 'GET' && m) {
    const found = DUMMY_SURAT_JALAN[decodeURIComponent(m[1])];
    const deferred = $.Deferred();
    setTimeout(() => {
      if (found) deferred.resolve(found);
      else deferred.reject({ responseJSON: { message: 'Nomor Surat Jalan tidak ditemukan.' } });
    }, 300);
    return deferred.promise();
  }

  return delay({ message: 'Mock endpoint belum ada: ' + method + ' ' + path }, 200);
}
