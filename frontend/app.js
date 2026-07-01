const API_URL = '/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('bookForm').addEventListener('submit', addBook);
  document.getElementById('customerForm').addEventListener('submit', addCustomer);
  document.getElementById('orderForm').addEventListener('submit', createOrder);
  document.getElementById('inventoryForm').addEventListener('submit', updateInventory);
}

// Section Navigation
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  // Show selected section
  document.getElementById(sectionId).classList.add('active');
  event.target.classList.add('active');

  // Load data for the section
  if (sectionId === 'books') loadBooks();
  if (sectionId === 'customers') loadCustomers();
  if (sectionId === 'orders') loadOrders();
  if (sectionId === 'inventory') loadInventory();
  if (sectionId === 'reports') loadReports();
  if (sectionId === 'dashboard') loadDashboard();
}

// ========== DASHBOARD ==========
function loadDashboard() {
  Promise.all([
    fetch(`${API_URL}/books`).then(r => r.json()),
    fetch(`${API_URL}/customers`).then(r => r.json()),
    fetch(`${API_URL}/orders`).then(r => r.json())
  ]).then(([books, customers, orders]) => {
    const totalSales = orders.reduce((sum, order) => sum + order.total_amount, 0);
    
    document.getElementById('totalBooks').textContent = books.length;
    document.getElementById('totalCustomers').textContent = customers.length;
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('totalSales').textContent = '$' + totalSales.toFixed(2);

    // Recent orders
    const recentOrders = orders.slice(0, 5);
    let html = '<h3>Recent Orders</h3><table><thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Date</th></tr></thead><tbody>';
    recentOrders.forEach(order => {
      const date = new Date(order.order_date).toLocaleDateString();
      html += `<tr><td>${order.id}</td><td>${order.customer_name || 'N/A'}</td><td>$${order.total_amount.toFixed(2)}</td><td>${date}</td></tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('dashboardDetails').innerHTML = html;
  }).catch(err => console.error('Dashboard error:', err));
}

// ========== BOOKS ==========
function loadBooks() {
  fetch(`${API_URL}/books`)
    .then(r => r.json())
    .then(books => {
      let html = '';
      books.forEach(book => {
        html += `
          <tr>
            <td>${book.isbn}</td>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.category || 'N/A'}</td>
            <td>$${book.price.toFixed(2)}</td>
            <td>${book.quantity_in_stock}</td>
            <td>
              <button class="action-btn btn-edit" onclick="editBook(${book.id})">Edit</button>
              <button class="action-btn btn-delete" onclick="deleteBook(${book.id})">Delete</button>
            </td>
          </tr>
        `;
      });
      document.getElementById('booksTable').innerHTML = html;

      // Populate order and inventory dropdowns
      let selectHtml = '<option value="">Select Book</option>';
      books.forEach(book => {
        selectHtml += `<option value="${book.id}">${book.title} (ISBN: ${book.isbn})</option>`;
      });
      document.querySelectorAll('.orderBook').forEach(select => {
        select.innerHTML = selectHtml;
      });
      document.getElementById('inventoryBook').innerHTML = selectHtml;
    })
    .catch(err => console.error('Error loading books:', err));
}

function addBook(e) {
  e.preventDefault();
  
  const book = {
    isbn: document.getElementById('bookIsbn').value,
    title: document.getElementById('bookTitle').value,
    author: document.getElementById('bookAuthor').value,
    publisher: document.getElementById('bookPublisher').value,
    publication_date: document.getElementById('bookPubDate').value,
    category: document.getElementById('bookCategory').value,
    price: parseFloat(document.getElementById('bookPrice').value),
    quantity_in_stock: parseInt(document.getElementById('bookQuantity').value),
    description: document.getElementById('bookDescription').value
  };

  fetch(`${API_URL}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(book)
  })
    .then(r => r.json())
    .then(data => {
      showAlert('Book added successfully!', 'success');
      document.getElementById('bookForm').reset();
      loadBooks();
    })
    .catch(err => {
      showAlert('Error adding book: ' + err.message, 'error');
    });
}

function editBook(id) {
  alert('Edit functionality coming soon!');
}

function deleteBook(id) {
  if (confirm('Are you sure you want to delete this book?')) {
    fetch(`${API_URL}/books/${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(() => {
        showAlert('Book deleted successfully!', 'success');
        loadBooks();
      })
      .catch(err => showAlert('Error deleting book: ' + err.message, 'error'));
  }
}

// ========== CUSTOMERS ==========
function loadCustomers() {
  fetch(`${API_URL}/customers`)
    .then(r => r.json())
    .then(customers => {
      let html = '';
      customers.forEach(customer => {
        html += `
          <tr>
            <td>${customer.name}</td>
            <td>${customer.email || 'N/A'}</td>
            <td>${customer.phone || 'N/A'}</td>
            <td>${customer.city || 'N/A'}</td>
            <td>
              <button class="action-btn btn-edit" onclick="editCustomer(${customer.id})">Edit</button>
              <button class="action-btn btn-delete" onclick="deleteCustomer(${customer.id})">Delete</button>
            </td>
          </tr>
        `;
      });
      document.getElementById('customersTable').innerHTML = html;

      // Populate order customer dropdown
      let selectHtml = '<option value="">Select Customer</option>';
      customers.forEach(customer => {
        selectHtml += `<option value="${customer.id}">${customer.name}</option>`;
      });
      document.getElementById('orderCustomer').innerHTML = selectHtml;
    })
    .catch(err => console.error('Error loading customers:', err));
}

function addCustomer(e) {
  e.preventDefault();
  
  const customer = {
    name: document.getElementById('customerName').value,
    email: document.getElementById('customerEmail').value,
    phone: document.getElementById('customerPhone').value,
    address: document.getElementById('customerAddress').value,
    city: document.getElementById('customerCity').value,
    state: document.getElementById('customerState').value,
    zip_code: document.getElementById('customerZip').value
  };

  fetch(`${API_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer)
  })
    .then(r => r.json())
    .then(data => {
      showAlert('Customer added successfully!', 'success');
      document.getElementById('customerForm').reset();
      loadCustomers();
    })
    .catch(err => showAlert('Error adding customer: ' + err.message, 'error'));
}

function editCustomer(id) {
  alert('Edit functionality coming soon!');
}

function deleteCustomer(id) {
  if (confirm('Are you sure you want to delete this customer?')) {
    fetch(`${API_URL}/customers/${id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(() => {
        showAlert('Customer deleted successfully!', 'success');
        loadCustomers();
      })
      .catch(err => showAlert('Error deleting customer: ' + err.message, 'error'));
  }
}

// ========== ORDERS ==========
function loadOrders() {
  fetch(`${API_URL}/orders`)
    .then(r => r.json())
    .then(orders => {
      let html = '';
      orders.forEach(order => {
        const date = new Date(order.order_date).toLocaleDateString();
        html += `
          <tr>
            <td>#${order.id}</td>
            <td>${order.customer_name || 'N/A'}</td>
            <td>${date}</td>
            <td>$${order.total_amount.toFixed(2)}</td>
            <td><span class="status-badge">${order.status}</span></td>
            <td>
              <button class="action-btn btn-view" onclick="viewOrder(${order.id})">View</button>
              <button class="action-btn btn-edit" onclick="updateOrderStatus(${order.id})">Update</button>
            </td>
          </tr>
        `;
      });
      document.getElementById('ordersTable').innerHTML = html;
    })
    .catch(err => console.error('Error loading orders:', err));
}

function addOrderItem() {
  const container = document.getElementById('orderItemsContainer');
  const newItem = document.createElement('div');
  newItem.className = 'order-item';
  
  let selectHtml = '<option value="">Select Book</option>';
  fetch(`${API_URL}/books`)
    .then(r => r.json())
    .then(books => {
      books.forEach(book => {
        selectHtml += `<option value="${book.id}">${book.title} (ISBN: ${book.isbn})</option>`;
      });
      newItem.innerHTML = `
        <select class="orderBook" required>${selectHtml}</select>
        <input type="number" class="orderQuantity" placeholder="Quantity" min="1" required>
        <button type="button" onclick="this.parentElement.remove()" style="width: 80px; padding: 12px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">Remove</button>
      `;
      container.appendChild(newItem);
    });
}

function createOrder(e) {
  e.preventDefault();
  
  const customerId = document.getElementById('orderCustomer').value;
  const items = [];
  
  document.querySelectorAll('.order-item').forEach(item => {
    const bookId = item.querySelector('.orderBook').value;
    const quantity = parseInt(item.querySelector('.orderQuantity').value);
    if (bookId && quantity > 0) {
      items.push({ book_id: parseInt(bookId), quantity });
    }
  });

  if (items.length === 0) {
    showAlert('Please add at least one book to the order', 'error');
    return;
  }

  fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_id: parseInt(customerId), items })
  })
    .then(r => r.json())
    .then(data => {
      showAlert('Order created successfully! Order ID: ' + data.id, 'success');
      document.getElementById('orderForm').reset();
      document.getElementById('orderItemsContainer').innerHTML = `
        <div class="order-item">
          <select class="orderBook" required><option value="">Select Book</option></select>
          <input type="number" class="orderQuantity" placeholder="Quantity" min="1" required>
        </div>
      `;
      loadOrders();
    })
    .catch(err => showAlert('Error creating order: ' + err.message, 'error'));
}

function viewOrder(id) {
  fetch(`${API_URL}/orders/${id}`)
    .then(r => r.json())
    .then(order => {
      let itemsHtml = '<ul>';
      order.items.forEach(item => {
        itemsHtml += `<li>${item.title} - Qty: ${item.quantity} @ $${item.unit_price.toFixed(2)}</li>`;
      });
      itemsHtml += '</ul>';
      alert(`Order #${order.id}\nCustomer: ${order.customer_name || order.customer_email || 'N/A'}\nDate: ${new Date(order.order_date).toLocaleDateString()}\nItems:\n${itemsHtml}\nTotal: $${order.total_amount.toFixed(2)}`);
    })
    .catch(err => alert('Error viewing order: ' + err.message));
}

function updateOrderStatus(id) {
  // Remove any existing inline editor first
  const existing = document.getElementById('status-editor-' + id);
  if (existing) { existing.remove(); return; }

  // Find the row and inject a dropdown inline instead of using prompt()
  const btn = document.querySelector(`button[onclick="updateOrderStatus(${id})"]`);
  if (!btn) return;

  const editor = document.createElement('span');
  editor.id = 'status-editor-' + id;
  editor.style.marginLeft = '6px';
  editor.innerHTML =
    `<select id="status-select-${id}" style="padding:3px 6px;border-radius:4px;border:1px solid #ccc;font-size:13px">
      <option value="pending">pending</option>
      <option value="processing">processing</option>
      <option value="completed">completed</option>
      <option value="cancelled">cancelled</option>
    </select>
    <button onclick="confirmStatusUpdate(${id})"
      style="margin-left:4px;padding:3px 10px;background:#27ae60;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px">
      Save
    </button>
    <button onclick="document.getElementById('status-editor-${id}').remove()"
      style="margin-left:2px;padding:3px 8px;background:#888;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px">
      ✕
    </button>`;
  btn.parentNode.appendChild(editor);
}

function confirmStatusUpdate(id) {
  const status = document.getElementById('status-select-' + id).value;
  fetch(`${API_URL}/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
    .then(r => r.json())
    .then(() => {
      showAlert('Order #' + id + ' status updated to ' + status, 'success');
      loadOrders();
    })
    .catch(err => showAlert('Error updating order: ' + err.message, 'error'));
}

// ========== INVENTORY ==========
function loadInventory() {
  fetch(`${API_URL}/inventory`)
    .then(r => r.json())
    .then(books => {
      let html = '';
      books.forEach(book => {
        html += `
          <tr>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.quantity_in_stock}</td>
            <td>$${book.price.toFixed(2)}</td>
          </tr>
        `;
      });
      document.getElementById('inventoryTable').innerHTML = html;

      // Populate dropdown
      let selectHtml = '<option value="">Select Book</option>';
      books.forEach(book => {
        selectHtml += `<option value="${book.id}">${book.title}</option>`;
      });
      document.getElementById('inventoryBook').innerHTML = selectHtml;
    })
    .catch(err => console.error('Error loading inventory:', err));
}

function updateInventory(e) {
  e.preventDefault();
  
  const bookId = document.getElementById('inventoryBook').value;
  const quantityChange = parseInt(document.getElementById('quantityChange').value);
  const reason = document.getElementById('inventoryReason').value;

  fetch(`${API_URL}/inventory/${bookId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity_change: quantityChange, reason })
  })
    .then(r => r.json())
    .then(() => {
      showAlert('Inventory updated successfully!', 'success');
      document.getElementById('inventoryForm').reset();
      loadInventory();
    })
    .catch(err => showAlert('Error updating inventory: ' + err.message, 'error'));
}

