# Lumière Backend Setup Guide

## Overview
Your Lumière website now has a full backend integration for handling order/request submissions. Orders are stored locally in a JSON file (`orders.json`).

## Requirements
- **Node.js 16+** and **npm** (required to run the backend)
- The backend server runs on `http://localhost:5000`

## Installation & Setup

### Step 1: Install Node.js
1. Download from [nodejs.org](https://nodejs.org/)
2. Choose the LTS (Long Term Support) version
3. Run the installer and follow the setup wizard
4. After installation, verify it worked by opening a terminal and running:
   ```powershell
   node --version
   npm --version
   ```

### Step 2: Install Dependencies
Once Node.js is installed, navigate to the Lumière folder and run:
```powershell
cd "c:\Users\dassa\OneDrive\Desktop\VS Code\Lumiere"
npm install
```

This will install:
- **express** - Web server framework
- **body-parser** - Parse incoming request data
- **cors** - Cross-Origin Resource Sharing (allow frontend to communicate with backend)
- **nodemailer** - For future email notifications (optional)

### Step 3: Start the Backend Server
```powershell
npm start
```

or

```powershell
node server.js
```

You should see output like:
```
🌟 Lumière backend running on http://localhost:5000
📝 Submit orders at http://localhost:5000/api/submit-order
📋 View orders at http://localhost:5000/api/orders
```

### Step 4: Open the Website
With the server running, open [http://localhost:5000](http://localhost:5000) in your browser.

## How It Works

### Form Submission Flow
1. User fills out the order form on the website
2. Form data is sent to `POST http://localhost:5000/api/submit-order`
3. Backend validates the data:
   - Name: minimum 2 characters
   - Email: valid email format
   - Service: must be selected
   - Description: minimum 10 characters
4. If valid, order is saved to `orders.json`
5. User gets a success message with confirmation
6. If invalid, user sees specific error messages

### Backend API Endpoints

#### 1. Submit a New Order (POST)
```
POST http://localhost:5000/api/submit-order
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "service": "Custom Digital Invitation",
  "description": "I need a wedding invitation with floral design"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Your request has been received! We'll get back to you within 24 hours.",
  "orderId": 1694035422000
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Email must be a valid email address, Description must be at least 10 characters"
}
```

#### 2. Get All Orders (GET)
```
GET http://localhost:5000/api/orders
```

Returns all orders stored in `orders.json`:
```json
{
  "success": true,
  "orders": [
    {
      "id": 1694035422000,
      "name": "John Doe",
      "email": "john@example.com",
      "service": "Custom Digital Invitation",
      "description": "I need a wedding invitation with floral design",
      "status": "pending",
      "createdAt": "2026-09-07T10:30:22.000Z"
    }
  ],
  "count": 1
}
```

#### 3. Get Specific Order (GET)
```
GET http://localhost:5000/api/orders/1694035422000
```

#### 4. Health Check (GET)
```
GET http://localhost:5000/api/health
```

Returns:
```json
{
  "status": "ok",
  "message": "Lumière backend is running"
}
```

## Data Storage
Orders are stored in a JSON file: `orders.json`

Example:
```json
[
  {
    "id": 1694035422000,
    "name": "Client Name",
    "email": "client@email.com",
    "service": "Invitation",
    "description": "Project details...",
    "status": "pending",
    "createdAt": "2026-09-07T10:30:22.000Z"
  }
]
```

## Frontend Features Added
✅ Form validation (client-side)
✅ Real-time error messages
✅ Loading states during submission
✅ Success/error feedback to user
✅ Theme preference persists in localStorage
✅ Proper form labels for accessibility

## Future Enhancements
1. **Email Notifications**: Use Nodemailer to email clients and admins
2. **Database**: Replace JSON file storage with MongoDB or PostgreSQL
3. **Admin Dashboard**: Create an admin panel to view and manage orders
4. **Authentication**: Add user login and order tracking
5. **File Uploads**: Allow clients to upload reference images
6. **Status Updates**: Send email notifications when order status changes

## Troubleshooting

### "npm: command not found"
→ Node.js is not installed or not added to PATH. Reinstall Node.js.

### "Cannot connect to server" error in browser
→ Make sure the backend server is running with `npm start`

### Port 5000 already in use
→ Change the PORT in `server.js` to another port (e.g., 5001)

### CORS errors in browser console
→ The `cors` middleware in `server.js` allows frontend requests. If issues persist, check browser console for details.

## Development Tips
- Keep the terminal with `npm start` running while you work
- Changes to `server.js` require restarting the server (Ctrl+C to stop, `npm start` to restart)
- Check `orders.json` file to see stored orders
- Use browser DevTools console to see any errors

---

For questions or improvements, feel free to modify `server.js` based on your needs!
