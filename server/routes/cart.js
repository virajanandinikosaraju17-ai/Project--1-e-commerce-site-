'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

router.use(requireAuth);

const SELECT_CART = `
  SELECT ci.product_id AS productId,
         ci.quantity   AS quantity,
         p.name, p.slug, p.price, p.image, p.stock, p.category
  FROM cart_items ci
  JOIN products p ON p.id = ci.product_id
  WHERE ci.user_id = ?
  ORDER BY ci.id
`;

const SHIPPING_FLAT = 6.99;
const FREE_SHIPPING_OVER = 150;

function buildCart(userId) {
  const items = db.prepare(SELECT_CART).all(userId).map((item) => ({
    ...item,
    lineTotal: Number((item.price * item.quantity).toFixed(2))
  }));

  const subtotal = Number(items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2));
  const shipping = items.length === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
  const total = Number((subtotal + shipping).toFixed(2));
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, subtotal, shipping, total, count, freeShippingOver: FREE_SHIPPING_OVER };
}

/** GET /api/cart — the signed-in user's cart with totals. */
router.get('/', (req, res) => {
  res.json({ cart: buildCart(req.user.id) });
});

/** POST /api/cart — add a product (or increase its quantity). */
router.post('/', (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity || 1);

  if (!Number.isInteger(productId)) return res.status(400).json({ error: 'Invalid product.' });
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'Invalid quantity.' });

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const existing = db
    .prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(req.user.id, productId);
  const nextQuantity = Math.min((existing ? existing.quantity : 0) + quantity, product.stock);

  if (nextQuantity < 1) return res.status(400).json({ error: 'This product is out of stock.' });

  db.prepare(`
    INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
    ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = excluded.quantity
  `).run(req.user.id, productId, nextQuantity);

  res.status(201).json({ cart: buildCart(req.user.id) });
});

/** PATCH /api/cart/:productId — set an exact quantity (0 removes the line). */
router.patch('/:productId', (req, res) => {
  const productId = Number(req.params.productId);
  const quantity = Number(req.body.quantity);

  if (!Number.isInteger(productId)) return res.status(400).json({ error: 'Invalid product.' });
  if (!Number.isInteger(quantity) || quantity < 0) return res.status(400).json({ error: 'Invalid quantity.' });

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  if (quantity === 0) {
    db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, productId);
  } else {
    db.prepare(`
      INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
      ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = excluded.quantity
    `).run(req.user.id, productId, Math.min(quantity, product.stock));
  }

  res.json({ cart: buildCart(req.user.id) });
});

/** DELETE /api/cart/:productId — remove one line from the cart. */
router.delete('/:productId', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(
    req.user.id,
    Number(req.params.productId)
  );
  res.json({ cart: buildCart(req.user.id) });
});

/** DELETE /api/cart — empty the cart. */
router.delete('/', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
  res.json({ cart: buildCart(req.user.id) });
});

module.exports = { router, buildCart };
