import { GeneralSportsAgentService } from './general-sports-agent.service';
import { AgentCallerService } from '../common/agent-caller.service';

function makeAgentCaller(result: any): AgentCallerService {
  return {
    call: jest.fn().mockResolvedValue([result, 'claude-test-model']),
  } as unknown as AgentCallerService;
}

describe('GeneralSportsAgentService', () => {
  it('passes the question through as context and maps the result shape', async () => {
    const agentCaller = makeAgentCaller({ answer: 'Offside rule explained.', key_points: ['a', 'b'], confidence: 'high' });
    const service = new GeneralSportsAgentService(agentCaller);

    const result = await service.ask('What is offside in football?', 'en');

    expect(agentCaller.call).toHaveBeenCalledTimes(1);
    const callArgs = (agentCaller.call as jest.Mock).mock.calls[0][0];
    expect(callArgs.context).toEqual({ question: 'What is offside in football?' });
    expect(result).toEqual({
      answer: 'Offside rule explained.',
      key_points: ['a', 'b'],
      confidence: 'high',
      model: 'claude-test-model',
    });
  });

  it('appends the Hebrew language instruction to the system prompt when lang=he', async () => {
    const agentCaller = makeAgentCaller({ answer: 'תשובה', key_points: [], confidence: 'medium' });
    const service = new GeneralSportsAgentService(agentCaller);

    await service.ask('מה זה נבדל?', 'he');

    const callArgs = (agentCaller.call as jest.Mock).mock.calls[0][0];
    expect(callArgs.system).toContain('Hebrew');
  });

  it('mockFactory falls back to a bilingual placeholder answer referencing the question', async () => {
    const agentCaller = {
      call: jest.fn().mockImplementation(async (opts: any) => [opts.mockFactory(opts.context), 'mock']),
    } as unknown as AgentCallerService;
    const service = new GeneralSportsAgentService(agentCaller);

    const result = await service.ask('How many players on a volleyball team?', 'en');

    expect(result.model).toBe('mock');
    expect(result.answer).toContain('How many players on a volleyball team?');
    expect(result.confidence).toBe('medium');
  });
});
