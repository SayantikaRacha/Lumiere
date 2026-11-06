const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_PIN = process.env.ADMIN_PIN || 'lumiere2026';

// ----------------------------------------------------
// Middleware
// ----------------------------------------------------
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static directories
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(__dirname));

// ----------------------------------------------------
// Multer Configuration (File / Image Uploads)
// ----------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `lumiere_${cleanName}_${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf'];
  if (allowedMime.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|webp|gif|svg|pdf)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload JPG, PNG, WEBP, GIF, SVG, or PDF.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 5 }, // 15MB each, max 5 files
  fileFilter
});

// ----------------------------------------------------
// SQLite Database Setup
// ----------------------------------------------------
const dbPath = path.join(__dirname, 'lumiere.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log('📦 Connected to SQLite database: lumiere.db');
  }
});

// Initialize Schema
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      service TEXT NOT NULL,
      style_preference TEXT,
      turnaround TEXT,
      budget_or_notes TEXT,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  // Migrate past orders.json if present and not already migrated
  migrateOldOrdersJson();
});

function migrateOldOrdersJson() {
  const oldOrdersFile = path.join(__dirname, 'orders.json');
  if (!fs.existsSync(oldOrdersFile)) return;

  try {
    const raw = fs.readFileSync(oldOrdersFile, 'utf8');
    const oldOrders = JSON.parse(raw);
    if (!Array.isArray(oldOrders) || oldOrders.length === 0) return;

    db.get('SELECT COUNT(*) AS count FROM orders', (err, row) => {
      if (!err && row && row.count === 0) {
        console.log(`🔄 Migrating ${oldOrders.length} legacy orders from orders.json...`);
        const stmt = db.prepare(`
          INSERT INTO orders (order_code, client_name, client_email, service, style_preference, turnaround, description, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        oldOrders.forEach((o, index) => {
          const code = `LUM-LEGACY-${index + 1}`;
          stmt.run(
            code,
            o.name || 'Anonymous',
            o.email || 'client@example.com',
            o.service || 'Custom Design',
            'Classic Aesthetic',
            'Standard',
            o.description || '',
            o.status || 'pending',
            o.createdAt || new Date().toISOString()
          );
        });
        stmt.finalize();
        console.log('✓ Legacy orders migrated successfully.');
      }
    });
  } catch (err) {
    console.warn('Note: Could not parse legacy orders.json:', err.message);
  }
}

// ----------------------------------------------------
// Validation Helper
// ----------------------------------------------------
function validateOrderPayload({ name, email, service, description }) {
  const errors = [];
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Please provide a valid email address');
  }
  if (!service || !service.trim()) {
    errors.push('Please select a service');
  }
  if (!description || description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  return errors;
}

// Helper to generate elegant order codes
function generateOrderCode() {
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `LUM-${timestamp}${randomChars}`;
}

// ----------------------------------------------------
// Admin Auth Middleware
// ----------------------------------------------------
function verifyAdmin(req, res, next) {
  const pin = req.headers['x-admin-pin'] || req.query.pin;
  if (pin && pin.trim() === ADMIN_PIN.trim()) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Unauthorized. Invalid Admin PIN.' });
}

// ----------------------------------------------------
// Public Endpoints
// ----------------------------------------------------

// Submit Order (supports multipart with file uploads OR standard JSON)
app.post('/api/submit-order', (req, res) => {
  upload.array('reference_images', 5)(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ success: false, message: uploadErr.message });
    }

    const {
      name,
      email,
      service,
      style_preference,
      turnaround,
      budget_or_notes,
      description
    } = req.body;

    const errors = validateOrderPayload({ name, email, service, description });
    if (errors.length > 0) {
      // Remove any uploaded files if validation failed
      if (req.files && req.files.length > 0) {
        req.files.forEach(f => {
          try { fs.unlinkSync(f.path); } catch (e) {}
        });
      }
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const orderCode = generateOrderCode();
    const style = style_preference || 'Minimalist Editorial';
    const turn = turnaround || 'Standard (3-5 Days)';
    const notes = budget_or_notes || '';

    const sqlOrder = `
      INSERT INTO orders (
        order_code, client_name, client_email, service,
        style_preference, turnaround, budget_or_notes, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      sqlOrder,
      [orderCode, name.trim(), email.trim(), service.trim(), style, turn, notes, description.trim()],
      function (err) {
        if (err) {
          console.error('Database error creating order:', err);
          return res.status(500).json({
            success: false,
            message: 'Unable to save order. Please try again.'
          });
        }

        const orderId = this.lastID;
        const uploadedFiles = req.files || [];

        if (uploadedFiles.length > 0) {
          const stmtFile = db.prepare(`
            INSERT INTO order_files (order_id, original_name, filename, file_path, file_size, mime_type)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          uploadedFiles.forEach(f => {
            stmtFile.run(
              orderId,
              f.originalname,
              f.filename,
              `/uploads/${f.filename}`,
              f.size,
              f.mimetype
            );
          });
          stmtFile.finalize();
        }

        console.log(`✨ [New Order ${orderCode}] from ${name} (${email}) - ${uploadedFiles.length} file(s) attached`);

        return res.status(201).json({
          success: true,
          message: 'Your request has been received! We will review it and get back to you shortly.',
          orderCode,
          orderId,
          filesReceived: uploadedFiles.length
        });
      }
    );
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Lumière Atelier Backend',
    database: 'SQLite3 (Operational)',
    timestamp: new Date().toISOString()
  });
});

// ----------------------------------------------------
// Admin Endpoints
// ----------------------------------------------------

// Verify PIN
app.post('/api/admin/verify', (req, res) => {
  const { pin } = req.body;
  if (pin && pin.trim() === ADMIN_PIN.trim()) {
    return res.json({ success: true, message: 'Access granted' });
  }
  return res.status(401).json({ success: false, message: 'Invalid Admin PIN' });
});

// Retrieve all orders with attached files
app.get('/api/admin/orders', verifyAdmin, (req, res) => {
  const { status, search } = req.query;

  let query = 'SELECT * FROM orders';
  const params = [];
  const conditions = [];

  if (status && status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }

  if (search && search.trim()) {
    conditions.push('(client_name LIKE ? OR client_email LIKE ? OR order_code LIKE ? OR description LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, orders) => {
    if (err) {
      console.error('Error querying orders:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (orders.length === 0) {
      return res.json({ success: true, orders: [], count: 0 });
    }

    // Attach file metadata for each order
    const orderIds = orders.map(o => o.id);
    const placeholders = orderIds.map(() => '?').join(',');

    db.all(`SELECT * FROM order_files WHERE order_id IN (${placeholders})`, orderIds, (fErr, files) => {
      const filesMap = {};
      if (!fErr && files) {
        files.forEach(f => {
          if (!filesMap[f.order_id]) filesMap[f.order_id] = [];
          filesMap[f.order_id].push(f);
        });
      }

      const enrichedOrders = orders.map(o => ({
        ...o,
        files: filesMap[o.id] || []
      }));

      // Calculate overview metrics
      db.all(`SELECT status, COUNT(*) AS count FROM orders GROUP BY status`, [], (sErr, counts) => {
        const stats = {
          total: orders.length,
          pending: 0,
          in_progress: 0,
          review_sent: 0,
          completed: 0,
          archived: 0
        };

        if (!sErr && counts) {
          counts.forEach(row => {
            const key = (row.status || '').replace('-', '_');
            if (stats[key] !== undefined) {
              stats[key] = row.count;
            }
          });
        }

        res.json({
          success: true,
          orders: enrichedOrders,
          stats
        });
      });
    });
  });
});

// Update order status
app.patch('/api/admin/orders/:id/status', verifyAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'in-progress', 'review-sent', 'completed', 'archived'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  db.run(
    'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, id],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to update status' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      res.json({ success: true, message: `Status updated to ${status}` });
    }
  );
});

// Update admin notes
app.patch('/api/admin/orders/:id/notes', verifyAdmin, (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  db.run(
    'UPDATE orders SET admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [notes || '', id],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to update notes' });
      }
      res.json({ success: true, message: 'Notes saved' });
    }
  );
});

// Delete an order & attached files
app.delete('/api/admin/orders/:id', verifyAdmin, (req, res) => {
  const { id } = req.params;

  // Retrieve files to delete from disk
  db.all('SELECT filename FROM order_files WHERE order_id = ?', [id], (fErr, files) => {
    if (!fErr && files && files.length > 0) {
      files.forEach(f => {
        const fullPath = path.join(uploadsDir, f.filename);
        if (fs.existsSync(fullPath)) {
          try { fs.unlinkSync(fullPath); } catch (e) {}
        }
      });
    }

    db.run('DELETE FROM orders WHERE id = ?', [id], function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to delete order' });
      }
      db.run('DELETE FROM order_files WHERE order_id = ?', [id]);
      res.json({ success: true, message: 'Order deleted successfully' });
    });
  });
});

// Export all orders as JSON
app.get('/api/admin/export', verifyAdmin, (req, res) => {
  db.all('SELECT * FROM orders ORDER BY created_at DESC', [], (err, orders) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Export failed' });
    }
    res.setHeader('Content-Disposition', `attachment; filename=lumiere_orders_export_${Date.now()}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(orders, null, 2));
  });
});

// Fallback & 404
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n✨ ==============================================`);
  console.log(`🌟 Lumière Studio backend running on http://localhost:${PORT}`);
  console.log(`📝 Order API:   http://localhost:${PORT}/api/submit-order`);
  console.log(`📊 Admin Gate:  http://localhost:${PORT}/admin.html`);
  console.log(`🔑 Default PIN: ${ADMIN_PIN}`);
  console.log(`✨ ==============================================\n`);
});
