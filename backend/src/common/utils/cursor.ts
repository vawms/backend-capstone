/**
 * Cursor encoding/decoding for pagination
 * Format: base64(createdAt_iso:id)
 *
 * Example:
 * - Encode: { createdAt: new Date(), id: "550e8400-..." }
 * - Result: "MjAyNS0xMS0wMlQxNjo0NTozMC4xMjNaOjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMA=="
 * - Decode: back to original object
 */

export interface CursorData {
  createdAt: Date;
  id: string;
}

export class Cursor {
  /**
   * Encode cursor to string
   */
  static encode(data: CursorData): string {
    const payload = `${data.createdAt.toISOString()}:${data.id}`;
    return Buffer.from(payload).toString('base64');
  }

  /**
   * Decode cursor from string
   * Returns null if invalid format
   */
  static decode(cursor: string): CursorData | null {
    try {
      const payload = Buffer.from(cursor, 'base64').toString('utf-8');
      const [createdAtStr, id] = payload.split(':');

      if (!createdAtStr || !id) {
        return null;
      }

      return {
        createdAt: new Date(createdAtStr),
        id,
      };
    } catch {
      return null;
    }
  }
}
