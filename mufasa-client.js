/**
 * MUFASA API Security Suite - Universal Client SDK & Handshake Module
 * Version: 1.2.0
 * 
 * Works out-of-the-box in:
 * - Node.js (Express, Fastify, Nest, Koa)
 * - Next.js (App Router, API routes, Edge middleware)
 * - Browser / Frontend vanilla JS
 * - Zero external dependencies (uses standard Fetch API)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MufasaClient = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class MufasaClient {
    /**
     * @param {Object} options
     * @param {string} options.apiUrl - Base URL of your MUFASA API (e.g. "https://my-mufasa.run.app" or "http://localhost:3000")
     * @param {string} [options.apiKey] - Your MUFASA API Secret Key
     * @param {string} [options.appName] - Name of your website or app
     * @param {string} [options.appUrl] - Public URL of your website
     * @param {string} [options.environment="production"] - Environment ("production" | "staging" | "development")
     * @param {number} [options.syncIntervalSeconds=120] - Frequency in seconds to refresh policies and IP blacklists
     */
    constructor(options = {}) {
      if (!options.apiUrl) {
        throw new Error('[MUFASA SDK] apiUrl is required (e.g., "https://your-mufasa-service.run.app")');
      }

      this.apiUrl = options.apiUrl.replace(/\/+$/, '');
      this.apiKey = options.apiKey || 'mufasa_live_' + Math.random().toString(36).substring(2, 12);
      this.appName = options.appName || 'Client Application';
      this.appUrl = options.appUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      this.environment = options.environment || 'production';
      this.syncIntervalSeconds = options.syncIntervalSeconds || 120;

      this.handshakeToken = null;
      this.isConnected = false;
      this.activeBlacklist = new Set();
      this.securityPolicies = null;
      this.lastHeartbeat = null;
      this._syncTimer = null;
    }

    /**
     * Initiates the bidirectional cryptographic handshake with the MUFASA Security Suite.
     * Synchronizes security policies and retrieves active IP blacklists.
     * @returns {Promise<Object>} Handshake response payload
     */
    async handshake() {
      try {
        const response = await fetch(`${this.apiUrl}/api/v1/handshake`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-MUFASA-API-KEY': this.apiKey
          },
          body: JSON.stringify({
            appName: this.appName,
            appUrl: this.appUrl,
            apiKey: this.apiKey,
            environment: this.environment,
            sdkVersion: '1.2.0'
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Handshake failed with HTTP status ${response.status}`);
        }

        const data = await response.json();
        this.handshakeToken = data.handshakeToken;
        this.isConnected = true;
        this.securityPolicies = data.securityPolicies || {};
        this.lastHeartbeat = new Date();

        if (Array.isArray(data.activeBlacklist)) {
          this.activeBlacklist = new Set(data.activeBlacklist);
        }

        // Start background heartbeat sync if not already active
        this._startSyncScheduler();

        console.log(`[MUFASA SDK] Handshake established successfully with MUFASA Security Suite (${data.suiteVersion})`);
        return data;
      } catch (error) {
        console.error('[MUFASA SDK] Handshake error:', error.message || error);
        throw error;
      }
    }

    /**
     * Pre-Flight Check: Evaluates whether an incoming IP or request should be ALLOWED, BLOCKED, or CHALLENGED.
     * Performs fast local cache verification and queries MUFASA.
     * 
     * @param {Object} context
     * @param {string} context.ipAddress - Inbound user IP address
     * @param {string} [context.username] - Optional targeted username
     * @param {string} [context.userAgent] - Optional user agent string
     * @returns {Promise<{ decision: "ALLOW" | "BLOCK" | "CHALLENGE", reason?: string, blockedUntil?: string }>}
     */
    async verify(context = {}) {
      const ip = context.ipAddress || (typeof context === 'string' ? context : null);
      if (!ip) {
        return { decision: 'ALLOW', reason: 'No IP provided' };
      }

      // Fast edge check: local blacklist
      if (this.activeBlacklist.has(ip)) {
        return {
          decision: 'BLOCK',
          reason: 'IP is currently blacklisted in local edge security cache.'
        };
      }

      try {
        const response = await fetch(`${this.apiUrl}/api/v1/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-MUFASA-TOKEN': this.handshakeToken || '',
            'X-MUFASA-API-KEY': this.apiKey
          },
          body: JSON.stringify({
            handshakeToken: this.handshakeToken,
            apiKey: this.apiKey,
            ipAddress: ip,
            username: context.username || null,
            userAgent: context.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Server-Agent')
          })
        });

        if (!response.ok) {
          // Fail open with warning on connection issues so user's site is never brought down
          return { decision: 'ALLOW', reason: 'Fallback to allow on verification timeout' };
        }

        const result = await response.json();
        if (result.decision === 'BLOCK') {
          this.activeBlacklist.add(ip);
        }
        return result;
      } catch (err) {
        console.warn('[MUFASA SDK] Verification network error, failing open:', err.message);
        return { decision: 'ALLOW', reason: 'Network fallback' };
      }
    }

    /**
     * Real-Time Telemetry: Reports a login attempt (Success or Failed) to MUFASA.
     * Automatically triggers MUFASA's brute-force, credential stuffing, and bot detection rules.
     * 
     * @param {Object} event
     * @param {string} event.ipAddress - User IP address
     * @param {string} event.username - Username attempted
     * @param {"Success" | "Failed"} event.status - Outcome of login
     * @param {string} [event.failureReason] - Reason for failure (e.g., "Incorrect password", "User not found")
     * @param {string} [event.device] - Device name or model
     * @param {string} [event.browser] - Browser name
     * @param {string} [event.os] - Operating system
     * @returns {Promise<Object>} Telemetry ingestion result
     */
    async reportLogin(event) {
      if (!event.ipAddress || !event.username || !event.status) {
        throw new Error('[MUFASA SDK] ipAddress, username, and status are required for reportLogin');
      }

      try {
        const response = await fetch(`${this.apiUrl}/api/v1/telemetry`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-MUFASA-TOKEN': this.handshakeToken || '',
            'X-MUFASA-API-KEY': this.apiKey
          },
          body: JSON.stringify({
            handshakeToken: this.handshakeToken,
            apiKey: this.apiKey,
            ipAddress: event.ipAddress,
            username: event.username,
            status: event.status,
            failureReason: event.failureReason || null,
            userAgent: event.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
            device: event.device || 'Web Client',
            browser: event.browser || 'Web Browser',
            os: event.os || 'Universal OS'
          })
        });

        const data = await response.json();
        // If MUFASA auto-blocked this IP as a result of this login, update local edge blacklist immediately
        if (data && data.ipBlocked) {
          this.activeBlacklist.add(event.ipAddress);
        }
        return data;
      } catch (err) {
        console.warn('[MUFASA SDK] Failed to dispatch login telemetry:', err.message);
        return { recorded: false, error: err.message };
      }
    }

    /**
     * Periodic Sync: Refreshes active blacklists and heartbeat with MUFASA.
     */
    async sync() {
      try {
        const url = new URL(`${this.apiUrl}/api/v1/sync`);
        if (this.handshakeToken) url.searchParams.set('token', this.handshakeToken);

        const response = await fetch(url.toString(), {
          headers: { 'X-MUFASA-API-KEY': this.apiKey }
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.activeBlacklist)) {
            this.activeBlacklist = new Set(data.activeBlacklist);
          }
          if (data.securityPolicies) {
            this.securityPolicies = data.securityPolicies;
          }
          this.lastHeartbeat = new Date();
          return data;
        }
      } catch (err) {
        console.warn('[MUFASA SDK] Background sync heartbeat error:', err.message);
      }
      return null;
    }

    _startSyncScheduler() {
      if (this._syncTimer) clearInterval(this._syncTimer);
      this._syncTimer = setInterval(() => {
        this.sync();
      }, this.syncIntervalSeconds * 1000);
    }

    /**
     * Express.js Middleware Helper:
     * Drop this into your Express app to protect your authentication or sensitive routes.
     * 
     * Usage:
     * app.use('/api/auth/login', mufasa.expressMiddleware());
     */
    expressMiddleware() {
      return async (req, res, next) => {
        // Extract real IP behind reverse proxies/Cloudflare
        const clientIp = (
          req.headers['cf-connecting-ip'] ||
          req.headers['x-real-ip'] ||
          (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
          req.socket?.remoteAddress ||
          req.ip ||
          '127.0.0.1'
        );

        const check = await this.verify({
          ipAddress: clientIp,
          username: req.body?.username || null,
          userAgent: req.headers['user-agent']
        });

        if (check.decision === 'BLOCK') {
          return res.status(403).json({
            error: 'Access Blocked by MUFASA Security Suite',
            reason: check.reason || 'Hostile activity detected from this IP address.',
            blockedUntil: check.blockedUntil || null
          });
        }

        req.mufasa = {
          clientIp,
          decision: check.decision,
          report: (status, username, failureReason) => {
            return this.reportLogin({
              ipAddress: clientIp,
              username: username || req.body?.username || 'unknown',
              status,
              failureReason,
              userAgent: req.headers['user-agent']
            });
          }
        };

        next();
      };
    }
  }

  return MufasaClient;
});
