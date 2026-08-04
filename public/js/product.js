'use strict';

(() => {
  const detail = document.getElementById('detail');
  const relatedGrid = document.getElementById('related');
  const relatedTitle = document.getElementById('related-title');
  const params = new URLSearchParams(window.location.search);
  const key = params.get('slug') || params.get('id');

  let quantity = 1;
  let product = null;

  function render() {
    const { escapeHtml, money, stars } = NovaCart;
    detail.innerHTML = `
      <section class="detail">
        <div class="detail-media">
          <img src="/images/${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />
        </div>
        <div>
          <span class="card-cat">${escapeHtml(product.category)}</span>
          <h1>${escapeHtml(product.name)}</h1>
          <div class="rating">${stars(product.rating)} <span class="muted">${product.rating.toFixed(1)} / 5</span></div>
          <p class="price" style="margin:14px 0">${money(product.price)}</p>
          <p class="detail-desc">${escapeHtml(product.description)}</p>
          <ul class="meta-list">
            <li><span>Availability</span><span>${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span></li>
            <li><span>Delivery</span><span>2–4 business days</span></li>
            <li><span>Returns</span><span>Free within 30 days</span></li>
          </ul>
          <div class="detail-actions">
            <div class="qty">
              <button type="button" data-step="-1" aria-label="Decrease quantity">−</button>
              <span id="qty-value">${quantity}</span>
              <button type="button" data-step="1" aria-label="Increase quantity">+</button>
            </div>
            <button class="btn" type="button" id="add" ${product.stock ? '' : 'disabled'}>
              ${product.stock ? 'Add to cart' : 'Sold out'}
            </button>
            <a class="btn btn-ghost" href="/cart.html">View cart</a>
          </div>
        </div>
      </section>
    `;

    detail.querySelectorAll('[data-step]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = quantity + Number(button.dataset.step);
        quantity = Math.min(Math.max(next, 1), Math.max(product.stock, 1));
        document.getElementById('qty-value').textContent = String(quantity);
      });
    });

    const addButton = document.getElementById('add');
    if (addButton) {
      addButton.addEventListener('click', async () => {
        addButton.disabled = true;
        try {
          await NovaCart.addToCart(product.id, quantity);
        } catch (error) {
          NovaCart.toast(error.message);
        } finally {
          addButton.disabled = false;
        }
      });
    }
  }

  function renderRelated(items) {
    if (!items.length) return;
    relatedTitle.hidden = false;
    relatedGrid.innerHTML = items
      .map((item) => `
        <article class="card">
          <a class="card-media" href="/product.html?slug=${encodeURIComponent(item.slug)}">
            <img src="/images/${NovaCart.escapeHtml(item.image)}" alt="${NovaCart.escapeHtml(item.name)}" loading="lazy" />
          </a>
          <div class="card-body">
            <span class="card-cat">${NovaCart.escapeHtml(item.category)}</span>
            <h3 class="card-title"><a href="/product.html?slug=${encodeURIComponent(item.slug)}">${NovaCart.escapeHtml(item.name)}</a></h3>
            <div class="card-foot"><span class="price">${NovaCart.money(item.price)}</span></div>
          </div>
        </article>
      `)
      .join('');
  }

  if (!key) {
    detail.innerHTML = '<div class="empty"><h2>No product selected</h2><p><a href="/">Back to the shop</a></p></div>';
    return;
  }

  NovaCart.api(`/api/products/${encodeURIComponent(key)}`)
    .then((data) => {
      product = data.product;
      document.title = `${product.name} — NovaCart`;
      render();
      renderRelated(data.related);
    })
    .catch((error) => {
      detail.innerHTML = `<div class="empty"><h2>Product not found</h2><p>${NovaCart.escapeHtml(error.message)}</p><p><a href="/">Back to the shop</a></p></div>`;
    });
})();
