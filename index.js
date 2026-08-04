'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { optionalAuth } = require('./auth');
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const { router: cartRoutes } = require('./routes/cart');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.use(express.json());
app.use(cookieParser());
app.use(optionalAuth);
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// Any non-API route falls back to the shop so deep links keep working.
app.use((_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`NovaCart running at http://localhost:${PORT}`);
});
