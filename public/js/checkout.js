'use strict';

(() => {
  const root = document.getElementById('checkout-root');

  function renderConfirmation(order) {
    const { escapeHtml, money } = NovaCart;
    const badge = document.querySelector('[data-cart-count]');
    if (badge) badge.textContent = '0';

    root.innerHTML = `
      <section class="panel" style="max-width:640px;margin-inline:auto;text-align:center">
        <div style="font-size:2.4rem">🎉</div>
        <h2>Order #${order.id} confirmed</h2>
        <p class="muted">Thanks, ${escapeHtml(order.full_name)}! We're preparing your parcel for
           ${escapeHtml(order.address)}, ${escapeHtml(order.city)} ${escapeHtml(order.postal_code)}.</p>
        <ul class="order-items" style="text-align:left;margin-top:18px">
          ${order.items.map((item) => `
            <li><span>${escapeHtml(item.product_name)} × ${item.quantity}</span>
                <span>${money(item.unit_price * item.quantity)}</span></li>
          `).join('')}
        </ul>
        <div class="summary-total"><span>Total paid</span><span>${money(order.total)}</span></div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap">
          <a class="btn" href="/orders.html">View my orders</a>
          <a class="btn btn-ghost" href="/">Keep shopping</a>
        </div>
      </section>
    `;
  }

  function renderForm(cart, user) {
    const { escapeHtml, money } = NovaCart;
    root.innerHTML = `
      <div class="layout-2">
        <section class="panel">
          <h2>Shipping details</h2>
          <div class="alert" id="alert"></div>
          <form id="checkout-form" novalidate>
            <div class="field">
              <label for="fullName">Full name</label>
              <input id="fullName" name="fullName" value="${escapeHtml(user.name)}" required />
            </div>
            <div class="field">
              <label for="address">Address</label>
              <input id="address" name="address" placeholder="12 Maple Street, Apt 4" required />
            </div>
            <div class="form-grid">
              <div class="field">
                <label for="city">City</label>
                <input id="city" name="city" placeholder="Bengaluru" required />
              </div>
              <div class="field">
                <label for="postalCode">Postal code</label>
                <input id="postalCode" name="postalCode" placeholder="560001" required />
              </div>
            </div>
            <div class="field">
              <label for="paymentMethod">Payment method</label>
              <select id="paymentMethod" name="paymentMethod">
                <option value="card">Credit / debit card</option>
                <option value="upi">UPI</option>
                <option value="cod">Cash on delivery</option>
              </select>
            </div>
            <button class="btn btn-block" type="submit" id="place">Place order · ${money(cart.total)}</button>
            <p class="muted" style="font-size:.82rem;text-align:center;margin-top:10px">
              Demo checkout — no real payment is taken.
            </p>
          </form>
        </section>

        <aside class="panel">
          <h2>Order summary</h2>
          ${cart.items.map((item) => `
            <div class="summary-line">
              <span>${escapeHtml(item.name)} × ${item.quantity}</span>
              <span>${money(item.lineTotal)}</span>
            </div>
          `).join('')}
          <div class="summary-line"><span>Shipping</span><span>${cart.shipping === 0 ? 'Free' : money(cart.shipping)}</span></div>
          <div class="summary-total"><span>Total</span><span>${money(cart.total)}</span></div>
        </aside>
      </div>
    `;

    const form = document.getElementById('checkout-form');
    const alertBox = document.getElementById('alert');
    const submitButton = document.getElementById('place');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      NovaCart.setAlert(alertBox, '');

      const body = Object.fromEntries(new FormData(form).entries());
      if (!body.fullName.trim() || !body.address.trim() || !body.city.trim() || !body.postalCode.trim()) {
        NovaCart.setAlert(alertBox, 'Please fill in every shipping field.');
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = 'Placing order…';
      try {
        const { order } = await NovaCart.api('/api/orders', { method: 'POST', body });
        renderConfirmation(order);
      } catch (error) {
        NovaCart.setAlert(alertBox, error.message);
        submitButton.disabled = false;
        submitButton.textContent = `Place order · ${money(cart.total)}`;
      }
    });
  }

  (async () => {
    const user = await NovaCart.getUser();
    if (!user) {
      window.location.href = '/login.html?next=%2Fcheckout.html';
      return;
    }
    try {
      const { cart } = await NovaCart.api('/api/cart');
      if (!cart.items.length) {
        root.innerHTML = `
          <div class="panel empty">
            <h2>Nothing to check out</h2>
            <p>Your cart is empty.</p>
            <a class="btn" href="/">Start shopping</a>
          </div>
        `;
        return;
      }
      renderForm(cart, user);
    } catch (error) {
      root.innerHTML = `<div class="panel empty"><h2>Checkout unavailable</h2><p>${NovaCart.escapeHtml(error.message)}</p></div>`;
    }
  })();
})();
