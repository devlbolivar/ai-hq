import { describe, expect, it } from 'vitest';
import marketingMap from '../fixtures/marketing-map.txt?raw';
import { renderLayoutAscii } from '../../src/layout/ascii';
import { marketingLayout } from '../../src/layout/marketing';
import { makeLayout, makeObject } from '../fixtures/layouts';

describe('renderLayoutAscii', () => {
  it('renders the Marketing layout exactly as the FR-005b map (research R8)', () => {
    expect(renderLayoutAscii(marketingLayout)).toBe(marketingMap.trimEnd());
  });

  it('draws objects over their use points and the entrance over the floor', () => {
    const layout = makeLayout({
      grid: { cols: 3, rows: 2 },
      entrance: { x: 2, y: 1 },
      objects: [
        makeObject({
          id: 'sofa',
          kind: 'sofa',
          origin: { x: 0, y: 0 },
          size: { w: 2, h: 1 },
          blocking: false,
          usePoints: [
            { tile: { x: 0, y: 0 }, facing: 'N' },
            { tile: { x: 1, y: 0 }, facing: 'N' },
          ],
        }),
        makeObject({
          id: 'coffee',
          kind: 'coffee-machine',
          origin: { x: 1, y: 1 },
          usePoints: [{ tile: { x: 0, y: 1 }, facing: 'E' }],
        }),
      ],
    });
    expect(renderLayoutAscii(layout)).toBe('F F .\nk K E');
  });

  it('does not draw monitors (they sit on their desk)', () => {
    const layout = makeLayout({
      grid: { cols: 2, rows: 1 },
      entrance: { x: 1, y: 0 },
      objects: [
        makeObject({ id: 'desk', kind: 'desk', origin: { x: 0, y: 0 } }),
        makeObject({ id: 'mon', kind: 'monitor', origin: { x: 0, y: 0 }, z: 28, blocking: false }),
      ],
    });
    expect(renderLayoutAscii(layout)).toBe('D E');
  });
});
