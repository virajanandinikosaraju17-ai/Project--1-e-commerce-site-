/* Shared helpers: API calls, header state, cart badge and toasts. */
'use strict';

const NovaCart = (() => {
  let cachedUser;

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: options.body ? { 'Content-Type': 'application/json' } : {},
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const error = new Error(payload.error || 'Something went wrong. Please try again.');
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function money(value) {
    return `$${Number(value).toFixed(2)}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function stars(rating) {
    const full = Math.round(Number(rating));
    return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full));
  }

  async function getUser({ refresh = false } = {}) {
    if (cachedUser === undefined || refresh) {
      const { user } = await api('/api/auth/me');
      cachedUser = user;
    }
    return cachedUser;
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    cachedUser = null;
  }

  function toast(message) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function setAlert(el, message, type = 'error') {
    if (!el) return;
    if (!message) {
      el.className = 'alert';
      el.textContent = '';
      return;
    }
    el.className = `alert show alert-${type}`;
    el.textContent = message;
  }

  async function refreshCartCount() {
    const badge = document.querySelector('[data-cart-count]');
    if (!badge) return;
    const user = await getUser();
    if (!user) {
      badge.textContent = '0';
      return;
    }
    try {
      const { cart } = await api('/api/cart');
      badge.textContent = String(cart.count);
    } catch {
      badge.textContent = '0';
    }
  }

  async function renderHeader() {
    const slot = document.querySelector('[data-auth-slot]');
    const here = window.location.pathname;
    document.querySelectorAll('.nav a[href]').forEach((link) => {
      if (link.getAttribute('href') === here) link.classList.add('active');
    });

    if (!slot) return;
    const user = await getUser();

    if (user) {
      slot.innerHTML = `
        <a href="/orders.html">Orders</a>
        <span class="muted">Hi, ${escapeHtml(user.name.split(' ')[0])}</span>
        <button class="btn btn-ghost" type="button" data-logout>Sign out</button>
      `;
      slot.querySelector('[data-logout]').addEventListener('click', async () => {
        await logout();
        window.location.href = '/';
      });
    } else {
      slot.innerHTML = `
        <a href="/login.html">Sign in</a>
        <a class="btn" href="/register.html">Create account</a>
      `;
    }
  }

  /** Adds a product to the cart, sending guests to the sign-in page first. */
  async function addToCart(productId, quantity = 1) {
    const user = await getUser();
    if (!user) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login.html?next=${next}`;
      return null;
    }
    const { cart } = await api('/api/cart', { method: 'POST', body: { productId, quantity } });
    const badge = document.querySelector('[data-cart-count]');
    if (badge) badge.textContent = String(cart.count);
    toast('Added to cart');
    return cart;
  }

  function init() {
    renderHeader();
    refreshCartCount();
    const year = document.querySelector('[data-year]');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  document.addEventListener('DOMContentLoaded', init);

  return { api, money, escapeHtml, stars, getUser, logout, toast, setAlert, refreshCartCount, addToCart };
})();
