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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  ParseUUIDPipe,
  // BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Request } from 'express';
import { IntakeService } from '../services/intake.service';
import { CreateIntakeRequestDto } from '../dto/create-intake-request.dto';
import { IntakeResponseDto } from '../dto/intake-response.dto';
import { SubmitRatingDto } from '../dto/submit-rating.dto';

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
   * POST /v1/public/intake/:id/client-media
   * Upload image files for a service request created through public intake.
   */
  @Post(':id/client-media')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(
            new BadRequestException('Only image uploads are allowed'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadClientMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const mediaFiles = files.map((file) => ({
      url: `/uploads/${file.filename}`,
      kind: 'image' as const,
    }));

    return this.intakeService.addClientMedia(id, mediaFiles);
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
   * POST /v1/public/intake/rate/:token
   * Submit a client rating for a resolved/closed service request
   */
  @Post('rate/:token')
  @HttpCode(HttpStatus.OK)
  async submitRating(
    @Param('token') token: string,
    @Body(ValidationPipe) dto: SubmitRatingDto,
  ) {
    return this.intakeService.submitRating(token, dto);
  }

  /**
   * GET /v1/public/intake/rate/:token
   * Check whether the rating token is eligible for submission
   */
  @Get('rate/:token')
  @HttpCode(HttpStatus.OK)
  async getRatingEligibility(@Param('token') token: string) {
    return this.intakeService.getRatingEligibility(token);
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
