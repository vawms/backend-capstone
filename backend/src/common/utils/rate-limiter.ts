import { Injectable } from '@nestjs/common';

/**
 * Simple in-memory rate limiter for PoC
 * In production, use Redis
 *
 * Key: `{token}:{ip}`
 * Value: array of timestamps
 */
@Injectable()
export class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly windowMs = 60 * 60 * 1000; // 1 hour
  private readonly maxRequests = 5; // 5 requests per window
  private readonly cleanupInterval = 60 * 60 * 1000; // Cleanup every hour

  constructor() {
    // Periodically clean up old entries
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of this.requests.entries()) {
        const validTimestamps = timestamps.filter(
          (ts) => now - ts < this.windowMs,
        );
        if (validTimestamps.length === 0) {
          this.requests.delete(key);
        } else {
          this.requests.set(key, validTimestamps);
        }
      }
    }, this.cleanupInterval);
  }

  /**
   * Check if request is allowed
   * @param identifier Unique identifier (e.g., "qr-token:user-ip")
   * @returns true if allowed, false if rate limited
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(identifier) || [];

    // Remove timestamps older than window
    const validTimestamps = timestamps.filter((ts) => now - ts < this.windowMs);

    // Check if exceeded max requests
    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validTimestamps.push(now);
    this.requests.set(identifier, validTimestamps);

    return true;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemaining(identifier: string): number {
    const now = Date.now();
    const timestamps = this.requests.get(identifier) || [];
    const validTimestamps = timestamps.filter((ts) => now - ts < this.windowMs);
    return Math.max(0, this.maxRequests - validTimestamps.length);
  }
}
