import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import express from 'express';
import { HealthService } from './health.service';

// Routes all requests that start with `/health` to this controller
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // Handles HTTP requests
  @Get()
  // `@Res` injects the express `Response` object and `res` sends it back to the client
  async check(@Res() res: express.Response) {
    try {
      const dbStatus = await this.healthService.checkDatabase();
      // Status code 200 for success, 503 for failure
      const status =
        dbStatus === 'up' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

      // Response body
      return res.status(status).json({
        ok: dbStatus === 'up',
        db: dbStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        ok: false,
        db: 'down',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
