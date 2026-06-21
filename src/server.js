require('dotenv').config();
const path = require('path');
const express = require('express');

const booksRoutes = require('./routes/books.routes');
const ordersRoutes = require('./routes/orders.routes');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api/books', booksRoutes);
app.use('/api/orders', ordersRoutes);

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', application: 'AceReads' });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(400).json({ error: error.message || 'Request failed' });
});

app.listen(port, () => {
  console.log(`AceReads is running at http://localhost:${port}`);
});
