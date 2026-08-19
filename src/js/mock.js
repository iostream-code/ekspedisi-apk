import $ from 'jquery';

// Semua data di sini cuma hidup di memori browser (hilang kalau refresh).
// Tujuannya: supaya alur lengkap (login -> dashboard -> checkpoint -> admin map) bisa
// didemokan tanpa backend nyala. Path & bentuk response sengaja dibuat SAMA PERSIS
// dengan kontrak API asli di ../driver-apk-backend, supaya gampang dicabut nanti
// (tinggal set MOCK_MODE: false di config.js).

const PLACEHOLDER_PHOTO = 'https://placehold.co/200x200/0F766E/FFFFFF?text=Foto';

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

export function mockRequest(path, method, data) {
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
    return delay({ ok: true, completed_steps: trip.completed_steps });
  }

  // POST /driver/trip/:id/complete
  m = path.match(/^\/driver\/trip\/(\d+)\/complete$/);
  if (method === 'POST' && m) {
    const trip = store.trips[m[1]];
    trip.status = 'completed';
    return delay(formatTrip(trip));
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
