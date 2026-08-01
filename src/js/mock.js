import $ from 'jquery';

// Semua data di sini cuma hidup di memori browser (hilang kalau refresh).
// Tujuannya: supaya alur lengkap (login -> dashboard -> checkpoint -> admin map) bisa
// didemokan tanpa backend Laravel nyala. Path & bentuk response sengaja dibuat SAMA
// PERSIS dengan kontrak API asli di backend/README-BACKEND.md, supaya gampang dicabut
// nanti (tinggal set MOCK_MODE: false di config.js).

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
  drivers: [
    { id: 1, name: 'Budi Santoso', status: 'online', lat: jitter(BASE_LAT), lng: jitter(BASE_LNG) },
    { id: 2, name: 'Agus Wijaya', status: 'resting', lat: jitter(BASE_LAT), lng: jitter(BASE_LNG) },
    { id: 3, name: 'Rudi Hartono', status: 'offline', lat: jitter(BASE_LAT), lng: jitter(BASE_LNG) },
    { id: 4, name: 'Slamet Riyadi', status: 'online', lat: jitter(BASE_LAT), lng: jitter(BASE_LNG) },
  ],
};

// Seed 2 perjalanan aktif buat driver id=1, biar waktu demo dashboard supir langsung
// kelihatan mendukung lebih dari 1 perjalanan aktif.
function seedTrip(driverId, destination) {
  const trip = { id: store.nextTripId++, driver_id: driverId, destination, status: 'in_progress', completed_steps: [] };
  store.trips[trip.id] = trip;
  return trip;
}
seedTrip(1, 'Gudang Sidoarjo -> Toko Makmur Jaya');
seedTrip(1, 'Gudang Sidoarjo -> Toko Sumber Rejeki');

function nextStepLabel(trip) {
  const next = STEPS.find((s) => !trip.completed_steps.includes(s));
  return next ? STEP_LABELS[next] : 'Selesai';
}

function formatTrip(trip) {
  return {
    id: trip.id,
    destination: trip.destination,
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
  return delay({
    token: 'dummy-token-' + Date.now(),
    user: {
      id: isAdmin ? 999 : CURRENT_DRIVER_ID,
      name: isAdmin ? 'Admin Dispatcher' : 'Budi Santoso',
      role: isAdmin ? 'admin' : 'driver',
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
    return delay({ id: driver.id, name: driver.name, phone: '08123456789', status: driver.status, trips });
  }

  // POST /admin/drivers/:id/trip  -> ADMIN bikin perjalanan baru untuk supir tsb
  m = path.match(/^\/admin\/drivers\/(\d+)\/trip$/);
  if (method === 'POST' && m) {
    const trip = seedTrip(Number(m[1]), data.destination || 'Perjalanan tanpa tujuan');
    return delay(formatTrip(trip), 400);
  }

  return delay({ message: 'Mock endpoint belum ada: ' + method + ' ' + path }, 200);
}
