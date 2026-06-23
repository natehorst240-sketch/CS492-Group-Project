// Plain Node.js server for AceReads.
// No Express, CORS package, framework, or build tool is used.

require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');

const { registerUser } = require('./sprint-1/T1-001_user-registration');
const { loginUser } = require('./sprint-1/T1-003_login-sessions');
const books = require('./sprint-1/T1-006_book-crud-model');
const cart = require('./sprint-2/T2-002_cart-api');
const orders = require('./sprint-2/T2-008_order-management-backend');

const port = Number(process.env.PORT || 3000);
const publicFolder = path.join(__dirname, '..', 'public');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body is too large'));
        request.destroy();
      }
    });

    request.on('end', () => {
      if (!body) return resolve({});

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Request body must be valid JSON'));
      }
    });

    request.on('error', reject);
  });
}

function getId(pathname, pattern) {
  const match = pathname.match(pattern);
  return match ? match[1] : null;
}

async function handleApi(request, response, url) {
  const method = request.method;
  const pathname = url.pathname;

  if (method === 'GET' && pathname === '/api/health') {
    sendJson(response, 200, { status: 'ok', application: 'AceReads' });
    return true;
  }

  if (method === 'POST' && pathname === '/api/auth/register') {
    sendJson(response, 201, await registerUser(await readJsonBody(request)));
    return true;
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    sendJson(response, 200, await loginUser(await readJsonBody(request)));
    return true;
  }

  if (method === 'GET' && pathname === '/api/books') {
    sendJson(response, 200, await books.getBooks(Object.fromEntries(url.searchParams)));
    return true;
  }

  const bookId = getId(pathname, /^\/api\/books\/(\d+)$/);
  if (bookId && method === 'GET') {
    const book = await books.getBookById(bookId);
    sendJson(response, book ? 200 : 404, book || { error: 'Book not found' });
    return true;
  }
  if (pathname === '/api/books' && method === 'POST') {
    sendJson(response, 201, await books.addBook(await readJsonBody(request)));
    return true;
  }
  if (bookId && method === 'PUT') {
    sendJson(response, 200, await books.updateBook(bookId, await readJsonBody(request)));
    return true;
  }
  if (bookId && method === 'DELETE') {
    sendJson(response, 200, await books.deleteBook(bookId));
    return true;
  }

  const cartUserId = getId(pathname, /^\/api\/cart\/(\d+)$/);
  if (cartUserId && method === 'GET') {
    sendJson(response, 200, await cart.getCart(cartUserId));
    return true;
  }
  if (pathname === '/api/cart' && method === 'POST') {
    const body = await readJsonBody(request);
    sendJson(response, 201, await cart.addToCart(body.user_id, body.book_id, body.quantity));
    return true;
  }
  const cartItemId = getId(pathname, /^\/api\/cart\/(\d+)$/);
  if (cartItemId && method === 'PUT') {
    const body = await readJsonBody(request);
    sendJson(response, 200, await cart.updateCartItem(cartItemId, body.quantity));
    return true;
  }
  if (cartItemId && method === 'DELETE') {
    sendJson(response, 200, await cart.removeCartItem(cartItemId));
    return true;
  }

  if (pathname === '/api/orders' && method === 'GET') {
    const userId = url.searchParams.get('user_id');
    if (!userId) {
      sendJson(response, 400, { error: 'user_id is required' });
    } else {
      sendJson(response, 200, await orders.getOrdersByUser(userId));
    }
    return true;
  }
  if (pathname === '/api/orders' && method === 'POST') {
    const body = await readJsonBody(request);
    sendJson(
      response,
      201,
      await orders.createOrder(body.user_id, body.shipping_address, body.items)
    );
    return true;
  }

  const orderId = getId(pathname, /^\/api\/orders\/(\d+)$/);
  if (orderId && method === 'GET') {
    const order = await orders.getOrderById(orderId);
    sendJson(response, order ? 200 : 404, order || { error: 'Order not found' });
    return true;
  }

  const orderStatusId = getId(pathname, /^\/api\/orders\/(\d+)\/status$/);
  if (orderStatusId && method === 'PATCH') {
    const body = await readJsonBody(request);
    sendJson(response, 200, await orders.updateOrderStatus(orderStatusId, body.status));
    return true;
  }

  return false;
}

function serveStaticFile(response, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(publicFolder, `.${requestedPath}`);

  if (!filePath.startsWith(`${path.resolve(publicFolder)}${path.sep}`)) {
    sendJson(response, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (error, file) => {
    if (error) {
      sendJson(response, 404, { error: 'Page not found' });
      return;
    }

    const contentType = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(file);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  try {
    if (url.pathname.startsWith('/api/')) {
      const handled = await handleApi(request, response, url);
      if (!handled) sendJson(response, 404, { error: 'API route not found' });
      return;
    }

    if (request.method !== 'GET') {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    serveStaticFile(response, decodeURIComponent(url.pathname));
  } catch (error) {
    console.error(error);
    if (!response.headersSent) {
      sendJson(response, 400, { error: error.message || 'Request failed' });
    } else {
      response.end();
    }
  }
});

server.listen(port, () => {
  console.log(`AceReads is running at http://localhost:${port}`);
});
