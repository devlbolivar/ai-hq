import { describe, expect, it } from 'vitest';
import contract from '../../../specs/001-office-engine/contracts/domain-api.md?raw';
import contract002Raw from '../../../specs/002-marketing-team/contracts/domain-api.md?raw';
import * as domain from '../src/index';

function typescriptBlocks(markdown: string): string {
  return Array.from(markdown.matchAll(/^```ts\r?\n([\s\S]*?)^```\s*$/gm), (match) => match[1]).join(
    '\n',
  );
}

function namesIn(code: string, pattern: RegExp): string[] {
  return Array.from(code.matchAll(pattern), (match) => match[1]!).sort();
}

function numericConstants(code: string): Record<string, number> {
  const constants: Record<string, number> = {};
  for (const line of code.split('\n').filter((line) => line.startsWith('export const '))) {
    for (const declaration of line.slice('export const '.length).split(',')) {
      const [name, literal] = declaration.split('=');
      constants[name!.trim()] = Number(literal);
    }
  }
  return constants;
}

const code = typescriptBlocks(contract);
const functions = namesIn(code, /^(\w+)\(/gm);
const values = namesIn(code, /^(\w+):/gm);
const constants = numericConstants(code);
const api: Record<string, unknown> = domain;

describe('public API documented in domain-api.md', () => {
  it('reads the documented declarations', () => {
    expect(functions).toEqual([
      'drawOrder',
      'findPath',
      'gridToWorld',
      'hitTest',
      'initialCamera',
      'pan',
      'recenter',
      'renderLayoutAscii',
      'screenToGrid',
      'screenToWorld',
      'silhouette',
      'validateLayout',
      'walkability',
      'worldToGrid',
      'worldToScreen',
      'zoomAt',
    ]);
    expect(constants).toEqual({ ZOOM_MIN: 0.5, ZOOM_MAX: 2, ZOOM_STEP: 1.1 });
    expect(values).toEqual(['marketingLayout']);
  });

  it.each(functions)('exports %s as a function', (name) => {
    expect(api[name]).toBeTypeOf('function');
  });

  it.each(Object.entries(constants))('exports %s with its documented value', (name, value) => {
    expect(api[name]).toBe(value);
  });

  it.each(values)('exports %s as an object', (name) => {
    expect(api[name]).not.toBeNull();
    expect(api[name]).toBeTypeOf('object');
  });

  it('validates the Marketing layout', () => {
    expect(domain.validateLayout(domain.marketingLayout).ok).toBe(true);
  });

  it('returns a single tile for a path from the entrance to itself', () => {
    const { entrance } = domain.marketingLayout;
    const walk = domain.walkability(domain.marketingLayout);
    expect(domain.findPath(walk, entrance, entrance)).toEqual({ ok: true, path: [entrance] });
  });
});

describe('contracts/domain-api.md of the 002 (T086)', () => {
  const contract002 = typescriptBlocks(contract002Raw);
  const functions002 = namesIn(contract002, /^function (\w+)/gm);
  const constants002 = Array.from(contract002.matchAll(/^const (.+)$/gm), (m) => m[1]!)
    .map((line) => line.replace(/\/\/.*$/, ''))
    .flatMap((line) => line.split(','))
    .map((part) => part.trim().split(/[\s:=]/)[0]!)
    .filter((name) => /^[A-Za-z_]\w*$/.test(name));

  it('lists functions and constants', () => {
    expect(functions002.length).toBeGreaterThan(30);
    expect(constants002).toContain('ACCEPTANCE_SEED');
  });

  it.each(functions002)('exports the function %s', (name) => {
    expect(typeof api[name]).toBe('function');
  });

  it.each(constants002)('exports the constant %s', (name) => {
    expect(api).toHaveProperty(name);
  });
});
