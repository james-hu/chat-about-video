import { describe, expect, it } from '@jest/globals';

import { MultipleSupportedChatApiOptions, activeSupportedChatApiOptions } from '../src/chat';

describe('chat', () => {
  describe('activeSupportedChatApiOptions', () => {
    it('should throw error if active is missing', () => {
      expect(() => activeSupportedChatApiOptions({} as any)).toThrow('Did you forget to specify the "active" property in the options?');
    });

    it('should throw error if active points to a non-existent key', () => {
      expect(() => activeSupportedChatApiOptions({ active: 'nonexistent' } as any)).toThrow(
        'Did you forget to specify the "nonexistent" property in the options?',
      );
    });

    it('should return merged options with active options and base options', () => {
      const options: MultipleSupportedChatApiOptions = {
        active: 'gpt',
        base: {
          completionOptions: {
            model: 'base-model',
            max_tokens: 100,
          } as any,
        },
        gpt: {
          endpoint: 'http://gpt.endpoint',
          credential: { key: 'key' },
          completionOptions: {
            model: 'gpt-model',
          } as any,
        },
      };

      const result = activeSupportedChatApiOptions(options);
      // In the implementation, merge(base, activeOptions) is used.
      // This means activeOptions properties override base properties if there's overlap.
      expect(result).toEqual({
        endpoint: 'http://gpt.endpoint',
        credential: { key: 'key' },
        completionOptions: {
          model: 'gpt-model', // gpt overrides base
          max_tokens: 100,
        },
      });
    });

    it('should respect the behavior of active options overriding base options', () => {
      const options: MultipleSupportedChatApiOptions = {
        active: 'gemini',
        base: {
          completionOptions: {
            model: 'base-model',
          } as any,
        },
        gemini: {
          credential: { key: 'gemini-key' },
          clientSettings: {
            modelParams: {
              model: 'gemini-1.5-pro',
            },
          } as any,
          completionOptions: {
            model: 'gemini-model',
          } as any,
        },
      };

      const result = activeSupportedChatApiOptions(options);
      expect(result).toEqual({
        credential: { key: 'gemini-key' },
        clientSettings: {
          modelParams: {
            model: 'gemini-1.5-pro',
          },
        },
        completionOptions: {
          model: 'gemini-model', // gemini overrides base
        },
      });
    });

    it('should work when base is missing', () => {
      const options: MultipleSupportedChatApiOptions = {
        active: 'gpt',
        gpt: {
          endpoint: 'http://gpt.endpoint',
          credential: { key: 'key' },
        },
      };

      const result = activeSupportedChatApiOptions(options);
      expect(result).toEqual({
        endpoint: 'http://gpt.endpoint',
        credential: { key: 'key' },
      });
    });

    it('should work when base is null', () => {
      const options: MultipleSupportedChatApiOptions = {
        active: 'gpt',
        base: null,
        gpt: {
          endpoint: 'http://gpt.endpoint',
          credential: { key: 'key' },
        },
      };

      const result = activeSupportedChatApiOptions(options);
      expect(result).toEqual({
        endpoint: 'http://gpt.endpoint',
        credential: { key: 'key' },
      });
    });

    it('should deep merge nested objects and replace arrays', () => {
      const options: MultipleSupportedChatApiOptions = {
        active: 'gpt',
        base: {
          completionOptions: {
            backoffOnThrottling: [1000, 2000],
            model: 'base-model',
          } as any,
        },
        gpt: {
          credential: { key: 'key' },
          completionOptions: {
            backoffOnThrottling: [5000], // should replace, not concat
            model: 'gpt-model', // should override
            jsonResponse: true, // add some new field
          } as any,
        },
      };

      const result = activeSupportedChatApiOptions(options);
      expect(result).toEqual({
        credential: { key: 'key' },
        completionOptions: {
          backoffOnThrottling: [5000],
          model: 'gpt-model',
          jsonResponse: true,
        },
      });
    });
  });
});
