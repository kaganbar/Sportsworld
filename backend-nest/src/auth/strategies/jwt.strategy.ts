import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number; // user id
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET', 'dev-insecure-access-secret'),
    });
  }

  // Attached to req.user by Passport — kept minimal (id+email); AuthService's
  // getMe() re-fetches the full User row on the /me endpoint when needed.
  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}
