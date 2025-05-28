import { describe, expect, it } from '@jest/globals';

import { findCommonParentPath } from '../src/utils';

describe('findCommonParentPath', () => {
  it('should return root path for empty input', () => {
    const result = findCommonParentPath([]);
    expect(result.commonParent).toBe(process.cwd().split('/')[0] + '/');
    expect(result.relativePaths).toEqual([]);
  });

  it('should return the same path for a single input', () => {
    const input = ['/tmp/test/file.txt'];
    const result = findCommonParentPath(input);
    expect(result.commonParent).toBe('/tmp/test');
    expect(result.relativePaths).toEqual(['file.txt']);
  });

  it('should find common parent for multiple paths', () => {
    const input = ['/tmp/test/file1.txt', '/tmp/test/file2.txt'];
    const result = findCommonParentPath(input);
    expect(result.commonParent).toBe('/tmp/test');
    expect(result.relativePaths).toEqual(['file1.txt', 'file2.txt']);
  });

  it('should handle absolute and relative paths', () => {
    const input = ['/tmp/test/file1.txt', 'test/file2.txt'];
    const result = findCommonParentPath(input);
    expect(result.commonParent).toBe('/');
    expect(result.relativePaths[0]).toEqual('tmp/test/file1.txt');
    expect(result.relativePaths[1]).toEqual(expect.stringMatching(/.+test\/file2\.txt$/));
  });

  it('should return root path when no common parent exists', () => {
    const input = ['/tmp/test1/file1.txt', '/var/logs/file2.txt'];
    const result = findCommonParentPath(input);
    expect(result.commonParent).toBe(process.cwd().split('/')[0] + '/');
    expect(result.relativePaths).toEqual(['tmp/test1/file1.txt', 'var/logs/file2.txt']);
  });

  it('should handle paths with different depths', () => {
    const input = ['/tmp/test/file1.txt', '/tmp/test/subdir/file2.txt'];
    const result = findCommonParentPath(input);
    expect(result.commonParent).toBe('/tmp/test');
    expect(result.relativePaths).toEqual(['file1.txt', 'subdir/file2.txt']);
  });
});
