/* eslint-disable unicorn/prefer-module */
import { describe, expect, it } from '@jest/globals';
import { existsSync, rmSync } from 'node:fs';

import { extractVideoFrames } from '../../src/video/ffmpeg';


describe('ffmpeg extractVideoFrames', () => {
  it('should work with a sample file', async () => {
    rmSync('/tmp/000001.jpg');
    rmSync('/tmp/000002.jpg');
    rmSync('/tmp/000003.jpg');
    rmSync('/tmp/000004.jpg');
    expect(existsSync('/tmp/000001.jpg')).toBe(false);
    expect(existsSync('/tmp/000002.jpg')).toBe(false);
    expect(existsSync('/tmp/000003.jpg')).toBe(false);
    expect(existsSync('/tmp/000004.jpg')).toBe(false);

    const file = `${__dirname}/000001.mp4`;
    await extractVideoFrames(file, '/tmp', 1);
    
    expect(existsSync('/tmp/000001.jpg')).toBe(true);
    expect(existsSync('/tmp/000002.jpg')).toBe(true);
    expect(existsSync('/tmp/000003.jpg')).toBe(true);
    expect(existsSync('/tmp/000004.jpg')).toBe(true);
  });
});
