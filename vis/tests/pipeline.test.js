'use strict';

// const { pipeline } = require('../src/pipeline');
import { a} from '../src/pipeline';

describe('smoke', () => {
  it ('should not let the magic smoke out', () => {
    const v = a();
    expect(v).toBe(4);
  })
});