import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export type Lang = 'en' | 'he';

// Permissive: anything other than "he" falls back to "en" rather than
// erroring — translation is graceful degradation, not a strict contract.
// Mirrors translations/service.py::resolve_lang from the Django backend.
export const LangParam = createParamDecorator((_: unknown, ctx: ExecutionContext): Lang => {
  const req = ctx.switchToHttp().getRequest();
  return req.query?.lang === 'he' ? 'he' : 'en';
});
