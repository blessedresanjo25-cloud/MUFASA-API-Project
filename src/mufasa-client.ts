/**
 * MUFASA API Security Suite - TypeScript Client SDK & Handshake Module
 * Version: 1.2.0
 */

import {
  HandshakeRequest,
  HandshakeResponse,
  VerifyDecisionRequest,
  VerifyDecisionResponse,
  TelemetryEventRequest,
  SystemSettings
} from './types';

export interface MufasaClientOptions {
  apiUrl: string;
  apiKey?: string;
  appName?: string;
  appUrl?: string;
  environment?: 'production' | 'staging' | 'development';
  syncIntervalSeconds?: number;
}

export class MufasaClient {
  public apiUrl: string;
  public apiKey: string;
  public appName: string;
  public appUrl: string;
  public environment: 'production' | 'staging' | 'development';
  public syncIntervalSeconds: number;

  public handshakeToken: string | null = null;
  public isConnected: boolean = false;
  public activeBlacklist: Set<string> = new Set();
  public securityPolicies: Partial<SystemSettings> | null = null;
  public lastHeartbeat: Date | null = null;
  private _syncTimer: any = null;

  constructor(options: MufasaClientOptions) {
    if (!options.apiUrl) {
      throw new Error('[MUFASA SDK] apiUrl is required');
    }
    this.apiUrl = options.apiUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey || 'mufasa_live_' + Math.random().toString(36).substring(2, 12);
    this.appName = options.appName || 'Client Application';
    this.appUrl = options.appUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    this.environment = options.environment || 'production';
    this.syncIntervalSeconds = options.syncIntervalSeconds || 120;
  }

  /**
   * Initiates the bidirectional cryptographic handshake with the MUFASA Security Suite.
   */
  async handshake(): Promise<HandshakeResponse> {
    try {
      const payload: HandshakeRequest = {
        appName: this.appName,
        appUrl: this.appUrl,
        apiKey: this.apiKey,
        environment: this.environment,
        sdkVersion: '1.2.0'
      };

      const response = await fetch(`${this.apiUrl}/api/v1/handshake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MUFASA-API-KEY': this.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Handshake failed with HTTP status ${response.status}`);
      }

      const data: HandshakeResponse = await response.json();
      this.handshakeToken = data.handshakeToken;
      this.isConnected = true;
      this.securityPolicies = data.securityPolicies || {};
      this.lastHeartbeat = new Date();

      if (Array.isArray(data.activeBlacklist)) {
        this.activeBlacklist = new Set(data.activeBlacklist);
      }

      this._startSyncScheduler();
      console.log(`[MUFASA SDK] Handshake established with ${data.suiteVersion}`);
      return data;
    } catch (error: any) {
      console.error('[MUFASA SDK] Handshake failed:', error.message || error);
      throw error;
    }
  }

  /**
   * Pre-Flight Check: Evaluates whether an incoming IP or request should be ALLOWED or BLOCKED.
   */
  async verify(context: { ipAddress: string; username?: string; userAgent?: string }): Promise<VerifyDecisionResponse> {
    const ip = context.ipAddress;
    if (!ip) {
      return { decision: 'ALLOW', reason: 'No IP provided' };
    }

    if (this.activeBlacklist.has(ip)) {
      return {
        decision: 'BLOCK',
        reason: 'IP is currently blacklisted in local edge security cache.'
      };
    }

    try {
      const payload: VerifyDecisionRequest = {
        handshakeToken: this.handshakeToken || undefined,
        apiKey: this.apiKey,
        ipAddress: ip,
        username: context.username,
        userAgent: context.userAgent
      };

      const response = await fetch(`${this.apiUrl}/api/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MUFASA-TOKEN': this.handshakeToken || '',
          'X-MUFASA-API-KEY': this.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return { decision: 'ALLOW', reason: 'Fallback to allow on verification issue' };
      }

      const result: VerifyDecisionResponse = await response.json();
      if (result.decision === 'BLOCK') {
        this.activeBlacklist.add(ip);
      }
      return result;
    } catch (err: any) {
      console.warn('[MUFASA SDK] Verification network error, failing open:', err?.message);
      return { decision: 'ALLOW', reason: 'Network fallback' };
    }
  }

  /**
   * Real-Time Telemetry: Reports a login attempt to MUFASA to trigger threat detection.
   */
  async reportLogin(event: {
    ipAddress: string;
    username: string;
    status: 'Success' | 'Failed';
    failureReason?: string | null;
    userAgent?: string;
    device?: string;
    browser?: string;
    os?: string;
  }): Promise<any> {
    try {
      const payload: TelemetryEventRequest = {
        handshakeToken: this.handshakeToken || undefined,
        apiKey: this.apiKey,
        ipAddress: event.ipAddress,
        username: event.username,
        status: event.status,
        failureReason: event.failureReason,
        userAgent: event.userAgent,
        device: event.device,
        browser: event.browser,
        os: event.os
      };

      const response = await fetch(`${this.apiUrl}/api/v1/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MUFASA-TOKEN': this.handshakeToken || '',
          'X-MUFASA-API-KEY': this.apiKey
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data && data.ipBlocked) {
        this.activeBlacklist.add(event.ipAddress);
      }
      return data;
    } catch (err: any) {
      console.warn('[MUFASA SDK] Failed to dispatch login telemetry:', err?.message);
      return { recorded: false, error: err?.message };
    }
  }

  /**
   * Periodic Sync: Refreshes active blacklists and heartbeat with MUFASA.
   */
  async sync(): Promise<any> {
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
    } catch (err: any) {
      console.warn('[MUFASA SDK] Background sync heartbeat error:', err?.message);
    }
    return null;
  }

  private _startSyncScheduler() {
    if (this._syncTimer) clearInterval(this._syncTimer);
    this._syncTimer = setInterval(() => {
      this.sync();
    }, this.syncIntervalSeconds * 1000);
  }
}

export default MufasaClient;
