'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { buildCart } = require('./cart');

const router = express.Router();

router.use(requireAuth);

const PAYMENT_METHODS = ['card', 'upi', 'cod'];

function loadOrder(orderId, userId) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId);
  if (!order) return null;
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId);
  return order;
}

/** POST /api/orders — turn the cart into an order, decrement stock and clear the cart. */
router.post('/', (req, res) => {
  const fullName = String(req.body.fullName || '').trim();
  const address = String(req.body.address || '').trim();
  const city = String(req.body.city || '').trim();
  const postalCode = String(req.body.postalCode || '').trim();
  const paymentMethod = String(req.body.paymentMethod || 'card').trim();

  if (!fullName || !address || !city || !postalCode) {
    return res.status(400).json({ error: 'Please fill in every shipping field.' });
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Please choose a valid payment method.' });
  }

  const cart = buildCart(req.user.id);
  if (cart.items.length === 0) return res.status(400).json({ error: 'Your cart is empty.' });

  const outOfStock = cart.items.find((item) => item.quantity > item.stock);
  if (outOfStock) {
    return res.status(409).json({ error: `Only ${outOfStock.stock} left of ${outOfStock.name}.` });
  }

  const placeOrder = db.transaction(() => {
    const { lastInsertRowid } = db
      .prepare(`
        INSERT INTO orders (user_id, total, status, full_name, address, city, postal_code, payment_method)
        VALUES (?, ?, 'processing', ?, ?, ?, ?, ?)
      `)
      .run(req.user.id, cart.total, fullName, address, city, postalCode, paymentMethod);

    const orderId = Number(lastInsertRowid);
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
      VALUES (?, ?, ?, ?, ?)
    `);
    const reduceStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

    for (const item of cart.items) {
      insertItem.run(orderId, item.productId, item.name, item.price, item.quantity);
      reduceStock.run(item.quantity, item.productId);
    }

    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    return orderId;
  });

  const orderId = placeOrder();
  res.status(201).json({ order: loadOrder(orderId, req.user.id) });
});

/** GET /api/orders — order history for the signed-in user. */
router.get('/', (req, res) => {
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(req.user.id)
    .map((order) => ({
      ...order,
      items: db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(order.id)
    }));
  res.json({ orders });
});

/** GET /api/orders/:id — a single order. */
router.get('/:id', (req, res) => {
  const order = loadOrder(Number(req.params.id), req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order });
});

module.exports = router;
