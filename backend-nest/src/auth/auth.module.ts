import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Phase 2 skeleton only — registered now so Phase 4 (Backend) has a
// starting point rather than creating the module from scratch. Phase 4
// adds: strategies/google.strategy.ts, strategies/jwt.strategy.ts,
// guards/jwt-auth.guard.ts, the User Prisma model, and the real
// service/controller logic. See ARCHITECTURE.md's Auth section.
@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
