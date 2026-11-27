import { describe, expect, it } from 'vitest';
import { gridToWorld, marketingLayout, silhouette } from '@ai-hq/domain';
import { hoverHighlight } from '../../src/render/drawOverlay';

const { tile } = marketingLayout;
const at = (x: number, y: number) => gridToWorld({ x, y }, tile);

describe('hoverHighlight (FR-017–FR-019)', () => {
  it('has no highlight without hover', () => {
    expect(hoverHighlight(null, marketingLayout)).toBeNull();
  });

  it('highlights the diamond of the hovered floor tile', () => {
    expect(hoverHighlight({ type: 'tile', tile: { x: 9, y: 6 } }, marketingLayout)).toEqual({
      footprint: [at(9, 6), at(10, 6), at(10, 7), at(9, 7)],
      outline: null,
    });
  });

  it('highlights every tile of a hovered object plus its full silhouette', () => {
    const table = marketingLayout.objects.find((o) => o.id === 'meeting-table');
    if (!table) throw new Error('meeting-table missing');
    expect(hoverHighlight({ type: 'object', id: 'meeting-table' }, marketingLayout)).toEqual({
      footprint: [at(12, 2), at(14, 2), at(14, 4), at(12, 4)],
      outline: silhouette(table, tile),
    });
  });

  it('ignores an object id that is not in the layout', () => {
    expect(hoverHighlight({ type: 'object', id: 'nope' }, marketingLayout)).toBeNull();
  });
});
