import { describe, expect, it } from 'vitest';
import { isLogNextPath, sanitizeNextPath } from './nextPath';

describe('sanitizeNextPath', () => {
  it('allows relative app paths', () => {
    expect(sanitizeNextPath('/log')).toBe('/log');
    expect(sanitizeNextPath('/concert/abc?x=1')).toBe('/concert/abc?x=1');
  });

  it('rejects open redirects', () => {
    expect(sanitizeNextPath('//evil.com')).toBe('/');
    expect(sanitizeNextPath('https://evil.com')).toBe('/');
    expect(sanitizeNextPath('/login')).toBe('/');
    expect(sanitizeNextPath(null)).toBe('/');
  });
});

describe('isLogNextPath', () => {
  it('detects log destinations', () => {
    expect(isLogNextPath('/log')).toBe(true);
    expect(isLogNextPath('/log?manual=1')).toBe(true);
    expect(isLogNextPath('/add')).toBe(true);
    expect(isLogNextPath('/discover')).toBe(false);
  });
});
