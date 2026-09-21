export const config = {
  port: Number(process.env.PORT ?? 3000),
  databasePath: process.env.DATABASE_PATH ?? '.data/order-intake.db',
  llmMode: process.env.LLM_MODE ?? 'mock',
  llmModel: process.env.LLM_MODEL ?? 'gpt-5.6-sol',
  proxyUrl: process.env.LLM_PROXY_URL ?? 'http://127.0.0.1:8787/v1/chat/completions',
  proxyApiKey: process.env.LLM_PROXY_API_KEY ?? 'local',
  lmStudioUrl: process.env.LM_STUDIO_URL ?? 'http://127.0.0.1:1234/v1/chat/completions',
  lmStudioModel: process.env.LM_STUDIO_MODEL ?? 'local-model',
  erpFailFirst: process.env.ERP_FAIL_FIRST === 'true'
};
