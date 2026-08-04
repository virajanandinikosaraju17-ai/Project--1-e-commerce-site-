# NovaCart

A simple, modern e-commerce store — product listings, product detail pages, a shopping cart,
checkout with order processing and user registration/login, all backed by a real database.

- **Frontend:** HTML, CSS and vanilla JavaScript (no build step, no frameworks)
- **Backend:** Node.js + Express
- **Database:** SQLite (via `better-sqlite3`) storing users, products, cart items and orders
- **Auth:** bcrypt password hashing + JWT stored in an httpOnly cookie

## Quick start

Requires **Node.js 18 or newer**.

```bash
npm install
npm start
```

Then open <http://localhost:3000>.

The database is created and seeded with 12 products automatically on first run
(`data/novacart.db`). Delete the `data/` folder to reset the store.

To change the port or the token secret:

```bash
PORT=4000 JWT_SECRET="a-long-random-string" npm start
```

## Try it

1. Click **Create account** and register (any email; password ≥ 6 characters).
2. Browse the catalog, search, filter by category, open a product page.
3. Add items to the cart, change quantities, then **Proceed to checkout**.
4. Fill in the shipping form and place the order — stock is reduced, the cart is emptied
   and the order appears under **Orders**.

## Verifying it works

With the server running in another terminal:

```bash
npm run smoke
```

This exercises the full flow (register → browse → cart → order → history) and prints a
pass/fail line per check.

## Project structure

```
novacart/
├── server/
│   ├── index.js            Express app, static hosting, route mounting
│   ├── db.js               SQLite schema + product seed data
│   ├── auth.js             JWT signing, cookies, auth middleware
│   └── routes/
│       ├── products.js     listing, search, categories, detail
│       ├── auth.js         register, login, logout, me, profile
│       ├── cart.js         cart CRUD + totals
│       └── orders.js       checkout, order history
├── public/
│   ├── index.html          product listing
│   ├── product.html        product detail
│   ├── cart.html           shopping cart
│   ├── checkout.html       checkout + confirmation
│   ├── orders.html         order history
│   ├── login.html / register.html
│   ├── css/styles.css
│   ├── js/                 app.js (shared) + one script per page
│   └── images/             product photos (JPG) + favicon
├── scripts/
│   └── smoke-test.js       end-to-end API test
└── data/                   SQLite database (created at runtime)
```

## Database schema

| Table         | Purpose                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `users`       | id, name, email (unique), password_hash, created_at                      |
| `products`    | id, name, slug, description, price, category, image, stock, rating       |
| `cart_items`  | user_id + product_id (unique pair), quantity — the persistent cart       |
| `orders`      | user_id, total, status, shipping address fields, payment_method, created_at |
| `order_items` | order_id, product_id, product_name, unit_price, quantity (price snapshot) |

## API reference

| Method   | Endpoint                    | Auth | Description                       |
| -------- | --------------------------- | ---- | --------------------------------- |
| `GET`    | `/api/products`             | –    | List products (`?search=&category=`) |
| `GET`    | `/api/products/categories`  | –    | Distinct categories               |
| `GET`    | `/api/products/:idOrSlug`   | –    | Product detail + related items    |
| `POST`   | `/api/auth/register`        | –    | Create account and sign in        |
| `POST`   | `/api/auth/login`           | –    | Sign in                           |
| `POST`   | `/api/auth/logout`          | –    | Sign out                          |
| `GET`    | `/api/auth/me`              | –    | Current user or `null`            |
| `GET`    | `/api/auth/profile`         | ✔    | Profile + order stats             |
| `GET`    | `/api/cart`                 | ✔    | Cart contents and totals          |
| `POST`   | `/api/cart`                 | ✔    | Add product (`productId`, `quantity`) |
| `PATCH`  | `/api/cart/:productId`      | ✔    | Set quantity (`0` removes)        |
| `DELETE` | `/api/cart/:productId`      | ✔    | Remove one line                   |
| `DELETE` | `/api/cart`                 | ✔    | Empty the cart                    |
| `POST`   | `/api/orders`               | ✔    | Place an order from the cart      |
| `GET`    | `/api/orders`               | ✔    | Order history                     |
| `GET`    | `/api/orders/:id`           | ✔    | Single order                      |

Shipping is a flat **$6.99**, free on orders over **$150**. Checkout is a demo — no real
payment is processed.

## Notes

- Passwords are hashed with bcrypt; the JWT cookie is `httpOnly` and expires after 7 days.
- Set `JWT_SECRET` in production; the fallback development secret is not safe for real use.
- Product photos live in `public/images` and are referenced by the `image` column in the
  `products` table — swap a file (or change the column) to use your own artwork.
- Everything is served locally, so the app works fully offline.
