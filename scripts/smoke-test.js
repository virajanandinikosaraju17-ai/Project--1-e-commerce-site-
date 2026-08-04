'use strict';

/* End-to-end check of the API: register -> browse -> cart -> order -> history. */

const BASE = process.env.BASE_URL || 'http://localhost:3000';

let cookie = '';
let passed = 0;
let failed = 0;

async function call(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { status: response.status, body: payload };
}

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label} ${detail}`);
  }
}

(async () => {
  console.log(`Running NovaCart smoke test against ${BASE}\n`);

  const health = await call('GET', '/api/health');
  check('health endpoint responds', health.status === 200 && health.body.ok);

  const list = await call('GET', '/api/products');
  check('product listing returns seeded products', list.status === 200 && list.body.products.length >= 12);

  const search = await call('GET', '/api/products?search=keyboard');
  check('search filters products', search.status === 200 && search.body.products.length >= 1);

  const categories = await call('GET', '/api/products/categories');
  check('categories endpoint works', categories.status === 200 && categories.body.categories.length >= 3);

  const first = list.body.products[0];
  const detail = await call('GET', `/api/products/${first.slug}`);
  check('product detail by slug', detail.status === 200 && detail.body.product.id === first.id);

  const missing = await call('GET', '/api/products/does-not-exist');
  check('unknown product returns 404', missing.status === 404);

  const guardedCart = await call('GET', '/api/cart');
  check('cart requires authentication', guardedCart.status === 401);

  const email = `smoke_${Date.now()}@novacart.test`;
  const register = await call('POST', '/api/auth/register', {
    name: 'Smoke Tester',
    email,
    password: 'secret123'
  });
  check('registration creates a user', register.status === 201 && register.body.user.email === email);

  const duplicate = await call('POST', '/api/auth/register', {
    name: 'Smoke Tester',
    email,
    password: 'secret123'
  });
  check('duplicate email rejected', duplicate.status === 409);

  const badLogin = await call('POST', '/api/auth/login', { email, password: 'wrong-password' });
  check('wrong password rejected', badLogin.status === 401);

  const login = await call('POST', '/api/auth/login', { email, password: 'secret123' });
  check('login succeeds', login.status === 200 && login.body.user.email === email);

  const me = await call('GET', '/api/auth/me');
  check('session identifies the user', me.status === 200 && me.body.user.email === email);

  const second = list.body.products[1];
  await call('POST', '/api/cart', { productId: first.id, quantity: 2 });
  const added = await call('POST', '/api/cart', { productId: second.id, quantity: 1 });
  check('items added to cart', added.status === 201 && added.body.cart.count === 3);

  const patched = await call('PATCH', `/api/cart/${first.id}`, { quantity: 1 });
  check('quantity update works', patched.status === 200 && patched.body.cart.count === 2);

  const expectedSubtotal = Number((first.price + second.price).toFixed(2));
  check(
    'totals are correct',
    Math.abs(patched.body.cart.subtotal - expectedSubtotal) < 0.011,
    `expected ${expectedSubtotal}, got ${patched.body.cart.subtotal}`
  );

  const removed = await call('DELETE', `/api/cart/${second.id}`);
  check('item removal works', removed.status === 200 && removed.body.cart.count === 1);

  await call('POST', '/api/cart', { productId: second.id, quantity: 1 });

  const badOrder = await call('POST', '/api/orders', { fullName: '', address: '', city: '', postalCode: '' });
  check('checkout validates shipping fields', badOrder.status === 400);

  const order = await call('POST', '/api/orders', {
    fullName: 'Smoke Tester',
    address: '12 Maple Street',
    city: 'Bengaluru',
    postalCode: '560001',
    paymentMethod: 'card'
  });
  check('order is created', order.status === 201 && order.body.order.items.length === 2);

  const emptied = await call('GET', '/api/cart');
  check('cart is cleared after checkout', emptied.body.cart.count === 0);

  const stockAfter = await call('GET', `/api/products/${first.id}`);
  check(
    'stock is decremented',
    stockAfter.body.product.stock === first.stock - 1,
    `expected ${first.stock - 1}, got ${stockAfter.body.product.stock}`
  );

  const history = await call('GET', '/api/orders');
  check('order history lists the order', history.status === 200 && history.body.orders[0].id === order.body.order.id);

  const emptyCheckout = await call('POST', '/api/orders', {
    fullName: 'Smoke Tester',
    address: '12 Maple Street',
    city: 'Bengaluru',
    postalCode: '560001',
    paymentMethod: 'cod'
  });
  check('checkout with an empty cart is rejected', emptyCheckout.status === 400);

  await call('POST', '/api/auth/logout');
  const afterLogout = await call('GET', '/api/cart');
  check('logout ends the session', afterLogout.status === 401);

  for (const page of ['/', '/product.html', '/cart.html', '/checkout.html', '/orders.html', '/login.html', '/register.html']) {
    const response = await fetch(`${BASE}${page}`);
    check(`page ${page} serves HTML`, response.status === 200);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exit(1);
});
