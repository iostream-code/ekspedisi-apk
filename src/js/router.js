import $ from 'jquery';
import { isAuthenticated, getRole } from './auth.js';

const routes = []; // [{ pattern, paramNames, render, roles, public }]

/**
 * Daftarkan route, mendukung dynamic segment dengan prefix ':', contoh:
 * registerRoute('/driver/trip/:tripId', renderFn)
 */
export function registerRoute(path, render, { roles = null, public: isPublic = false } = {}) {
  const paramNames = [];
  const regexStr = path
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) {
        paramNames.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  routes.push({ regex: new RegExp(`^${regexStr}$`), paramNames, render, roles, public: isPublic });
}

function currentPath() {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/login';
}

export function navigate(path) {
  window.location.hash = path;
}

function matchRoute(path) {
  for (const route of routes) {
    const m = path.match(route.regex);
    if (m) {
      const params = {};
      route.paramNames.forEach((name, i) => { params[name] = m[i + 1]; });
      return { route, params };
    }
  }
  return null;
}

async function resolve() {
  const path = currentPath();
  const matched = matchRoute(path);
  const $app = $('#app');

  if (!matched) {
    $app.html('<div class="p-6">Halaman tidak ditemukan.</div>');
    return;
  }

  const { route, params } = matched;

  if (!route.public && !isAuthenticated()) {
    navigate('/login');
    return;
  }

  if (route.roles && !route.roles.includes(getRole())) {
    // Role tidak cocok -> redirect ke home masing-masing
    navigate(getRole() === 'admin' ? '/admin' : '/driver');
    return;
  }

  $app.empty();
  await route.render($app, params);
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  window.addEventListener('load', resolve);
  // Jika sudah 'load' duluan (module dieksekusi setelah load), resolve langsung:
  if (document.readyState === 'complete') resolve();
}
