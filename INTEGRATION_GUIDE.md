# MUFASA API Security Suite - Website Handshake & Integration Guide

This guide walks you through connecting any website, frontend, or backend server with your **MUFASA API Security Suite** using the universal handshake protocol.

---

## 1. How the Handshake & Sync Works

```
+--------------------------+                         +-----------------------------------+
|  Client Website / Server |                         |  MUFASA Security Suite API        |
+--------------------------+                         +-----------------------------------+
             |                                                         |
             |   1. POST /api/v1/handshake (appName, appUrl, apiKey)   |
             |-------------------------------------------------------->| (Validates credentials,
             |                                                         |  issues handshake token,
             |   2. 200 OK (handshakeToken, policies, activeBlacklist) |  syncs active blacklist)
             |<--------------------------------------------------------|
             |                                                         |
             |                                                         |
[On User     |   3. POST /api/v1/verify (ipAddress, username)          |
 Login Page] |-------------------------------------------------------->| (Evaluates IP blacklist &
             |   4. Response: { decision: "ALLOW" | "BLOCK" }          |  rate limit thresholds)
             |<--------------------------------------------------------|
             |                                                         |
             |                                                         |
[After User  |   5. POST /api/v1/telemetry (status: Success/Failed)    |
 Login]      |-------------------------------------------------------->| (Ingests log, tracks sliding-
             |   6. Response: { recorded: true, ipBlocked: boolean }   |  window attacks, auto-bans IP
             |<--------------------------------------------------------|  if brute-force detected)
             |                                                         |
```

---

## 2. Option A: Node.js / Express Backend Integration

Copy `mufasa-client.js` into your project (or download it directly from the MUFASA UI):

```javascript
// server.js in your website's backend
const express = require('express');
const MufasaClient = require('./mufasa-client');

const app = express();
app.use(express.json());

// 1. Initialize MUFASA Client
const mufasa = new MufasaClient({
  apiUrl: 'https://ais-dev-tjxlhopvrfjtqxg4cqxqgk-201005637205.europe-west3.run.app', // Your MUFASA URL
  apiKey: 'mufasa_live_sec_your_secret_key',
  appName: 'My E-Commerce Website',
  appUrl: 'https://mywebsite.com',
  environment: 'production'
});

// 2. Perform Handshake on Server Startup
async function startApp() {
  try {
    const handshake = await mufasa.handshake();
    console.log('✅ Handshake established with MUFASA:', handshake.status);
    console.log('Active IP Blacklist synchronized:', handshake.activeBlacklist.length, 'IPs');
  } catch (err) {
    console.warn('⚠️ Handshake warning:', err.message);
  }

  app.listen(8080, () => console.log('Website running on http://localhost:8080'));
}

// 3. Protect your Login Endpoint with Pre-flight Verification & Telemetry
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // STEP 1: Verify incoming IP with MUFASA before checking credentials
  const check = await mufasa.verify({ ipAddress: clientIp, username });
  if (check.decision === 'BLOCK') {
    return res.status(403).json({
      error: 'Access blocked by security policy.',
      reason: check.reason,
      blockedUntil: check.blockedUntil
    });
  }

  // STEP 2: Authenticate user in your own database
  const user = findUserInDatabase(username);
  const isValid = user && verifyPassword(password, user.passwordHash);

  // STEP 3: Report Telemetry to MUFASA (MUFASA auto-bans IPs if brute force is detected)
  await mufasa.reportLogin({
    ipAddress: clientIp,
    username,
    status: isValid ? 'Success' : 'Failed',
    failureReason: isValid ? null : (!user ? 'User not found' : 'Incorrect password')
  });

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  return res.json({ message: 'Welcome back!', token: 'user_jwt_token' });
});

startApp();
```

---

## 3. Option B: Next.js (App Router API Route)

```typescript
// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { MufasaClient } from '@/lib/mufasa-client';

const mufasa = new MufasaClient({
  apiUrl: process.env.MUFASA_API_URL!,
  apiKey: process.env.MUFASA_API_KEY!,
  appName: 'Next.js Web Portal',
  appUrl: process.env.NEXTAUTH_URL || 'https://mywebsite.com'
});

export async function POST(req: Request) {
  const { username, password } = await req.json();
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  // 1. Verify with MUFASA
  const verify = await mufasa.verify({ ipAddress: clientIp, username });
  if (verify.decision === 'BLOCK') {
    return NextResponse.json({ error: 'IP is temporarily blocked', reason: verify.reason }, { status: 403 });
  }

  // 2. Validate user
  const isValid = username === 'alice' && password === 'secret123';

  // 3. Send telemetry back to MUFASA
  await mufasa.reportLogin({
    ipAddress: clientIp,
    username,
    status: isValid ? 'Success' : 'Failed',
    failureReason: isValid ? null : 'Incorrect password'
  });

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid login' }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
```

---

## 4. Option C: HTML / Vanilla JavaScript Frontend

You can include `mufasa-client.js` directly in your HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Login - My Website</title>
  <script src="https://ais-dev-tjxlhopvrfjtqxg4cqxqgk-201005637205.europe-west3.run.app/api/v1/sdk/download"></script>
</head>
<body>
  <form id="loginForm">
    <input type="text" id="username" placeholder="Username" required />
    <input type="password" id="password" placeholder="Password" required />
    <button type="submit">Sign In</button>
  </form>

  <script>
    const mufasa = new MufasaClient({
      apiUrl: 'https://ais-dev-tjxlhopvrfjtqxg4cqxqgk-201005637205.europe-west3.run.app',
      appName: 'Client Web Store',
      environment: 'production'
    });

    // Run handshake on load
    mufasa.handshake().then(res => {
      console.log('MUFASA Security Suite Active:', res.status);
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;

      // Optional: Client-side preflight check
      const check = await mufasa.verify({ username });
      if (check.decision === 'BLOCK') {
        alert('Your connection has been flagged by security. Access denied.');
        return;
      }

      // Proceed with your normal login...
    });
  </script>
</body>
</html>
```

---

## 5. Direct REST API Specification

If your website uses Python, PHP, Ruby, or Go, you can call the endpoints directly using standard HTTP requests:

### Handshake
- **POST** `/api/v1/handshake`
- **Body**:
  ```json
  {
    "appName": "Billing Portal",
    "appUrl": "https://billing.example.com",
    "apiKey": "mufasa_live_sec_...",
    "environment": "production"
  }
  ```

### Verify IP
- **POST** `/api/v1/verify`
- **Body**:
  ```json
  {
    "ipAddress": "198.51.100.42",
    "username": "admin"
  }
  ```

### Report Telemetry
- **POST** `/api/v1/telemetry`
- **Body**:
  ```json
  {
    "ipAddress": "198.51.100.42",
    "username": "admin",
    "status": "Failed",
    "failureReason": "Incorrect password"
  }
  ```
