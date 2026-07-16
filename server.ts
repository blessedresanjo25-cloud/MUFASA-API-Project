/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { 
  User, 
  LoginLog, 
  AttackLog, 
  BlockedIP, 
  Alert, 
  Report, 
  SystemSettings, 
  SecurityStats 
} from './src/types';
import {
  initFirebase,
  isFirebaseEnabled,
  getCollectionData,
  getDocumentData,
  saveDocument,
  syncCollection
} from './src/firebase_db';

const app = express();
const PORT = 3000;

app.use(express.json());

// Database file path
const DB_FILE = path.join(process.cwd(), 'server_db.json');

// Memory structures
let users: User[] = [];
let loginLogs: LoginLog[] = [];
let attackLogs: AttackLog[] = [];
let blockedIPs: BlockedIP[] = [];
let alerts: Alert[] = [];
let reports: Report[] = [];
let systemSettings: SystemSettings = {
  failedLoginThreshold: 5,
  ipBlockingDuration: 300,
  rateLimitThreshold: 100,
  rateLimitWindow: 60,
  alertEmail: 'admin@mufasa-suite.org',
  threatLowThreshold: 3,
  threatMediumThreshold: 8,
  sessionTimeout: 30
};

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

// Helper to save state to disk & Firestore
function saveDatabase() {
  try {
    const data = {
      users,
      loginLogs,
      attackLogs,
      blockedIPs,
      alerts,
      reports,
      systemSettings
    };
    // Always backup to local disk
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    
    // If Firebase is enabled, sync to Firestore asynchronously
    if (isFirebaseEnabled()) {
      Promise.all([
        syncCollection('users', users),
        syncCollection('loginLogs', loginLogs),
        syncCollection('attackLogs', attackLogs),
        syncCollection('blockedIPs', blockedIPs),
        syncCollection('alerts', alerts),
        syncCollection('reports', reports),
        saveDocument('settings', 'systemSettings', systemSettings)
      ]).then(() => {
        console.log('Database changes successfully synchronized with Firebase Firestore.');
      }).catch(err => {
        console.error('Error synchronizing changes with Firebase Firestore:', err);
      });
    }
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// Helper to load or seed state
async function loadDatabase() {
  const firebaseSuccess = initFirebase();
  if (firebaseSuccess && isFirebaseEnabled()) {
    try {
      console.log('Attempting to load database from Firebase Firestore...');
      // 1. Load users
      const dbUsers = await getCollectionData<User>('users');
      // 2. Load system settings
      const dbSettings = await getDocumentData<SystemSettings>('settings', 'systemSettings');
      
      if (dbUsers.length > 0) {
        users = dbUsers;
        console.log(`Loaded ${users.length} users from Firestore.`);
      } else {
        // Seeding database if users is empty (meaning Firestore is empty)
        await seedDatabase();
        return;
      }

      if (dbSettings) {
        systemSettings = dbSettings;
        console.log('Loaded system settings from Firestore.');
      }

      // Load logs and other arrays
      loginLogs = await getCollectionData<LoginLog>('loginLogs');
      attackLogs = await getCollectionData<AttackLog>('attackLogs');
      blockedIPs = await getCollectionData<BlockedIP>('blockedIPs');
      alerts = await getCollectionData<Alert>('alerts');
      reports = await getCollectionData<Report>('reports');

      // Sort logs by timestamp/date where appropriate
      loginLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      attackLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      reports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

      console.log('Loaded all database tables from Firestore successfully.');
      return;
    } catch (err) {
      console.error('Error loading database from Firestore, falling back to local disk:', err);
    }
  }

  // Fallback to local file system
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      users = data.users || [];
      loginLogs = data.loginLogs || [];
      attackLogs = data.attackLogs || [];
      blockedIPs = data.blockedIPs || [];
      alerts = data.alerts || [];
      reports = data.reports || [];
      systemSettings = data.systemSettings || systemSettings;
      console.log('Loaded database from disk successfully.');
      return;
    } catch (err) {
      console.error('Error parsing database file, seeding instead:', err);
    }
  }
  await seedDatabase();
}

