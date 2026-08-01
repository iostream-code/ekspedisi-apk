import { api } from './api.js';
import { APP_CONFIG } from './config.js';

let watchId = null;
let pingTimer = null;
let lastPosition = null;

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation tidak didukung'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: APP_CONFIG.GEO_TIMEOUT_MS,
      maximumAge: 5000,
    });
  });
}

/**
 * Mulai tracking lokasi: watch posisi terus-menerus di device,
 * lalu kirim ke server tiap LOCATION_PING_INTERVAL_MS (bukan tiap event,
 * supaya hemat baterai & kuota data).
 */
function startTracking() {
  if (watchId !== null) return; // sudah jalan

  watchId = navigator.geolocation.watchPosition(
    (pos) => { lastPosition = pos; },
    (err) => console.warn('[geo] watchPosition error:', err.message),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: APP_CONFIG.GEO_TIMEOUT_MS }
  );

  pingTimer = setInterval(() => {
    if (!lastPosition) return;
    const { latitude, longitude, speed, heading, accuracy } = lastPosition.coords;
    api.post('/driver/location', {
      lat: latitude,
      lng: longitude,
      speed: speed || 0,
      heading: heading || 0,
      accuracy,
      recorded_at: new Date().toISOString(),
    }).catch((err) => console.warn('[geo] gagal kirim lokasi:', err.statusText));
  }, APP_CONFIG.LOCATION_PING_INTERVAL_MS);
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (pingTimer !== null) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  lastPosition = null;
}

export const geo = { getCurrentPosition, startTracking, stopTracking };
