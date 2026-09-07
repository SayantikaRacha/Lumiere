const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Store orders in a JSON file
const ordersFile = path.join(__dirname, 'orders.json');

// Helper function to read orders
function readOrders() {
  try {
    if (fs.existsSync(ordersFile)) {
      const data = fs.readFileSync(ordersFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading orders:', err);
  }
  return [];
}

// Helper function to save orders
function saveOrders(orders) {
  try {
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving orders:', err);
    return false;
  }
}

// Validation function
function validateOrder(data) {
  const errors = [];
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push('Please provide a valid email address');
  }
  
  if (!data.service) {
    errors.push('Please select a service');
  }
  
  if (!data.description || data.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  
  return errors;
}

// API Routes

// POST - Submit a new order
app.post('/api/submit-order', (req, res) => {
  const { name, email, service, description } = req.body;

  // Validate input
  const errors = validateOrder({ name, email, service, description });
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }

  // Create order object
  const order = {
    id: Date.now(),
    name,
    email,
    service,
    description,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  // Save order
  const orders = readOrders();
  orders.push(order);
  
  if (saveOrders(orders)) {
    // Log the submission
    console.log(`✓ New order received from ${name} (${email})`);
    
    // In production, you would send an email here using nodemailer
    // For now, we'll just return success
    
    return res.status(201).json({
      success: true,
      message: 'Your request has been received! We\'ll get back to you within 24 hours.',
      orderId: order.id
    });
  } else {
    return res.status(500).json({
      success: false,
      message: 'There was an error processing your request. Please try again.'
    });
  }
});

// GET - Retrieve all orders (admin only - in production, add authentication)
app.get('/api/orders', (req, res) => {
  const orders = readOrders();
  res.json({ success: true, orders, count: orders.length });
});

// GET - Retrieve specific order
app.get('/api/orders/:id', (req, res) => {
  const orders = readOrders();
  const order = orders.find(o => o.id === parseInt(req.params.id));
  
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  
  res.json({ success: true, order });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lumière backend is running' });
});

// Serve static files (the HTML)
app.use(express.static(__dirname));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🌟 Lumière backend running on http://localhost:${PORT}`);
  console.log(`📝 Submit orders at http://localhost:${PORT}/api/submit-order`);
  console.log(`📋 View orders at http://localhost:${PORT}/api/orders\n`);
});
