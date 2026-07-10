import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleProfile } from './strategies/google.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// @nestjs/jwt v11's expiresIn is a branded string type (from the `ms`
// package), not plain `string` — env vars are always plain strings, so this
// cast is the boundary between "runtime-configured" and "statically typed".
function expiresIn(value: string): JwtSignOptions['expiresIn'] {
  return value as JwtSignOptions['expiresIn'];
}

// Stateless JWT (no Redis-backed session store) per ARCHITECTURE.md's Auth
// section — revisit only if refresh-token revocation becomes an actual
// requirement, not preemptively.
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  validateGoogleUser(profile: GoogleProfile) {
    return this.prisma.user.upsert({
      where: { googleId: profile.googleId },
      update: { email: profile.email, name: profile.name, avatarUrl: profile.avatarUrl },
      create: {
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      },
    });
  }

  issueTokens(user: { id: number; email: string }): TokenPair {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET', 'dev-insecure-access-secret'),
      expiresIn: expiresIn(this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m')),
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET', 'dev-insecure-refresh-secret'),
      expiresIn: expiresIn(this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d')),
    });
    return { accessToken, refreshToken };
  }

  // Throws (jwt.verify's own error) on an invalid/expired refresh token —
  // the controller maps that to a 401 rather than letting it bubble as a 500.
  refreshAccessToken(refreshToken: string): string {
    const payload = this.jwt.verify<{ sub: number; email: string }>(refreshToken, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET', 'dev-insecure-refresh-secret'),
    });
    return this.jwt.sign(
      { sub: payload.sub, email: payload.email },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET', 'dev-insecure-access-secret'),
        expiresIn: expiresIn(this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m')),
      },
    );
  }

  getUserById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
