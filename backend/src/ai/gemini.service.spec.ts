import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { AiProviderError } from './ai.errors';

describe('GeminiService', () => {
  let service: GeminiService;
  const fetchMock = jest.fn();

  const okResponse = (payload: unknown) =>
    ({ ok: true, status: 200, json: async () => payload }) as unknown as Response;

  const geminiPayload = (text: string) => ({
    modelVersion: 'gemini-2.5-flash',
    usageMetadata: { promptTokenCount: 150, candidatesTokenCount: 60 },
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }],
  });

  beforeEach(async () => {
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: unknown) =>
              key === 'GEMINI_API_KEY' ? 'test-api-key' : defaultValue,
          },
        },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
    fetchMock.mockReset();
  });

  it('sends a structured-output request and returns text plus usage metadata', async () => {
    fetchMock.mockResolvedValue(okResponse(geminiPayload('{"category":"CONNECTIVITY"}')));

    const result = await service.analyzeTicket('Internet down', 'LOS light is red');

    expect(result).toEqual({
      text: '{"category":"CONNECTIVITY"}',
      model: 'gemini-2.5-flash',
      inputTokens: 150,
      outputTokens: 60,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/models/gemini-flash-latest:generateContent');
    expect(init.method).toBe('POST');
    expect(init.headers['x-goog-api-key']).toBe('test-api-key');

    const body = JSON.parse(init.body);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema.properties.category.enum).toContain('CONNECTIVITY');
    expect(body.generationConfig.responseSchema.required).toContain('requires_technician');
    expect(body.contents[0].parts[0].text).toContain('Subject: Internet down');
    expect(body.systemInstruction.parts[0].text).toContain('classification engine');
  });

  it('throws AiProviderError on an HTTP failure without leaking the provider body', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'internal boom' });

    await expect(service.analyzeTicket('s', 'd')).rejects.toThrow(AiProviderError);
    await expect(service.analyzeTicket('s', 'd')).rejects.toThrow('status 500');
  });

  it('wraps timeout aborts as AiProviderError', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    fetchMock.mockRejectedValue(abortError);

    await expect(service.analyzeTicket('s', 'd')).rejects.toThrow('timed out');
  });

  it('throws AiProviderError when the model returns no text', async () => {
    fetchMock.mockResolvedValue(okResponse({ candidates: [] }));

    await expect(service.analyzeTicket('s', 'd')).rejects.toThrow('empty response');
  });

  it('refuses to call the API when no API key is configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    const unconfigured = module.get<GeminiService>(GeminiService);

    expect(unconfigured.isConfigured).toBe(false);
    await expect(unconfigured.analyzeTicket('s', 'd')).rejects.toThrow('not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
