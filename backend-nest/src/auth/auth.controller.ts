import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleProfile } from './strategies/google.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // Passport's GoogleAuthGuard intercepts this before the handler body ever
  // runs, redirecting the browser to Google's consent screen.
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as GoogleProfile;
    const user = await this.auth.validateGoogleUser(profile);
    const tokens = this.auth.issueTokens(user);

    // Hands tokens to the frontend via query params on a redirect rather
    // than a cookie — frontend-next is a separate origin (:3000 vs :8001)
    // and doesn't have its own session/cookie handling yet (Phase 3 shipped
    // UI only). The Profile page picks these up and stores them.
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const redirect = new URL('/profile', frontendUrl);
    redirect.searchParams.set('accessToken', tokens.accessToken);
    redirect.searchParams.set('refreshToken', tokens.refreshToken);
    res.redirect(redirect.toString());
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    try {
      const accessToken = this.auth.refreshAccessToken(refreshToken);
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const { userId } = req.user as { userId: number; email: string };
    const user = await this.auth.getUserById(userId);
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, name: user.name, avatar_url: user.avatarUrl };
  }
}
