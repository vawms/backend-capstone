import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../../entities/user.entity';
import { ConfigService } from '../../config/config.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockUserRepository = () => ({
  findOne: jest.fn(),
  update: jest.fn(),
});

const mockJwtService = () => ({
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
});

const mockConfigService = () => ({
  jwtAccessSecret: 'access-secret',
  jwtRefreshSecret: 'refresh-secret',
  jwtAccessExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d',
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: MockRepository<User>;
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useFactory: mockUserRepository,
        },
        {
          provide: JwtService,
          useFactory: mockJwtService,
        },
        {
          provide: ConfigService,
          useFactory: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get<MockRepository<User>>(
      getRepositoryToken(User),
    );
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('login returns a token pair and stores the hashed refresh token', async () => {
    const user = {
      id: 'user-1',
      username: 'operator',
      role: UserRole.OPERATOR,
      company_id: 'company-1',
      technician_id: null,
      session_version: 1,
    } as User;

    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
    usersRepository.update!.mockResolvedValue(undefined);

    const result = await service.login(user);

    expect(result).toEqual({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 900,
    });
    expect(usersRepository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        refresh_token_hash: 'hashed-refresh',
      }),
    );
  });

  it('refresh rotates the refresh token and returns a new pair', async () => {
    const user = {
      id: 'user-1',
      username: 'operator',
      role: UserRole.OPERATOR,
      company_id: 'company-1',
      technician_id: null,
      session_version: 1,
      refresh_token_hash: 'stored-hash',
      refresh_token_expires_at: new Date(Date.now() + 60_000),
    } as User;

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      type: 'refresh',
      session_version: 1,
    });
    usersRepository.findOne!.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
    usersRepository.update!.mockResolvedValue(undefined);

    const result = await service.refresh('presented-refresh-token');

    expect(result).toEqual({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 900,
    });
    expect(usersRepository.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        refresh_token_hash: 'new-hash',
      }),
    );
  });

  it('refresh rejects revoked tokens', async () => {
    const user = {
      id: 'user-1',
      session_version: 1,
      refresh_token_hash: null,
      refresh_token_expires_at: null,
    } as User;

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      type: 'refresh',
      session_version: 1,
    });
    usersRepository.findOne!.mockResolvedValue(user);

    await expect(service.refresh('bad-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('logout clears persisted refresh token state', async () => {
    usersRepository.update!.mockResolvedValue(undefined);

    const result = await service.logout('user-1');

    expect(result).toEqual({ success: true });
    expect(usersRepository.update).toHaveBeenCalledWith('user-1', {
      refresh_token_hash: null,
      refresh_token_expires_at: null,
    });
  });
});
