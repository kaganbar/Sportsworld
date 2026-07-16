import { ArgumentsHost } from '@nestjs/common';
import { AgentErrorFilter } from './agent-error.filter';
import { AnalysisUnavailableError, RateLimitExceededError } from './agent-caller.service';

function makeHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AgentErrorFilter', () => {
  it('maps RateLimitExceededError to 429 with the original message', () => {
    const filter = new AgentErrorFilter();
    const { host, status, json } = makeHost();

    filter.catch(new RateLimitExceededError('slow down'), host);

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({ statusCode: 429, message: 'slow down', error: 'Too Many Requests' });
  });

  it('maps AnalysisUnavailableError to 503 with the original message', () => {
    const filter = new AgentErrorFilter();
    const { host, status, json } = makeHost();

    filter.catch(new AnalysisUnavailableError('agent is down'), host);

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503, message: 'agent is down' }));
  });
});
