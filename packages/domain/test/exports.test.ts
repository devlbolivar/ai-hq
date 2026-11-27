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
  'pan',
  'zoomAt',
  'recenter',
  'validateLayout',
  'renderLayoutAscii',
  'walkability',
  'reachableFrom',
  'drawOrder',
  'findPath',
] as const;

describe('@ai-hq/domain foundational exports (contracts/domain-api.md)', () => {
  it.each(FOUNDATIONAL_FUNCTIONS)('exports %s', (name) => {
    expect(domain).toHaveProperty(name);
    expect(typeof (domain as Record<string, unknown>)[name]).toBe('function');
  });

  it.each([
    ['ZOOM_MIN', 0.5],
    ['ZOOM_MAX', 2],
    ['ZOOM_STEP', 1.1],
  ])('exports %s', (name, value) => {
    expect(domain).toHaveProperty(name, value);
  });

  it('exports marketingLayout', () => {
    expect(domain.marketingLayout.departmentId).toBe('marketing');
  });
});
