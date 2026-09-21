import { createApp } from './server.js';
let appPromise: ReturnType<typeof createApp> | undefined;
export async function handler(event: { httpMethod?: string; requestContext?: { http?: { method?: string } }; path?: string; rawPath?: string; body?: string; headers?: Record<string,string> }) {
  appPromise ??= createApp(); const app = appPromise; const method = event.httpMethod ?? event.requestContext?.http?.method ?? 'GET'; const url = event.rawPath ?? event.path ?? '/health'; const response = await app.inject({ method: method as any, url, payload: event.body ? JSON.parse(event.body) : undefined, headers: event.headers }); return { statusCode: response.statusCode, headers: { 'content-type': 'application/json' }, body: response.body };
}
