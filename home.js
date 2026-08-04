'use strict';

(() => {
  const grid = document.getElementById('grid');
  const chips = document.getElementById('categories');
  const searchInput = document.getElementById('search');
  const resultCount = document.getElementById('result-count');

  let activeCategory = 'All';
  let searchTerm = '';
  let debounce;

  function cardTemplate(product) {
    const { escapeHtml, money, stars } = NovaCart;
    return `
      <article class="card">
        <a class="card-media" href="/product.html?slug=${encodeURIComponent(product.slug)}">
          <img src="/images/${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />
        </a>
        <div class="card-body">
          <span class="card-cat">${escapeHtml(product.category)}</span>
          <h3 class="card-title">
            <a href="/product.html?slug=${encodeURIComponent(product.slug)}">${escapeHtml(product.name)}</a>
          </h3>
          <p class="card-desc">${escapeHtml(product.description.slice(0, 72))}…</p>
          <span class="rating">${stars(product.rating)} <span class="muted">${product.rating.toFixed(1)}</span></span>
          <div class="card-foot">
            <span class="price">${money(product.price)}</span>
            <button class="btn" type="button" data-add="${product.id}" ${product.stock ? '' : 'disabled'}>
              ${product.stock ? 'Add to cart' : 'Sold out'}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  async function loadCategories() {
    const { categories } = await NovaCart.api('/api/products/categories');
    chips.innerHTML = ['All', ...categories]
      .map((c) => `<button class="chip${c === activeCategory ? ' active' : ''}" type="button" data-category="${NovaCart.escapeHtml(c)}">${NovaCart.escapeHtml(c)}</button>`)
      .join('');
  }

  async function loadProducts() {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (activeCategory !== 'All') params.set('category', activeCategory);

    const { products } = await NovaCart.api(`/api/products?${params.toString()}`);
    resultCount.textContent = `${products.length} item${products.length === 1 ? '' : 's'}`;

    grid.innerHTML = products.length
      ? products.map(cardTemplate).join('')
      : '<div class="empty"><h2>No matches</h2><p>Try a different search or category.</p></div>';
  }

  chips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === button));
    loadProducts();
  });

  searchInput.addEventListener('input', (event) => {
    searchTerm = event.target.value.trim();
    clearTimeout(debounce);
    debounce = setTimeout(loadProducts, 250);
  });

  grid.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-add]');
    if (!button) return;
    button.disabled = true;
    try {
      await NovaCart.addToCart(Number(button.dataset.add), 1);
    } catch (error) {
      NovaCart.toast(error.message);
    } finally {
      button.disabled = false;
    }
  });

  loadCategories().then(loadProducts).catch((error) => {
    grid.innerHTML = `<div class="empty"><h2>Could not load products</h2><p>${NovaCart.escapeHtml(error.message)}</p></div>`;
  });
})();
