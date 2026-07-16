import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import type { Response } from 'express';
import { AnalysisUnavailableError, RateLimitExceededError } from './agent-caller.service';

// Every agent controller's route handler used to repeat this exact mapping
// in its own try/catch (9 byte-identical copies across football/basketball/
// baseball/volleyball/tennis/statistics/prediction/general-sports/master-
// agent): RateLimitExceededError -> 429, AnalysisUnavailableError -> 503.
// Centralized here as a standard Nest exception filter — apply via
// @UseFilters(AgentErrorFilter) — instead of a try/catch per handler.
//
// The 429 branch is NOT just `new HttpException(message, 429)` — a bug
// caught while writing this filter's own test: plain HttpException(string,
// status) stores the string as-is (`getResponse()` returns the bare string
// "message", not an object), unlike named subclasses (NotFoundException,
// ServiceUnavailableException, ...) which route through the static
// `HttpException.createBody()` helper to produce the usual {statusCode,
// message, error} shape. The old per-controller try/catch blocks had this
// exact bug for 9 copies — the frontend's `body?.message` read would have
// been `undefined` for every 429, silently falling back to a generic
// "HTTP 429" instead of the real "too many requests" message. Building the
// body via createBody() here (same helper ServiceUnavailableException uses
// internally) fixes it in the one place instead of 9.
@Catch(RateLimitExceededError, AnalysisUnavailableError)
export class AgentErrorFilter implements ExceptionFilter {
  catch(exception: RateLimitExceededError | AnalysisUnavailableError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped =
      exception instanceof RateLimitExceededError
        ? new HttpException(
            HttpException.createBody(exception.message, 'Too Many Requests', HttpStatus.TOO_MANY_REQUESTS),
            HttpStatus.TOO_MANY_REQUESTS,
          )
        : new ServiceUnavailableException(exception.message);
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }
}