// ========== REPORTS ==========
function loadReports() {
  // Load sales report
  fetch(`${API_URL}/reports/sales`)
    .then(r => r.json())
    .then(data => {
      let html = '<table><thead><tr><th>Date</th><th>Orders</th><th>Sales</th></tr></thead><tbody>';
      data.forEach(row => {
        html += `<tr><td>${row.date}</td><td>${row.order_count}</td><td>$${parseFloat(row.total_sales).toFixed(2)}</td></tr>`;
      });
      html += '</tbody></table>';
      document.getElementById('salesReport').innerHTML = html;
    });

  // Load inventory report
  fetch(`${API_URL}/reports/inventory`)
    .then(r => r.json())
    .then(data => {
      let html = '<table><thead><tr><th>Title</th><th>Stock Value</th></tr></thead><tbody>';
      let total = 0;
      data.forEach(row => {
        const value = parseFloat(row.stock_value);
        total += value;
        html += `<tr><td>${row.title}</td><td>$${value.toFixed(2)}</td></tr>`;
      });
      html += `<tr style="font-weight: bold; background: #f0f0f0;"><td>TOTAL INVENTORY VALUE</td><td>$${total.toFixed(2)}</td></tr>`;
      html += '</tbody></table>';
      document.getElementById('inventoryReport').innerHTML = html;
    });
}

// ========== UTILITIES ==========
function showAlert(message, type) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alert.style.position = 'fixed';
  alert.style.top = '20px';
  alert.style.right = '20px';
  alert.style.zIndex = '1000';
  alert.style.maxWidth = '400px';
  document.body.appendChild(alert);

  setTimeout(() => alert.remove(), 4000);
}
