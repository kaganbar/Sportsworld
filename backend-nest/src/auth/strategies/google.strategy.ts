import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    // passport-google-oauth20's Strategy constructor validates clientID/
    // clientSecret are non-empty *at instantiation time* — with no real
    // credentials configured yet, an empty string here would crash the
    // entire Nest app on boot (not just fail the /auth/google request).
    // A placeholder keeps the app running in that state; hitting the real
    // endpoint without real credentials fails at Google's end (invalid
    // client) rather than preventing startup.
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID', '') || 'not-configured',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET', '') || 'not-configured',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL', 'http://localhost:8001/api/auth/google/callback'),
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google account has no email'), undefined);
      return;
    }
    const user: GoogleProfile = {
      googleId: profile.id,
      email,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, user);
  }
}
