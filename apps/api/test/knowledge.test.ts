import { describe, expect, it } from 'vitest';
import { buildApp, API_PREFIX } from '../src/app';
import { seedKnowledge } from '../src/data/knowledge';

describe('GET /api/v1/knowledge', () => {
  it('returns published knowledge for the requested locale', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/knowledge?locale=ja` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.knowledge.every((k: { status: string; locale: string }) => k.status === 'published' && k.locale === 'ja')).toBe(true);
    await app.close();
  });

  it('defaults to Japanese when no locale is given', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/knowledge` });
    expect(res.statusCode).toBe(200);
    expect(res.json().knowledge.length).toBeGreaterThan(0);
    await app.close();
  });

  it('serves each locale translation', async () => {
    const app = buildApp();
    for (const locale of ['ja', 'zh-CN', 'zh-TW'] as const) {
      const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/knowledge?locale=${locale}` });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBeGreaterThan(0);
      expect(body.knowledge.every((k: { locale: string }) => k.locale === locale)).toBe(true);
    }
    await app.close();
  });

  it('keeps every knowledge id translated in all supported locales', () => {
    const localesById = new Map<string, Set<string>>();
    for (const item of seedKnowledge) {
      const locales = localesById.get(item.id) ?? new Set<string>();
      locales.add(item.locale);
      localesById.set(item.id, locales);
    }

    for (const locales of localesById.values()) {
      expect(locales).toEqual(new Set(['ja', 'zh-CN', 'zh-TW']));
    }
  });

  it('explains the main age-based vaccine checkpoints', () => {
    const ja = seedKnowledge.find((item) => item.id === 'k-vaccination' && item.locale === 'ja');
    expect(ja?.sourceReferences.some((source) => source.url?.includes('mhlw.go.jp'))).toBe(true);
    expect(ja?.body).toContain('ロタウイルス');
    expect(ja?.body).toContain('BCG');
    expect(ja?.body).toContain('MR');
    expect(ja?.body).toContain('日本脳炎');
    expect(ja?.body).toContain('HPV');
  });
});

describe('GET /api/v1/knowledge/:knowledgeId', () => {
  it('returns a knowledge entry in the requested locale', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/knowledge/k-vaccination?locale=zh-CN` });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe('k-vaccination');
    expect(res.json().locale).toBe('zh-CN');
    expect(res.json().body.length).toBeGreaterThan(0);
    await app.close();
  });

  it('falls back to Japanese when the locale is not translated', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/knowledge/k-vaccination?locale=fr` });
    expect(res.statusCode).toBe(200);
    expect(res.json().locale).toBe('ja');
    await app.close();
  });

  it('returns 404 for an unknown id', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: `${API_PREFIX}/knowledge/does-not-exist` });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
    await app.close();
  });
});
