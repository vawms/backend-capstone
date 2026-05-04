import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { ConfigService } from '../../config/config.service';
import { AuthTokenPairDto } from './dto/auth-token-pair.dto';
import type { StringValue } from 'ms';

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: UserRole;
  company_id: string;
  technician_id: string | null;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  session_version: number;
}

export interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, pass: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    return null;
  }

  async login(user: User): Promise<AuthTokenPairDto> {
    const tokens = await this.issueTokenPair(user);
    const refreshTokenHash = await bcrypt.hash(tokens.refresh_token, 10);
    const refreshTokenExpiresAt = this.getRefreshTokenExpiryDate();

    await this.usersRepository.update(user.id, {
      refresh_token_hash: refreshTokenHash,
      refresh_token_expires_at: refreshTokenExpiresAt,
    });

    return tokens;
  }

  async refresh(refreshToken: string): Promise<AuthTokenPairDto> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.jwtRefreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (
      !user.refresh_token_hash ||
      !user.refresh_token_expires_at ||
      user.refresh_token_expires_at.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    if (user.session_version !== payload.session_version) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const matches = await bcrypt.compare(refreshToken, user.refresh_token_hash);

    if (!matches) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const tokens = await this.issueTokenPair(user);
    const refreshTokenHash = await bcrypt.hash(tokens.refresh_token, 10);
    const refreshTokenExpiresAt = this.getRefreshTokenExpiryDate();

    await this.usersRepository.update(user.id, {
      refresh_token_hash: refreshTokenHash,
      refresh_token_expires_at: refreshTokenExpiresAt,
    });

    return tokens;
  }

  async logout(userId: string): Promise<{ success: true }> {
    await this.usersRepository.update(userId, {
      refresh_token_hash: null,
      refresh_token_expires_at: null,
    });

    return { success: true };
  }

  toAccessTokenResponse(tokens: AuthTokenPairDto): AccessTokenResponse {
    return {
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
    };
  }

  getRefreshTokenMaxAgeMs(): number {
    const expiresIn = this.configService.jwtRefreshExpiresIn;
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    return value * multipliers[unit];
  }

  private async issueTokenPair(user: User): Promise<AuthTokenPairDto> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      company_id: user.company_id,
      technician_id: user.technician_id,
      type: 'access',
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      type: 'refresh',
      session_version: user.session_version,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.jwtAccessSecret,
        expiresIn: this.configService.jwtAccessExpiresIn as StringValue,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.jwtRefreshSecret,
        expiresIn: this.configService.jwtRefreshExpiresIn as StringValue,
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: this.parseAccessTokenExpirySeconds(),
    };
  }

  private parseAccessTokenExpirySeconds(): number {
    const expiresIn = this.configService.jwtAccessExpiresIn;

    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) {
      return 900;
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * multipliers[unit];
  }

  private getRefreshTokenExpiryDate(): Date {
    return new Date(Date.now() + this.getRefreshTokenMaxAgeMs());
  }
}