// Generate realistic seeding logs over the last 7 days
async function seedDatabase() {
  console.log('Seeding new database...');
  
  // Seed Users
  users = [
    {
      id: 'usr_admin',
      username: 'admin',
      email: 'admin@mufasa-suite.org',
      role: 'Administrator',
      status: 'Active',
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      lastLogin: new Date().toISOString()
    },
    {
      id: 'usr_analyst',
      username: 'analyst_sarah',
      email: 'sarah.jones@mufasa-suite.org',
      role: 'Administrator',
      status: 'Active',
      createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
    },
    {
      id: 'usr_staff1',
      username: 'john_developer',
      email: 'john.d@mufasa-suite.org',
      role: 'User',
      status: 'Active',
      createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'usr_staff2',
      username: 'mary_accountant',
      email: 'mary.acc@mufasa-suite.org',
      role: 'User',
      status: 'Active',
      createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'usr_temp',
      username: 'temp_contractor',
      email: 'temp@mufasa-suite.org',
      role: 'User',
      status: 'Deactivated',
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
    }
  ];

  // Helper arrays for seed logs
  const ips = ['192.168.1.50', '203.0.113.15', '198.51.100.82', '185.220.101.5', '12.45.67.120', '192.168.1.115'];
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
  const osList = ['Windows 11', 'macOS Sonoma', 'Linux (Ubuntu)', 'iOS 17', 'Android 14'];
  const devices = ['Desktop PC', 'MacBook Pro', 'ThinkPad Laptop', 'iPhone 15', 'Samsung Galaxy S24'];

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // Generate 7 days of login logs
  let logIdCounter = 1;
  for (let d = 7; d >= 0; d--) {
    const dayTimestamp = now - d * oneDay;
    const dateObj = new Date(dayTimestamp);
    
    // Day-specific parameters to simulate random peaks
    let numLogins = 8 + Math.floor(Math.random() * 8);
    if (d === 3) numLogins += 15; // Simulate an attack spike 3 days ago

    for (let i = 0; i < numLogins; i++) {
      const hourOffset = Math.floor(Math.random() * 24);
      const logTime = new Date(dateObj.setHours(hourOffset, Math.floor(Math.random() * 60))).toISOString();
      const ip = ips[Math.floor(Math.random() * ips.length)];
      const browser = browsers[Math.floor(Math.random() * browsers.length)];
      const os = osList[Math.floor(Math.random() * osList.length)];
      const device = devices[Math.floor(Math.random() * devices.length)];

      const isFailed = Math.random() < (d === 3 ? 0.45 : 0.12); // Higher failed logins on attack spike day
      const targetUserObj = users[Math.floor(Math.random() * users.length)];
      const username = isFailed && Math.random() < 0.5 ? 'invalid_user_' + Math.floor(Math.random() * 100) : targetUserObj.username;

      loginLogs.push({
        id: `log_${logIdCounter++}`,
        userId: isFailed || username !== targetUserObj.username ? null : targetUserObj.id,
        username,
        timestamp: logTime,
        ipAddress: ip,
        browser,
        device,
        os,
        status: isFailed ? 'Failed' : 'Success',
        failureReason: isFailed ? (username !== targetUserObj.username ? 'User not found' : 'Incorrect password') : null
      });
    }
  }

  // Seed Attack Logs
  attackLogs = [
    {
      id: 'att_1',
      type: 'Brute Force',
      timestamp: new Date(now - 3 * oneDay).toISOString(),
      ipAddress: '185.220.101.5',
      username: 'admin',
      details: 'Detected 8 failed login attempts within 45 seconds targeting admin account.',
      severity: 'High'
    },
    {
      id: 'att_2',
      type: 'Credential Stuffing',
      timestamp: new Date(now - 3 * oneDay + 10000).toISOString(),
      ipAddress: '185.220.101.5',
      username: null,
      details: 'Detected login attempts targeting 12 distinct usernames within 60 seconds.',
      severity: 'High'
    },
    {
      id: 'att_3',
      type: 'Blocked IP Attempt',
      timestamp: new Date(now - 2 * oneDay).toISOString(),
      ipAddress: '185.220.101.5',
      username: 'john_developer',
      details: 'Unauthorized login attempt from blocked IP address.',
      severity: 'Medium'
    },
    {
      id: 'att_4',
      type: 'Rate Limit Violation',
      timestamp: new Date(now - 1 * oneDay).toISOString(),
      ipAddress: '109.23.45.166',
      username: null,
      details: 'IP exceeded rate limit with 145 requests in 60 seconds.',
      severity: 'Low'
    }
  ];

  // Seed Blocked IPs
  blockedIPs = [
    {
      id: 'blk_1',
      ipAddress: '185.220.101.5',
      blockedAt: new Date(now - 3 * oneDay).toISOString(),
      blockedUntil: new Date(now + 2 * 365 * oneDay).toISOString(), // Blocked long term
      reason: 'Brute Force & Credential Stuffing detected on 2026-07-11',
      status: 'Active'
    },
    {
      id: 'blk_2',
      ipAddress: '109.23.45.166',
      blockedAt: new Date(now - 1 * oneDay).toISOString(),
      blockedUntil: new Date(now - 1 * oneDay + 300000).toISOString(), // Already expired
      reason: 'Rate limit violation',
      status: 'Unblocked'
    }
  ];

  // Seed Alerts
  alerts = [
    {
      id: 'al_1',
      title: 'Brute Force Attack Blocked',
      message: 'IP Address 185.220.101.5 has been blocked after 8 failed login attempts.',
      timestamp: new Date(now - 3 * oneDay).toISOString(),
      severity: 'High',
      isRead: true
    },
    {
      id: 'al_2',
      title: 'Credential Stuffing Warning',
      message: 'IP 185.220.101.5 attempted to log in with multiple usernames in a short window.',
      timestamp: new Date(now - 3 * oneDay + 10000).toISOString(),
      severity: 'High',
      isRead: true
    },
    {
      id: 'al_3',
      title: 'Blocked IP Attempt Registered',
      message: 'A login request from blocked IP 185.220.101.5 was denied.',
      timestamp: new Date(now - 2 * oneDay).toISOString(),
      severity: 'Medium',
      isRead: false
    }
  ];

  // Seed Reports
  reports = [
    {
      id: 'rep_1',
      type: 'Weekly',
      generatedAt: new Date(now - 2 * oneDay).toISOString(),
      rangeStart: new Date(now - 9 * oneDay).toISOString(),
      rangeEnd: new Date(now - 2 * oneDay).toISOString(),
      notes: 'Weekly audit report. Highlighted high-volume scanning from 185.220.101.5 which was successfully contained by MUFASA API Security Suite.',
      data: {
        successfulLogins: 98,
        failedLogins: 24,
        blockedIPs: 1,
        suspiciousIPs: 3,
        mostTargetedUser: 'admin',
        mostActiveIP: '203.0.113.15',
        threatLevel: 'Medium',
        securityScore: 88
      }
    }
  ];

  saveDatabase();
}

// Database is loaded inside startServer() below

// ==========================================
// SECURITY MONITORING ALGORITHMS & HELPERS
// ==========================================

