import $ from 'jquery';
import { APP_CONFIG } from './config.js';
import { logout, getToken } from './auth.js';
import { mockRequest } from './mock.js';

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: 'Bearer ' + token } : {};
}

/**
 * Wrapper request JSON standar.
 * @param {string} path - path relatif, contoh: '/driver/status'
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method
 * @param {object|null} data
 */
function request(path, method = 'GET', data = null) {
  if (APP_CONFIG.MOCK_MODE) return mockRequest(path, method, data || {});

  return $.ajax({
    url: APP_CONFIG.API_BASE_URL + path,
    method,
    data: data ? JSON.stringify(data) : undefined,
    contentType: 'application/json',
    dataType: 'json',
    timeout: 20000,
    headers: authHeaders(),
  }).fail((xhr) => {
    if (xhr.status === 401) {
      // Token invalid/expired/dicabut -> paksa logout & balik ke login
      logout();
      window.location.hash = '#/login';
    }
  });
}

/**
 * Upload multipart (foto berangkat / serah terima / SJ) beserta metadata lokasi.
 * @param {string} path
 * @param {File|Blob} fileBlob
 * @param {string} fieldName - nama field file di BE, mis. 'photo'
 * @param {object} extraFields - field tambahan, mis. { trip_id, lat, lng, type }
 */
function uploadFile(path, fileBlob, fieldName, extraFields = {}) {
  if (APP_CONFIG.MOCK_MODE) {
    // Mock tetap dibungkus FormData supaya kode mock.js baca field 'type' dengan cara yang sama (data.get('type'))
    const formData = new FormData();
    formData.append(fieldName, fileBlob, 'upload.jpg');
    Object.entries(extraFields).forEach(([key, value]) => formData.append(key, value));
    return mockRequest(path, 'POST', formData);
  }

  const formData = new FormData();
  formData.append(fieldName, fileBlob, 'upload.jpg');
  Object.entries(extraFields).forEach(([key, value]) => formData.append(key, value));

  return $.ajax({
    url: APP_CONFIG.API_BASE_URL + path,
    method: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    timeout: 60000,
    headers: authHeaders(),
  }).fail((xhr) => {
    if (xhr.status === 401) {
      logout();
      window.location.hash = '#/login';
    }
  });
}

export const api = {
  get: (path) => request(path, 'GET'),
  post: (path, data) => request(path, 'POST', data),
  put: (path, data) => request(path, 'PUT', data),
  del: (path) => request(path, 'DELETE'),
  uploadFile,
};
