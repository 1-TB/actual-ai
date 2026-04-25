describe('ToolService searxngWebSearch wiring', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, FEATURES: '["searxngWebSearch"]' };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.restoreAllMocks();
  });

  test('registers a searxngWebSearch tool when SEARXNG_BASE_URL is set', async () => {
    const ToolService = (await import('../src/utils/tool-service')).default;
    const toolService = new ToolService('', 'https://searxng.example.com');

    expect(toolService.getTools()).toHaveProperty('searxngWebSearch');
  });

  test('does not register the tool when SEARXNG_BASE_URL is empty', async () => {
    const ToolService = (await import('../src/utils/tool-service')).default;
    const toolService = new ToolService('', '');

    expect(toolService.getTools()).not.toHaveProperty('searxngWebSearch');
  });

  test('disables repeated SearXNG calls after HTTP 401 error', async () => {
    const SearxngSearchService = (await import('../src/utils/searxng-search-service')).default;
    const error = new Error('SearXNG request failed with status code 401') as Error & {
      statusCode?: number;
    };
    error.statusCode = 401;
    const searchSpy = jest.spyOn(SearxngSearchService.prototype, 'search')
      .mockRejectedValue(error);

    const ToolService = (await import('../src/utils/tool-service')).default;
    const toolService = new ToolService('', 'https://searxng.example.com', 'token');
    const tool = toolService.getTools().searxngWebSearch;
    if (!tool?.execute) throw new Error('searxngWebSearch tool is unavailable');
    const execute = tool.execute.bind(tool);

    await expect(
      execute({ query: 'Example' }, { toolCallId: 't1', messages: [] } as never),
    ).resolves.toBe('SearXNG search is temporarily unavailable (HTTP 401).');
    await expect(
      execute({ query: 'Another' }, { toolCallId: 't2', messages: [] } as never),
    ).resolves.toBe('SearXNG search is temporarily unavailable (HTTP 401).');

    expect(searchSpy).toHaveBeenCalledTimes(1);
  });
});