// Helper to check if an IP is currently blocked
function checkIPBlocked(ip: string): BlockedIP | null {
  const nowStr = new Date().toISOString();
  const activeBlock = blockedIPs.find(
    b => b.ipAddress === ip && b.status === 'Active' && b.blockedUntil > nowStr
  );
  return activeBlock || null;
}

// Function to block an IP address
function blockIP(ip: string, reason: string, durationSeconds: number): BlockedIP {
  const existingBlock = blockedIPs.find(b => b.ipAddress === ip);
  const now = new Date();
  const blockedUntil = new Date(now.getTime() + durationSeconds * 1000);

  if (existingBlock) {
    existingBlock.blockedAt = now.toISOString();
    existingBlock.blockedUntil = blockedUntil.toISOString();
    existingBlock.reason = reason;
    existingBlock.status = 'Active';
    saveDatabase();
    return existingBlock;
  } else {
    const newBlock: BlockedIP = {
      id: `blk_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ipAddress: ip,
      blockedAt: now.toISOString(),
      blockedUntil: blockedUntil.toISOString(),
      reason,
      status: 'Active'
    };
    blockedIPs.unshift(newBlock);
    saveDatabase();
    return newBlock;
  }
}

// Trigger security alert
function triggerAlert(title: string, message: string, severity: 'Low' | 'Medium' | 'High'): Alert {
  const newAlert: Alert = {
    id: `al_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    title,
    message,
    timestamp: new Date().toISOString(),
    severity,
    isRead: false
  };
  alerts.unshift(newAlert);
  saveDatabase();
  return newAlert;
}

// Log an attack event
function logAttack(type: AttackLog['type'], ipAddress: string, username: string | null, details: string, severity: 'Low' | 'Medium' | 'High'): AttackLog {
  const newAttackLog: AttackLog = {
    id: `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type,
    timestamp: new Date().toISOString(),
    ipAddress,
    username,
    details,
    severity
  };
  attackLogs.unshift(newAttackLog);
  saveDatabase();
  return newAttackLog;
}

// Calculate Security Score (0 to 100) dynamically
function calculateSecurityScore(): number {
  let score = 100;
  
  // Minus points for recent failed logins, blocked IPs, active high-severity alerts
  const now = Date.now();
  const last24Hours = now - 24 * 3600 * 1000;
  
  const recentFailed = loginLogs.filter(l => l.status === 'Failed' && new Date(l.timestamp).getTime() > last24Hours).length;
  const activeBlocksCount = blockedIPs.filter(b => b.status === 'Active' && new Date(b.blockedUntil).getTime() > now).length;
  const recentAttacks = attackLogs.filter(a => new Date(a.timestamp).getTime() > last24Hours).length;
  
  score -= (recentFailed * 2); // 2 points per failed login today
  score -= (activeBlocksCount * 5); // 5 points per active block
  score -= (recentAttacks * 10); // 10 points per attack today
  
  return Math.max(0, Math.min(100, score));
}

// Calculate Threat Level dynamically
function calculateThreatLevel(): 'Low' | 'Medium' | 'High' {
  const now = Date.now();
  const last24Hours = now - 24 * 3600 * 1000;
  const recentAttacksCount = attackLogs.filter(a => new Date(a.timestamp).getTime() > last24Hours).length;
  
  if (recentAttacksCount >= systemSettings.threatMediumThreshold) {
    return 'High';
  } else if (recentAttacksCount >= systemSettings.threatLowThreshold) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// Calculate dynamic analytics data
app.get('/api/analytics/stats', (req, res) => {
  const score = calculateSecurityScore();
  const threat = calculateThreatLevel();
  const now = Date.now();
  const last24Hours = now - 24 * 3600 * 1000;
  
  const successToday = loginLogs.filter(l => l.status === 'Success' && new Date(l.timestamp).getTime() > last24Hours).length;
  const failedToday = loginLogs.filter(l => l.status === 'Failed' && new Date(l.timestamp).getTime() > last24Hours).length;
  const activeBlockedCount = blockedIPs.filter(b => b.status === 'Active' && new Date(b.blockedUntil).getTime() > now).length;
  const rateLimitViolationsToday = attackLogs.filter(a => a.type === 'Rate Limit Violation' && new Date(a.timestamp).getTime() > last24Hours).length;
  const suspiciousToday = attackLogs.filter(a => new Date(a.timestamp).getTime() > last24Hours).length;

  // Most active target user account (by failed attempts)
  const userFailMap: Record<string, number> = {};
  loginLogs.filter(l => l.status === 'Failed').forEach(l => {
    userFailMap[l.username] = (userFailMap[l.username] || 0) + 1;
  });
  let mostTargetedUser = 'None';
  let maxTargetVal = 0;
  Object.entries(userFailMap).forEach(([usr, count]) => {
    if (count > maxTargetVal) {
      maxTargetVal = count;
      mostTargetedUser = usr;
    }
  });

  // Most active IP address
  const ipMap: Record<string, number> = {};
  loginLogs.forEach(l => {
    ipMap[l.ipAddress] = (ipMap[l.ipAddress] || 0) + 1;
  });
  let mostActiveIP = 'None';
  let maxIpVal = 0;
  Object.entries(ipMap).forEach(([ip, count]) => {
    if (count > maxIpVal) {
      maxIpVal = count;
      mostActiveIP = ip;
    }
  });

  const stats: SecurityStats = {
    securityScore: score,
    threatLevel: threat,
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'Active').length,
    successfulLoginsToday: successToday,
    failedLoginsToday: failedToday,
    blockedIPsCount: activeBlockedCount,
    totalSuspiciousActivities: suspiciousToday,
    rateLimitedRequests: rateLimitViolationsToday,
    mostTargetedUser,
    mostActiveIP,
    activeSessionsCount: 2 // simulated active sessions count
  };

  res.json(stats);
});

// GET all dashboard data charts in structured series
app.get('/api/analytics/charts', (req, res) => {
  // 1. Success vs Failed logins pie
  const successfulLoginsCount = loginLogs.filter(l => l.status === 'Success').length;
  const failedLoginsCount = loginLogs.filter(l => l.status === 'Failed').length;
  const pieData = [
    { name: 'Successful', value: successfulLoginsCount },
    { name: 'Failed', value: failedLoginsCount }
  ];

  // 2. Attacks by type donut
  const attackCounts = {
    'Brute Force': attackLogs.filter(a => a.type === 'Brute Force').length,
    'Credential Stuffing': attackLogs.filter(a => a.type === 'Credential Stuffing').length,
    'Rate Limit Violation': attackLogs.filter(a => a.type === 'Rate Limit Violation').length,
    'Blocked IP Attempt': attackLogs.filter(a => a.type === 'Blocked IP Attempt').length,
  };
  const donutData = Object.entries(attackCounts).map(([type, count]) => ({
    name: type,
    value: count
  }));

  // 3. Weekly Trends & Daily login fraud attempts
  // Group by day of week or past 7 dates
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyData: any[] = [];
  const weeklyTrends: any[] = [];
  const now = Date.now();
  const oneDay = 24 * 3600 * 1000;

  for (let i = 6; i >= 0; i--) {
    const checkDate = new Date(now - i * oneDay);
    const dateStr = checkDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const dayName = daysOfWeek[checkDate.getDay()];
    
    // Filter logs matching calendar day
    const dayStart = new Date(checkDate.setHours(0,0,0,0)).getTime();
    const dayEnd = new Date(checkDate.setHours(23,59,59,999)).getTime();
    
    const successCount = loginLogs.filter(l => {
      const time = new Date(l.timestamp).getTime();
      return time >= dayStart && time <= dayEnd && l.status === 'Success';
    }).length;

    const failedCount = loginLogs.filter(l => {
      const time = new Date(l.timestamp).getTime();
      return time >= dayStart && time <= dayEnd && l.status === 'Failed';
    }).length;

    const attackCount = attackLogs.filter(a => {
      const time = new Date(a.timestamp).getTime();
      return time >= dayStart && time <= dayEnd;
    }).length;

    dailyData.push({
      date: dateStr,
      failedAttempts: failedCount,
      attacksDetected: attackCount
    });

    weeklyTrends.push({
      day: dayName,
      successful: successCount,
      failed: failedCount,
    });
  }

  // 4. Monthly bar graph (simulated historic 6 months including current logs)
  const monthlyData = [
    { month: 'Feb', success: 240, attacks: 8 },
    { month: 'Mar', success: 310, attacks: 12 },
    { month: 'Apr', success: 280, attacks: 5 },
    { month: 'May', success: 350, attacks: 15 },
    { month: 'Jun', success: 420, attacks: 21 },
    { month: 'Jul', success: successfulLoginsCount, attacks: attackLogs.length }
  ];

  res.json({
    pieData,
    donutData,
    dailyData,
    weeklyTrends,
    monthlyData
  });
});

// GET all logs (supports query filters)
app.get('/api/logs', (req, res) => {
  const { username, ipAddress, status, search, limit } = req.query;
  let filtered = [...loginLogs];

  if (username) {
    filtered = filtered.filter(l => l.username.toLowerCase().includes(String(username).toLowerCase()));
  }
  if (ipAddress) {
    filtered = filtered.filter(l => l.ipAddress.includes(String(ipAddress)));
  }
  if (status) {
    filtered = filtered.filter(l => l.status === status);
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      l => l.username.toLowerCase().includes(q) || 
           l.ipAddress.includes(q) || 
           (l.failureReason && l.failureReason.toLowerCase().includes(q))
    );
  }

  // Sort by time descending
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (limit) {
    filtered = filtered.slice(0, Number(limit));
  }

  res.json(filtered);
});

// GET attack security logs
app.get('/api/logs/attacks', (req, res) => {
  const { type, severity, search } = req.query;
  let filtered = [...attackLogs];

  if (type) {
    filtered = filtered.filter(a => a.type === type);
  }
  if (severity) {
    filtered = filtered.filter(a => a.severity === severity);
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      a => a.ipAddress.includes(q) || 
           (a.username && a.username.toLowerCase().includes(q)) || 
           a.details.toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(filtered);
});

// GET currently blocked IPs
app.get('/api/blocked-ips', (req, res) => {
  const nowStr = new Date().toISOString();
  // We return all blocked IPs so admin can see history, sorted with active blocks first
  const sorted = [...blockedIPs].sort((a, b) => {
    const aActive = a.status === 'Active' && a.blockedUntil > nowStr ? 1 : 0;
    const bActive = b.status === 'Active' && b.blockedUntil > nowStr ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime();
  });
  res.json(sorted);
});

// POST to unblock an IP
app.post('/api/blocked-ips/unblock', (req, res) => {
  const { ipAddress } = req.body;
  if (!ipAddress) {
    return res.status(400).json({ error: 'IP Address is required' });
  }

  const block = blockedIPs.find(b => b.ipAddress === ipAddress);
  if (block) {
    block.status = 'Unblocked';
    block.blockedUntil = new Date().toISOString(); // Set expiry to now
    saveDatabase();
    triggerAlert('IP Address Manual Unblocked', `IP address ${ipAddress} was manually unblocked by administrator.`, 'Low');
    res.json({ message: `IP ${ipAddress} unblocked successfully.`, block });
  } else {
    res.status(404).json({ error: 'Blocked IP record not found' });
  }
});

// POST to manually block an IP
app.post('/api/blocked-ips/block', (req, res) => {
  const { ipAddress, reason, durationSeconds } = req.body;
  if (!ipAddress || !reason) {
    return res.status(400).json({ error: 'IP Address and reason are required' });
  }

  const duration = durationSeconds || systemSettings.ipBlockingDuration;
  const block = blockIP(ipAddress, reason, duration);
  triggerAlert('IP Address Manually Blocked', `IP address ${ipAddress} manually blocked for ${duration} seconds. Reason: ${reason}`, 'Medium');
  res.json({ message: `IP ${ipAddress} blocked successfully.`, block });
});

// GET settings
app.get('/api/settings', (req, res) => {
  res.json(systemSettings);
});

// POST update settings
app.post('/api/settings', (req, res) => {
  systemSettings = {
    ...systemSettings,
    ...req.body
  };
  saveDatabase();
  triggerAlert('Security Settings Updated', 'System security settings were successfully updated by administrator.', 'Low');
  res.json({ message: 'Settings saved successfully', settings: systemSettings });
});

// GET users management
app.get('/api/users', (req, res) => {
  res.json(users);
});

// POST create/invite user
app.post('/api/users', (req, res) => {
  const { username, email, role, password } = req.body;
  if (!username || !email || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const exists = users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Username or email already exists' });
  }

  const newUser: User = {
    id: `usr_${Date.now()}`,
    username,
    email,
    role,
    status: 'Active',
    createdAt: new Date().toISOString(),
    lastLogin: null
  };

  if (password && password.trim() !== '') {
    newUser.password = password.trim();
  }

  users.push(newUser);
  saveDatabase();
  triggerAlert('New Security User Registered', `New user "${username}" was registered under role "${role}".`, 'Low');
  res.json({ message: 'User registered successfully', user: newUser });
});

// POST toggle user status
app.post('/api/users/toggle-status', (req, res) => {
  const { userId } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent disabling the core admin user
  if (user.username === 'admin') {
    return res.status(400).json({ error: 'Cannot deactivate the primary administrator account.' });
  }

  user.status = user.status === 'Active' ? 'Deactivated' : 'Active';
  saveDatabase();
  triggerAlert('User Status Altered', `User account status of "${user.username}" was set to "${user.status}".`, 'Low');
  res.json({ message: 'Status updated successfully', user });
});

// POST to reset/update user password
app.post('/api/users/reset-password', (req, res) => {
  const { userId, newPassword } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (newPassword && newPassword.trim() !== '') {
    user.password = newPassword.trim();
    saveDatabase();
    triggerAlert('User Password Updated', `Operator passcode for "${user.username}" was updated successfully.`, 'Low');
    return res.json({ message: `Passcode for "${user.username}" was updated to "${newPassword.trim()}" successfully.` });
  }

  triggerAlert('Security Password Reset Triggered', `A password reset ticket was generated for "${user.username}".`, 'Low');
  res.json({ message: `Password reset instructions sent to ${user.email} successfully.` });
});

// GET system alerts
app.get('/api/alerts', (req, res) => {
  res.json(alerts);
});

// POST mark alerts read
app.post('/api/alerts/mark-read', (req, res) => {
  alerts.forEach(a => a.isRead = true);
  saveDatabase();
  res.json({ message: 'All alerts marked as read' });
});

// ==========================================
// REPORTS GENERATION & DOWNLOAD
// ==========================================

// GET all reports
app.get('/api/reports', (req, res) => {
  res.json(reports);
});

// POST to generate report
app.post('/api/reports/generate', (req, res) => {
  const { type, notes } = req.body;
  if (!type) {
    return res.status(400).json({ error: 'Report type is required' });
  }

  const now = new Date();
  let rangeStart = new Date();
  if (type === 'Daily') {
    rangeStart.setDate(now.getDate() - 1);
  } else if (type === 'Weekly') {
    rangeStart.setDate(now.getDate() - 7);
  } else {
    rangeStart.setMonth(now.getMonth() - 1);
  }

  const successCount = loginLogs.filter(l => l.status === 'Success' && new Date(l.timestamp) >= rangeStart).length;
  const failedCount = loginLogs.filter(l => l.status === 'Failed' && new Date(l.timestamp) >= rangeStart).length;
  const activeBlocks = blockedIPs.filter(b => b.status === 'Active' && new Date(b.blockedAt) >= rangeStart).length;
  const suspiciousCount = attackLogs.filter(a => new Date(a.timestamp) >= rangeStart).length;

  // Most active target user account
  const userFailMap: Record<string, number> = {};
  loginLogs.filter(l => l.status === 'Failed' && new Date(l.timestamp) >= rangeStart).forEach(l => {
    userFailMap[l.username] = (userFailMap[l.username] || 0) + 1;
  });
  let mostTargetedUser = 'None';
  let maxTargetVal = 0;
  Object.entries(userFailMap).forEach(([usr, count]) => {
    if (count > maxTargetVal) {
      maxTargetVal = count;
      mostTargetedUser = usr;
    }
  });

  // Most active IP
  const ipMap: Record<string, number> = {};
  loginLogs.filter(l => new Date(l.timestamp) >= rangeStart).forEach(l => {
    ipMap[l.ipAddress] = (ipMap[l.ipAddress] || 0) + 1;
  });
  let mostActiveIP = 'None';
  let maxIpVal = 0;
  Object.entries(ipMap).forEach(([ip, count]) => {
    if (count > maxIpVal) {
      maxIpVal = count;
      mostActiveIP = ip;
    }
  });

  const newReport: Report = {
    id: `rep_${Date.now()}`,
    type,
    generatedAt: now.toISOString(),
    rangeStart: rangeStart.toISOString(),
    rangeEnd: now.toISOString(),
    notes: notes || `Generated ${type} security report auditing system threats.`,
    data: {
      successfulLogins: successCount,
      failedLogins: failedCount,
      blockedIPs: activeBlocks,
      suspiciousIPs: suspiciousCount,
      mostTargetedUser,
      mostActiveIP,
      threatLevel: calculateThreatLevel(),
      securityScore: calculateSecurityScore()
    }
  };

  reports.unshift(newReport);
  saveDatabase();
  triggerAlert('Security Audit Report Compiled', `A new ${type} security management report has been compiled and saved.`, 'Low');
  res.json({ message: 'Report generated successfully', report: newReport });
});

// GET endpoint to download a report as CSV
app.get('/api/reports/:id/download-csv', (req, res) => {
  const report = reports.find(r => r.id === req.params.id);
  if (!report) {
    return res.status(404).send('Report not found');
  }

  let csv = 'MUFASA API Security Suite Audit Report\n';
  csv += `Report ID,${report.id}\n`;
  csv += `Type,${report.type}\n`;
  csv += `Generated At,${report.generatedAt}\n`;
  csv += `Range,${report.rangeStart} to ${report.rangeEnd}\n`;
  csv += `Notes,"${report.notes.replace(/"/g, '""')}"\n\n`;
  
  csv += 'METRIC,VALUE\n';
  csv += `Security Score,${report.data.securityScore} / 100\n`;
  csv += `Threat Level,${report.data.threatLevel}\n`;
  csv += `Successful Logins,${report.data.successfulLogins}\n`;
  csv += `Failed Logins,${report.data.failedLogins}\n`;
  csv += `Blocked IPs,${report.data.blockedIPs}\n`;
  csv += `Suspicious Activity logs,${report.data.suspiciousIPs}\n`;
  csv += `Most Targeted User,${report.data.mostTargetedUser}\n`;
  csv += `Most Active IP,${report.data.mostActiveIP}\n`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=MUFASA_Report_${report.id}.csv`);
  res.status(200).send(csv);
});

// ==========================================
// SIMULATOR ENDPOINTS FOR ATTACK SCENARIOS
// ==========================================

// 1. Simulate Brute Force Attack
app.post('/api/simulation/brute-force', (req, res) => {
  const simIP = '192.168.42.10';
  const targetUser = req.body.username || 'admin';
  const now = new Date();

  // Create 5 failed attempts in the login log immediately to simulate rapid fire brute force
  for (let i = 0; i < 5; i++) {
    const timestamp = new Date(now.getTime() - (5 - i) * 1000).toISOString();
    loginLogs.push({
      id: `log_sim_${Date.now()}_bf_${i}`,
      userId: null,
      username: targetUser,
      timestamp,
      ipAddress: simIP,
      browser: 'Python-requests/2.31.0',
      device: 'Headless VM Server',
      os: 'CentOS Linux',
      status: 'Failed',
      failureReason: 'Incorrect password'
    });
  }

  // Trigger detection
  logAttack(
    'Brute Force',
    simIP,
    targetUser,
    `Brute Force simulation triggered: 5 failed login attempts in 5 seconds targeting account "${targetUser}".`,
    'High'
  );

  blockIP(simIP, `Brute force attack simulation targeting user "${targetUser}"`, systemSettings.ipBlockingDuration);
  
  triggerAlert(
    'MUFASA Defended: Brute Force Stopped',
    `Simulated Brute Force attack on IP ${simIP} detected. IP has been blocked for ${systemSettings.ipBlockingDuration}s.`,
    'High'
  );

  saveDatabase();
  res.json({
    message: 'Brute Force Attack simulated successfully! MUFASA detected the 5 rapid failed logins, logged the threat, issued an administrator alert, and automatically blocked IP 192.168.42.10.',
    simulatedIP: simIP
  });
});

// 2. Simulate Credential Stuffing Attack
app.post('/api/simulation/credential-stuffing', (req, res) => {
  const simIP = '192.168.42.11';
  const targetUsers = ['administrator', 'root', 'support', 'test', 'guest', 'dev_user'];
  const now = new Date();

  // Create failed attempts for multiple distinct usernames
  targetUsers.forEach((usr, i) => {
    const timestamp = new Date(now.getTime() - (targetUsers.length - i) * 1000).toISOString();
    loginLogs.push({
      id: `log_sim_${Date.now()}_cs_${i}`,
      userId: null,
      username: usr,
      timestamp,
      ipAddress: simIP,
      browser: 'Go-http-client/1.1',
      device: 'Botnet Node',
      os: 'Debian Linux',
      status: 'Failed',
      failureReason: 'User not found'
    });
  });

  // Trigger detection
  logAttack(
    'Credential Stuffing',
    simIP,
    null,
    `Credential Stuffing simulation triggered: IP attempted logins on ${targetUsers.length} distinct usernames in a 6-second interval.`,
    'High'
  );

  blockIP(simIP, 'Credential Stuffing attack simulation with multiple target usernames', systemSettings.ipBlockingDuration * 2);
  
  triggerAlert(
    'MUFASA Defended: Credential Stuffing Contained',
    `Simulated Credential Stuffing attack on IP ${simIP} detected. Bot signatures matched; IP blocked for ${systemSettings.ipBlockingDuration * 2}s.`,
    'High'
  );

  saveDatabase();
  res.json({
    message: 'Credential Stuffing simulated successfully! MUFASA detected that IP 192.168.42.11 was trying multiple distinct, dictionary usernames, triggered bot defense algorithms, logged a High severity attack log, and blocked the IP.',
    simulatedIP: simIP
  });
});

// 3. Simulate Rate Limit Violations (Excessive Requests)
app.post('/api/simulation/rate-limit', (req, res) => {
  const simIP = '192.168.42.12';
  
  // Log an excessive rate-limit infraction
  logAttack(
    'Rate Limit Violation',
    simIP,
    null,
    `IP exceeded rate limit thresholds by executing 185 requests within 60 seconds (Limit: ${systemSettings.rateLimitThreshold} requests).`,
    'Low'
  );

  blockIP(simIP, 'Excessive requests (Rate limit violation)', 60); // block for short duration
  
  triggerAlert(
    'Rate Limiter Triggered',
    `IP address ${simIP} exceeded the configured threshold of ${systemSettings.rateLimitThreshold} rpm and is locked out.`,
    'Low'
  );

  saveDatabase();
  res.json({
    message: 'Rate Limit Violation simulated successfully! IP 192.168.42.12 has been temporary locked out from the API and logged under Low severity alerts.',
    simulatedIP: simIP
  });
});

// 4. Simulate Blocked IP Attempts
app.post('/api/simulation/blocked-ip', (req, res) => {
  const simIP = '192.168.42.20';
  
  // Force block the IP first if not blocked
  blockIP(simIP, 'Simulated permanently banned hostile IP address', 999999);

  // Attempt to access again
  logAttack(
    'Blocked IP Attempt',
    simIP,
    'john_developer',
    'Simulated attempt to submit credentials from an actively banned IP address.',
    'Medium'
  );

  triggerAlert(
    'Security Blockade Breached Attempt',
    `Hostile IP ${simIP} attempted to hit the authenticate route but was dropped instantly.`,
    'Medium'
  );

  saveDatabase();
  res.json({
    message: 'Banned IP access attempt simulated! MUFASA instantly detected IP 192.168.42.20 was blacklisted, rejected the session submission, logged an Attack Log, and notified administrators.',
    simulatedIP: simIP
  });
});

// ==========================================
// GEMINI INTEL SECURITY SUMMARY (AI THREAT DETECT)
// ==========================================

// AI audit endpoint using @google/genai
app.post('/api/gemini/analyze-logs', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      summary: '🤖 **AI Security Analyzer Note**: To enable real-time Gemini AI Security Assessments and audit reports, configure a standard `GEMINI_API_KEY` in the application **Settings > Secrets** panel.\n\n*Simulated Assessment*: System shows an average security score of 92%. The primary hostile vectors originate from dictionary brute-force scans on administrator credentials. Recommendation: Enable two-factor authentication (2FA) and shorten brute-force block duration for immediate mitigation.'
    });
  }

  try {
    // Compile recent data to pass to Gemini
    const lastLogs = loginLogs.slice(0, 15).map(l => ({
      time: l.timestamp,
      user: l.username,
      ip: l.ipAddress,
      status: l.status,
      failReason: l.failureReason
    }));

    const lastAttacks = attackLogs.slice(0, 10).map(a => ({
      time: a.timestamp,
      type: a.type,
      ip: a.ipAddress,
      details: a.details,
      severity: a.severity
    }));

    const activeBlocks = blockedIPs.filter(b => b.status === 'Active').map(b => b.ipAddress);

    const prompt = `
You are MUFASA AI, a highly specialized cybersecurity audit assistant.
Analyze the following security telemetry logs from our API Security Suite:

1. RECENT LOGIN LOGS:
${JSON.stringify(lastLogs, null, 2)}

2. ATTACKS DETECTED:
${JSON.stringify(lastAttacks, null, 2)}

3. CURRENT ACTIVE BANNED IPS:
${JSON.stringify(activeBlocks, null, 2)}

Please provide a highly professional, concise, and structured Security Threat Posture Summary for the Administrator. Do not exceed 300 words. Address the following:
1. Threat Overview: What are the main attack vectors currently occurring (e.g., brute force, stuffing)?
2. Impact Analysis: What is our security posture (Active bans, failed attempts ratios)?
3. Practical Mitigations: Provide 3-4 specific, actionable tips to further secure the endpoint (including concept improvements like Fail2ban, FastAPI Limiter, or OWASP principles).

Use clean Markdown layout. Avoid self-praising or marketing slogans. Keep it analytical and objective.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const summaryText = response.text || 'Unable to generate analysis content.';
    res.json({ summary: summaryText });
  } catch (err: any) {
    console.error('Gemini call error:', err);
    res.json({
      summary: `🤖 **AI Security Analyzer encountered an error**: ${err.message || err}. Ensure your API Key is valid and authorized for "gemini-3.5-flash".`
    });
  }
});

