import { customAlphabet } from 'nanoid';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QrTokenGenerator {
  // URL-safe alphabet: A-Z, a-z, 0-9, -, _
  // Default nanoid uses this
  private readonly nanoid = customAlphabet(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
    24, // 24 characters gives ~126 bits of entropy, same as nanoid default
  );

  /**
   * Generates a cryptographically secure QR token
   * - 24 characters long
   * - URL-safe (no special characters)
   * - Lowercase letters, uppercase, digits, -, _
   *
   * Collision probability (nanoid calculator):
   * - For 1 billion tokens: 1 in ~2 trillion chance of collision
   * - Safe for most applications
   */
  generateToken(): string {
    return this.nanoid();
  }

  /**
   * Validates token format (optional, for extra safety)
   */
  isValidToken(token: string): boolean {
    // 24 chars, only valid characters
    return /^[A-Za-z0-9_-]{24}$/.test(token);
  }
}
