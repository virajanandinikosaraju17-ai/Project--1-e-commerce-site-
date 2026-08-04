'use strict';

(() => {
  const root = document.getElementById('orders-root');

  function orderCard(order) {
    const { escapeHtml, money } = NovaCart;
    return `
      <section class="panel order-card">
        <div class="order-head">
          <div>
            <h3>Order #${order.id}</h3>
            <span class="muted">Placed ${escapeHtml(order.created_at)} UTC · ${escapeHtml(order.payment_method.toUpperCase())}</span>
          </div>
          <span class="badge">${escapeHtml(order.status)}</span>
        </div>
        <ul class="order-items">
          ${order.items.map((item) => `
            <li><span>${escapeHtml(item.product_name)} × ${item.quantity}</span>
                <span>${money(item.unit_price * item.quantity)}</span></li>
          `).join('')}
        </ul>
        <div class="summary-total"><span>Total</span><span>${money(order.total)}</span></div>
        <p class="muted" style="font-size:.86rem;margin-bottom:0">
          Ships to ${escapeHtml(order.full_name)}, ${escapeHtml(order.address)}, ${escapeHtml(order.city)} ${escapeHtml(order.postal_code)}
        </p>
      </section>
    `;
  }

  (async () => {
    const user = await NovaCart.getUser();
    if (!user) {
      root.innerHTML = `
        <div class="panel empty">
          <h2>Sign in to see your orders</h2>
          <a class="btn" href="/login.html?next=%2Forders.html">Sign in</a>
        </div>
      `;
      return;
    }
    try {
      const { orders } = await NovaCart.api('/api/orders');
      root.innerHTML = orders.length
        ? orders.map(orderCard).join('')
        : '<div class="panel empty"><h2>No orders yet</h2><p>When you place an order it will show up here.</p><a class="btn" href="/">Start shopping</a></div>';
    } catch (error) {
      root.innerHTML = `<div class="panel empty"><h2>Could not load orders</h2><p>${NovaCart.escapeHtml(error.message)}</p></div>`;
    }
  })();
})();
