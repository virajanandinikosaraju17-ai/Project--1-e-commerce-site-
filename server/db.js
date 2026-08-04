'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// DATABASE_PATH lets a host point the database at a mounted persistent disk.
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'novacart.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    slug        TEXT    NOT NULL UNIQUE,
    description TEXT    NOT NULL,
    price       REAL    NOT NULL,
    category    TEXT    NOT NULL,
    image       TEXT    NOT NULL,
    stock       INTEGER NOT NULL DEFAULT 0,
    rating      REAL    NOT NULL DEFAULT 4.5
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    UNIQUE (user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total          REAL    NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'processing',
    full_name      TEXT    NOT NULL,
    address        TEXT    NOT NULL,
    city           TEXT    NOT NULL,
    postal_code    TEXT    NOT NULL,
    payment_method TEXT    NOT NULL,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     INTEGER NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
    product_id   INTEGER NOT NULL REFERENCES products(id),
    product_name TEXT    NOT NULL,
    unit_price   REAL    NOT NULL,
    quantity     INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cart_user   ON cart_items(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_oitems_ord  ON order_items(order_id);
`);

const SEED_PRODUCTS = [
  ['Aurora Wireless Headphones', 'aurora-wireless-headphones', 'Over-ear headphones with adaptive noise cancelling, 40h battery life and plush memory-foam cushions.', 199.0, 'Audio', 'headphones.jpg', 24, 4.8],
  ['Pulse Bluetooth Speaker', 'pulse-bluetooth-speaker', 'Pocket-sized 360° speaker with deep bass, IPX7 water resistance and 18 hours of playtime.', 79.5, 'Audio', 'speaker.jpg', 40, 4.6],
  ['Nimbus Mechanical Keyboard', 'nimbus-mechanical-keyboard', 'Hot-swappable 75% keyboard with tactile switches, per-key RGB and an aluminium body.', 129.0, 'Desk', 'keyboard.jpg', 18, 4.7],
  ['Glide Wireless Mouse', 'glide-wireless-mouse', 'Ultra-light 58g ergonomic mouse with a 26k DPI sensor and silent clicks.', 49.0, 'Desk', 'mouse.jpg', 55, 4.4],
  ['Lumen Desk Lamp', 'lumen-desk-lamp', 'Minimal LED lamp with stepless dimming, five colour temperatures and USB-C charging port.', 64.0, 'Desk', 'lamp.jpg', 30, 4.5],
  ['Chrono Smart Watch', 'chrono-smart-watch', 'AMOLED fitness watch tracking heart rate, sleep and 100+ workouts. 10-day battery.', 179.0, 'Wearables', 'watch.jpg', 22, 4.6],
  ['Vertex Laptop Stand', 'vertex-laptop-stand', 'Foldable aluminium stand that lifts your laptop to eye level and keeps it cool.', 39.0, 'Desk', 'stand.jpg', 60, 4.3],
  ['Echo Noise-Free Earbuds', 'echo-noise-free-earbuds', 'True wireless earbuds with hybrid ANC, wireless charging case and low-latency game mode.', 99.0, 'Audio', 'earbuds.jpg', 45, 4.5],
  ['Terra Canvas Backpack', 'terra-canvas-backpack', 'Water-resistant 22L backpack with a padded 16" laptop sleeve and hidden pockets.', 89.0, 'Everyday', 'backpack.jpg', 27, 4.7],
  ['Volt 20K Power Bank', 'volt-20k-power-bank', '20,000mAh power bank with 65W USB-C fast charging for laptops, tablets and phones.', 59.0, 'Everyday', 'powerbank.jpg', 50, 4.4],
  ['Prism 4K Webcam', 'prism-4k-webcam', '4K webcam with auto framing, HDR and a dual noise-cancelling microphone array.', 119.0, 'Desk', 'webcam.jpg', 15, 4.2],
  ['Muse Coffee Grinder', 'muse-coffee-grinder', 'Conical burr grinder with 30 grind settings and a quiet, low-static motor.', 109.0, 'Everyday', 'grinder.jpg', 12, 4.6]
];

const seed = db.transaction(() => {
  const insert = db.prepare(`
    INSERT INTO products (name, slug, description, price, category, image, stock, rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of SEED_PRODUCTS) insert.run(...p);
});

if (db.prepare('SELECT COUNT(*) AS c FROM products').get().c === 0) {
  seed();
  console.log(`[db] seeded ${SEED_PRODUCTS.length} products`);
}

module.exports = db;