// ==========================================
// REAL AUTHENTICATION ROUTE (SIMULATED ENDPOINT WITH VALIDATION)
// ==========================================

// Authenticate Administrator / Standard User
app.post('/api/auth/login', (req, res) => {
  const { username, password, ipAddress } = req.body;
  const userIP = ipAddress || req.ip || '127.0.0.1';

  // 1. Validate inputs
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // 2. Check if IP is blocked
  const activeBlock = checkIPBlocked(userIP);
  if (activeBlock) {
    // Record attack block attempt
    logAttack(
      'Blocked IP Attempt',
      userIP,
      username,
      `Blocked IP ${userIP} attempted login for user "${username}" (Denied automatically).`,
      'Medium'
    );
    triggerAlert(
      'Blocked IP Access Rejected',
      `Blocked IP ${userIP} was rejected attempting to authenticate as "${username}".`,
      'Medium'
    );
    return res.status(403).json({ error: `Access denied. Your IP address [${userIP}] is blocked until ${new Date(activeBlock.blockedUntil).toLocaleString()} due to: ${activeBlock.reason}.` });
  }

  // Check rate limiting (excessive requests in memory helper)
  const lastMinute = Date.now() - 60 * 1000;
  const recentRequestsFromIP = loginLogs.filter(l => l.ipAddress === userIP && new Date(l.timestamp).getTime() > lastMinute).length;
  if (recentRequestsFromIP >= systemSettings.rateLimitThreshold) {
    logAttack('Rate Limit Violation', userIP, username, `Excessive requests: IP hit ${recentRequestsFromIP} auth requests within 60s.`, 'Low');
    blockIP(userIP, 'Rate limit threshold exceeded during authentication requests', 60);
    triggerAlert('Rate Limit Ban Applied', `Rate limiting triggered for IP ${userIP} due to excessive logins.`, 'Low');
    return res.status(429).json({ error: 'Rate limit exceeded. Too many login attempts from this connection. Please try again in 1 minute.' });
  }

  // Find User
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!user) {
    // Record failed login (User not found)
    loginLogs.unshift({
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: null,
      username,
      timestamp: new Date().toISOString(),
      ipAddress: userIP,
      browser: 'Web App Browser',
      device: 'User Device',
      os: 'Standard OS',
      status: 'Failed',
      failureReason: 'User not found'
    });
    saveDatabase();

    // Check credential stuffing (Many usernames tried from same IP)
    const distinctUsersTried = new Set(
      loginLogs
        .filter(l => l.ipAddress === userIP && new Date(l.timestamp).getTime() > lastMinute)
        .map(l => l.username)
    );

    if (distinctUsersTried.size >= 4) {
      logAttack(
        'Credential Stuffing',
        userIP,
        null,
        `Credential Stuffing attempt: IP hit ${distinctUsersTried.size} distinct usernames within 60 seconds.`,
        'High'
      );
      blockIP(userIP, 'Credential stuffing threat detection pattern triggered', systemSettings.ipBlockingDuration * 2);
      triggerAlert('Credential Stuffing Block Imposed', `Hostile Credential stuffing blocked from IP ${userIP}. Banned.`, 'High');
      return res.status(403).json({ error: `Security blockade: Credential stuffing patterns detected from IP [${userIP}]. Banned.` });
    }

    return res.status(401).json({ error: 'Invalid security credentials.' });
  }

  // Verify deactivated user
  if (user.status === 'Deactivated') {
    loginLogs.unshift({
      id: `log_${Date.now()}`,
      userId: user.id,
      username,
      timestamp: new Date().toISOString(),
      ipAddress: userIP,
      browser: 'Web App Browser',
      device: 'User Device',
      os: 'Standard OS',
      status: 'Failed',
      failureReason: 'Account deactivated'
    });
    saveDatabase();
    return res.status(403).json({ error: 'This user account is deactivated by the administrator.' });
  }

  // Authenticate simple password check
  // For standard demonstration, passwords are: admin -> admin123, other accounts -> user123
  let isCorrectPassword = false;
  if (user.password && user.password.trim() !== '') {
    isCorrectPassword = password === user.password;
  } else {
    isCorrectPassword = (username === 'admin' && password === 'admin123') || 
                        (username === 'analyst_sarah' && password === 'sarah123') ||
                        (username !== 'admin' && username !== 'analyst_sarah' && password === 'user123');
  }

  if (!isCorrectPassword) {
    // Record failure
    loginLogs.unshift({
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: user.id,
      username,
      timestamp: new Date().toISOString(),
      ipAddress: userIP,
      browser: 'Web App Browser',
      device: 'User Device',
      os: 'Standard OS',
      status: 'Failed',
      failureReason: 'Incorrect password'
    });
    saveDatabase();

    // Evaluate Brute Force threshold
    const recentFailedAttempts = loginLogs.filter(
      l => l.ipAddress === userIP && 
           l.status === 'Failed' && 
           new Date(l.timestamp).getTime() > lastMinute
    ).length;

    if (recentFailedAttempts >= systemSettings.failedLoginThreshold) {
      logAttack(
        'Brute Force',
        userIP,
        username,
        `Brute Force trigger: ${recentFailedAttempts} failed logins in under 60 seconds targeting user "${username}".`,
        'High'
      );
      blockIP(userIP, `Brute force targeting "${username}" after ${recentFailedAttempts} failed tries`, systemSettings.ipBlockingDuration);
      triggerAlert(
        'Hostile Brute Force Contained',
        `Hostile brute force from IP ${userIP} targeting user "${username}" was locked out and banned.`,
        'High'
      );
      return res.status(403).json({ error: `Security alert: Too many failed login attempts. Your IP [${userIP}] is banned for ${systemSettings.ipBlockingDuration} seconds.` });
    }

    return res.status(401).json({ error: 'Invalid security credentials.' });
  }

  // Success login!
  user.lastLogin = new Date().toISOString();
  loginLogs.unshift({
    id: `log_${Date.now()}`,
    userId: user.id,
    username: user.username,
    timestamp: user.lastLogin,
    ipAddress: userIP,
    browser: 'Chrome 126.0',
    device: 'User Personal Laptop',
    os: 'Windows 11',
    status: 'Success',
    failureReason: null
  });
  
  saveDatabase();
  res.json({
    message: 'Authenticated successfully',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }
  });
});

// ==========================================
// SERVING FRONTEND VITE MIDDLEWARE
// ==========================================

async function startServer() {
  // Load database from Firestore/disk before starting server
  await loadDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html for SPA support
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MUFASA API Security Suite running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
