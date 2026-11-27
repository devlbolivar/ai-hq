import { describe, expect, it } from 'vitest';
import * as domain from '../src/index';

const FOUNDATIONAL_FUNCTIONS = [
  'gridToWorld',
  'worldToGrid',
  'tileCenter',
  'initialCamera',
  'officeCenter',
  'screenToWorld',
  'worldToScreen',
  'screenToGrid',
  'validateLayout',
  'renderLayoutAscii',
  'walkability',
  'reachableFrom',
] as const;

describe('@ai-hq/domain foundational exports (contracts/domain-api.md)', () => {
  it.each(FOUNDATIONAL_FUNCTIONS)('exports %s', (name) => {
    expect(domain).toHaveProperty(name);
    expect(typeof (domain as Record<string, unknown>)[name]).toBe('function');
  });

  it('exports marketingLayout', () => {
    expect(domain.marketingLayout.departmentId).toBe('marketing');
  });
});
