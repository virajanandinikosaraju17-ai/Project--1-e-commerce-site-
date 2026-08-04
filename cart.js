'use strict';

(() => {
  const root = document.getElementById('cart-root');

  function render(cart) {
    const { escapeHtml, money } = NovaCart;
    const badge = document.querySelector('[data-cart-count]');
    if (badge) badge.textContent = String(cart.count);

    if (!cart.items.length) {
      root.innerHTML = `
        <div class="panel empty">
          <h2>Your cart is empty</h2>
          <p>Browse the catalog and add something you love.</p>
          <a class="btn" href="/">Start shopping</a>
        </div>
      `;
      return;
    }

    root.innerHTML = `
      <div class="layout-2">
        <section class="panel">
          <h2>${cart.count} item${cart.count === 1 ? '' : 's'}</h2>
          ${cart.items.map((item) => `
            <div class="cart-row">
              <a href="/product.html?slug=${encodeURIComponent(item.slug)}">
                <img src="/images/${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" />
              </a>
              <div>
                <h3><a href="/product.html?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.name)}</a></h3>
                <div class="muted">${money(item.price)} each · ${escapeHtml(item.category)}</div>
              </div>
              <div class="cart-row-end">
                <div class="qty">
                  <button type="button" data-set="${item.productId}" data-qty="${item.quantity - 1}" aria-label="Decrease quantity">−</button>
                  <span>${item.quantity}</span>
                  <button type="button" data-set="${item.productId}" data-qty="${item.quantity + 1}" aria-label="Increase quantity">+</button>
                </div>
                <strong>${money(item.lineTotal)}</strong>
                <button class="btn btn-danger" type="button" data-remove="${item.productId}">Remove</button>
              </div>
            </div>
          `).join('')}
          <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap">
            <a class="btn btn-ghost" href="/">Continue shopping</a>
            <button class="btn btn-ghost" type="button" data-clear>Clear cart</button>
          </div>
        </section>

        <aside class="panel">
          <h2>Order summary</h2>
          <div class="summary-line"><span>Subtotal</span><span>${money(cart.subtotal)}</span></div>
          <div class="summary-line"><span>Shipping</span><span>${cart.shipping === 0 ? 'Free' : money(cart.shipping)}</span></div>
          ${cart.shipping > 0
            ? `<p class="muted" style="font-size:.84rem">Add ${money(cart.freeShippingOver - cart.subtotal)} more for free delivery.</p>`
            : ''}
          <div class="summary-total"><span>Total</span><span>${money(cart.total)}</span></div>
          <a class="btn btn-block" style="margin-top:18px" href="/checkout.html">Proceed to checkout</a>
        </aside>
      </div>
    `;
  }

  async function mutate(request) {
    try {
      const { cart } = await request;
      render(cart);
    } catch (error) {
      NovaCart.toast(error.message);
    }
  }

  root.addEventListener('click', (event) => {
    const setButton = event.target.closest('[data-set]');
    const removeButton = event.target.closest('[data-remove]');
    const clearButton = event.target.closest('[data-clear]');

    if (setButton) {
      const quantity = Math.max(0, Number(setButton.dataset.qty));
      mutate(NovaCart.api(`/api/cart/${setButton.dataset.set}`, { method: 'PATCH', body: { quantity } }));
    } else if (removeButton) {
      mutate(NovaCart.api(`/api/cart/${removeButton.dataset.remove}`, { method: 'DELETE' }));
    } else if (clearButton) {
      mutate(NovaCart.api('/api/cart', { method: 'DELETE' }));
    }
  });

  (async () => {
    const user = await NovaCart.getUser();
    if (!user) {
      root.innerHTML = `
        <div class="panel empty">
          <h2>Sign in to see your cart</h2>
          <p>Your cart is saved to your NovaCart account.</p>
          <a class="btn" href="/login.html?next=%2Fcart.html">Sign in</a>
        </div>
      `;
      return;
    }
    try {
      const { cart } = await NovaCart.api('/api/cart');
      render(cart);
    } catch (error) {
      root.innerHTML = `<div class="panel empty"><h2>Could not load your cart</h2><p>${NovaCart.escapeHtml(error.message)}</p></div>`;
    }
  })();
})();
