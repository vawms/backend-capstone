import {
  Controller,
  Request,
  Post,
  UseGuards,
  Get,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(req.user);
    this.setRefreshTokenCookie(res, tokens.refresh_token);
    return this.authService.toAccessTokenResponse(tokens);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @Post('refresh')
  async refresh(
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.getRefreshTokenFromCookie(req);
    const tokens = await this.authService.refresh(refreshToken);
    this.setRefreshTokenCookie(res, tokens.refresh_token);
    return this.authService.toAccessTokenResponse(tokens);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    this.clearRefreshTokenCookie(res);
    return this.authService.logout(req.user.userId);
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/v1/auth',
      maxAge: this.authService.getRefreshTokenMaxAgeMs(),
    });
  }

  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/v1/auth',
    });
  }

  private getRefreshTokenFromCookie(req: any): string {
    const cookieHeader = req.headers?.cookie;
    if (!cookieHeader || typeof cookieHeader !== 'string') {
      throw new UnauthorizedException('Missing refresh token');
    }

    const cookies = cookieHeader.split(';').reduce<Record<string, string>>(
      (acc, cookie) => {
        const [rawName, ...rawValueParts] = cookie.trim().split('=');
        if (!rawName || rawValueParts.length === 0) {
          return acc;
        }
        acc[rawName] = decodeURIComponent(rawValueParts.join('='));
        return acc;
      },
      {},
    );

    const refreshToken = cookies[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    return refreshToken;
  }
}
