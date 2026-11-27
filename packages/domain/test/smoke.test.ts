import { describe, expect, it } from 'vitest';
import * as domain from '../src/index';

describe('@ai-hq/domain', () => {
  it('loads the package entry point', () => {
    expect(domain).toBeTypeOf('object');
  });
});
