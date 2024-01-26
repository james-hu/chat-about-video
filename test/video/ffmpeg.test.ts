/* eslint-disable unicorn/prefer-module */
import { describe, expect, it } from '@jest/globals';
import { existsSync, rmSync } from 'node:fs';

import { extractVideoFramesWithFfmpeg } from '../../src/video';


describe('ffmpeg extractVideoFrames', () => {
  it('should work with a sample file', async () => {
    rmSync('/tmp/000000.jpg', { force: true });
    rmSync('/tmp/000001.jpg', { force: true });
    rmSync('/tmp/000002.jpg', { force: true });
    rmSync('/tmp/000003.jpg', { force: true });
    rmSync('/tmp/000004.jpg', { force: true });
    expect(existsSync('/tmp/000000.jpg')).toBe(false);
    expect(existsSync('/tmp/000001.jpg')).toBe(false);
    expect(existsSync('/tmp/000002.jpg')).toBe(false);
    expect(existsSync('/tmp/000003.jpg')).toBe(false);
    expect(existsSync('/tmp/000004.jpg')).toBe(false);

    const file = `${__dirname}/000001.mp4`;
    const files = await extractVideoFramesWithFfmpeg(file, '/tmp', 1);

    expect(files.length).toBe(5);
    expect(files[0]).toBe('000000.jpg');
    expect(files[1]).toBe('000001.jpg');
    expect(files[2]).toBe('000002.jpg');
    expect(files[3]).toBe('000003.jpg');
    expect(files[4]).toBe('000004.jpg');

    expect(existsSync('/tmp/000000.jpg')).toBe(true);
    expect(existsSync('/tmp/000001.jpg')).toBe(true);
    expect(existsSync('/tmp/000002.jpg')).toBe(true);
    expect(existsSync('/tmp/000003.jpg')).toBe(true);
    expect(existsSync('/tmp/000004.jpg')).toBe(true);
  });

  it('should work with optional arguments on a sample file', async () => {
    rmSync('/tmp/000001.png', { force: true });
    rmSync('/tmp/000003.png', { force: true });
    expect(existsSync('/tmp/000001.png')).toBe(false);
    expect(existsSync('/tmp/000003.png')).toBe(false);

    const file = `${__dirname}/000001.mp4`;
    const files = await extractVideoFramesWithFfmpeg(file, '/tmp', 2, 'png', 100, undefined, 1, 3);

    expect(files.length).toBe(2);
    expect(files[0]).toBe('000001.png');
    expect(files[1]).toBe('000003.png');

    expect(existsSync('/tmp/000001.png')).toBe(true);
    expect(existsSync('/tmp/000003.png')).toBe(true);
  });
});
