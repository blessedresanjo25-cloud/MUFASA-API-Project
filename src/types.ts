/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'Administrator' | 'User';
  status: 'Active' | 'Deactivated';
  createdAt: string;
  lastLogin: string | null;
  password?: string;
}

export interface LoginLog {
  id: string;
  userId: string | null;
  username: string;
  timestamp: string; // ISO string
  ipAddress: string;
  browser: string;
  device: string;
  os: string;
  status: 'Success' | 'Failed';
  failureReason: string | null;
}

export interface AttackLog {
  id: string;
  type: 'Brute Force' | 'Credential Stuffing' | 'Rate Limit Violation' | 'Blocked IP Attempt';
  timestamp: string; // ISO string
  ipAddress: string;
  username: string | null;
  details: string;
  severity: 'Low' | 'Medium' | 'High';
}

export interface BlockedIP {
  id: string;
  ipAddress: string;
  blockedAt: string; // ISO string
  blockedUntil: string; // ISO string
  reason: string;
  status: 'Active' | 'Unblocked';
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  timestamp: string; // ISO string
  severity: 'Low' | 'Medium' | 'High';
  isRead: boolean;
}

export interface Report {
  id: string;
  type: 'Daily' | 'Weekly' | 'Monthly';
  generatedAt: string; // ISO string
  rangeStart: string; // ISO string
  rangeEnd: string; // ISO string
  notes: string;
  data: {
    successfulLogins: number;
    failedLogins: number;
    blockedIPs: number;
    suspiciousIPs: number;
    mostTargetedUser: string;
    mostActiveIP: string;
    threatLevel: 'Low' | 'Medium' | 'High';
    securityScore: number;
  };
}

export interface SystemSettings {
  failedLoginThreshold: number; // e.g., 5
  ipBlockingDuration: number; // in seconds, e.g., 300
  rateLimitThreshold: number; // request count, e.g., 100
  rateLimitWindow: number; // in seconds, e.g., 60
  alertEmail: string;
  threatLowThreshold: number; // e.g., 3
  threatMediumThreshold: number; // e.g., 8
  sessionTimeout: number; // in minutes, e.g., 30
}

export interface SecurityStats {
  securityScore: number;
  threatLevel: 'Low' | 'Medium' | 'High';
  totalUsers: number;
  activeUsers: number;
  successfulLoginsToday: number;
  failedLoginsToday: number;
  blockedIPsCount: number;
  totalSuspiciousActivities: number;
  rateLimitedRequests: number;
  mostTargetedUser: string;
  mostActiveIP: string;
  activeSessionsCount: number;
}
