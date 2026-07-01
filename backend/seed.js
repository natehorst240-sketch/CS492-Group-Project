// seed.js — Load or clear demo data
//
// Usage:
//   node seed.js          → loads all books and customers from seed-data.json
//   node seed.js --clear  → removes only the seeded records (by ISBN/email)
//   node seed.js --reset  → clears seeded data then re-loads it

const sqlite3 = require('sqlite3').verbose();
const path    = require('path');
const fs      = require('fs');

const db       = new sqlite3.Database('./database.db');
const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf8'));
const args     = process.argv.slice(2);
const doClear  = args.includes('--clear') || args.includes('--reset');
const doLoad   = !args.includes('--clear') || args.includes('--reset');

function clearSeedData(done) {
  const bookIsbns     = seedData.books.map(b => b.isbn);
  const customerEmails = seedData.customers.map(c => c.email);

  const placeholders  = bookIsbns.map(() => '?').join(',');
  const cPlaceholders = customerEmails.map(() => '?').join(',');

  db.serialize(() => {
    db.run(`DELETE FROM books WHERE isbn IN (${placeholders})`, bookIsbns, function(err) {
      if (err) console.error('Error clearing books:', err.message);
      else     console.log(`Removed ${this.changes} seeded book(s)`);
    });

    db.run(`DELETE FROM customers WHERE email IN (${cPlaceholders})`, customerEmails, function(err) {
      if (err) console.error('Error clearing customers:', err.message);
      else     console.log(`Removed ${this.changes} seeded customer(s)`);
      if (done) done();
    });
  });
}

function loadSeedData() {
  console.log('Loading seed data...');
  let booksInserted = 0, booksSkipped = 0;
  let custsInserted = 0, custsSkipped = 0;

  db.serialize(() => {
    // Insert books
    const bookStmt = db.prepare(
      `INSERT OR IGNORE INTO books
        (isbn, title, author, publisher, publication_date, category, price, quantity_in_stock, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    seedData.books.forEach(function(b) {
      bookStmt.run(
        [b.isbn, b.title, b.author, b.publisher, b.publication_date,
         b.category, b.price, b.quantity_in_stock, b.description],
        function(err) {
          if (err)          console.error('Error inserting book:', b.title, err.message);
          else if (this.changes) booksInserted++;
          else               booksSkipped++;
        }
      );
    });

    bookStmt.finalize(function() {
      console.log(`Books:     ${booksInserted} inserted, ${booksSkipped} already existed (skipped)`);
    });

    // Insert customers
    const custStmt = db.prepare(
      `INSERT OR IGNORE INTO customers (name, email, phone, city, state) VALUES (?, ?, ?, ?, ?)`
    );

    seedData.customers.forEach(function(c) {
      custStmt.run(
        [c.name, c.email, c.phone, c.city, c.state],
        function(err) {
          if (err)           console.error('Error inserting customer:', c.name, err.message);
          else if (this.changes) custsInserted++;
          else                custsSkipped++;
        }
      );
    });

    custStmt.finalize(function() {
      console.log(`Customers: ${custsInserted} inserted, ${custsSkipped} already existed (skipped)`);
      console.log('Done.');
      db.close();
    });
  });
}

// Run
if (doClear && !doLoad) {
  clearSeedData(() => { console.log('Done.'); db.close(); });
} else if (doClear && doLoad) {
  clearSeedData(() => loadSeedData());
} else {
  loadSeedData();
}
