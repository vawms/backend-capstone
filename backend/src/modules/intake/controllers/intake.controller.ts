import {
  Get,
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Req,
  // BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { IntakeService } from '../services/intake.service';
import { CreateIntakeRequestDto } from '../dto/create-intake-request.dto';
import { IntakeResponseDto } from '../dto/intake-response.dto';

@Controller('v1/public/intake')
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  /**
   * POST /v1/public/intake/:token/request
   * Create service request from QR intake form
   *
   * Body:
   * {
   *   "type": "MAINTENANCE",
   *   "description": "Server needs regular maintenance",
   *   "contact": {
   *     "name": "John Doe",
   *     "email": "john@example.com",
   *     "phone": "+1-555-0123"
   *   },
   *   "media": [
   *     { "url": "https://example.com/photo.jpg", "kind": "image" }
   *   ]
   * }
   */
  @Post(':token/request')
  @HttpCode(HttpStatus.CREATED)
  async createRequest(
    @Param('token') token: string,
    @Body(ValidationPipe) dto: CreateIntakeRequestDto,
    @Req() request: Request,
  ): Promise<IntakeResponseDto> {
    // Extract client IP (handles proxies)
    const ip = this.getClientIp(request);

    return this.intakeService.createIntakeRequest(token, ip, dto);
  }

  /**
   * Get rate limit status for a QR token
   * Useful for frontend to show remaining attempts
   *
   * GET /v1/public/intake/:token/status
   */
  @Get(':token/status')
  @HttpCode(HttpStatus.OK)
  getRateLimitStatus(@Param('token') token: string, @Req() request: Request) {
    const ip = this.getClientIp(request);
    return this.intakeService.getRateLimitStatus(token, ip);
  }

  /**
   * Helper: Extract client IP
   * Handles X-Forwarded-For header (proxies, load balancers)
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }
}
