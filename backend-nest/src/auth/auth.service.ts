import { Injectable } from '@nestjs/common';

// Phase 2 skeleton only. Real logic — Google OAuth token validation, User
// upsert, JWT access/refresh token issuance — lands in Phase 4 (Backend)
// per ARCHITECTURE.md's Auth section: NestJS is the system of record,
// Passport (google-oauth20 + jwt strategies) does the work, stateless JWTs
// (no Redis-backed session store unless refresh-token revocation becomes
// an actual requirement).
@Injectable()
export class AuthService {}
