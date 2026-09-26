import { describe, expect, it } from '@jest/globals';

import type { ChatApi } from '../src/types';

import { Conversation } from '../src/chat';

type Message = { role: string; text: string };
type Response = { text: string; usage?: { totalTokens: number } };

const silentLog = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

function reply(text: string, totalTokens = 3): Response {
  return { text, usage: { totalTokens } };
}

function messageTexts(prompt: Message[] | undefined): string[] {
  return (prompt ?? []).map((message) => message.text);
}

function fakeApi(generate: (prompt: Message[]) => Promise<Response> | Response): ChatApi<unknown, any, Message[], Response> {
  return {
    async getClient() {
      return {};
    },
    async appendToPrompt(part, prompt) {
      const history = prompt ?? [];
      if (Array.isArray(part)) {
        history.push(...part);
      } else {
        history.push({ role: 'assistant', text: part.text });
      }
      return history;
    },
    async buildTextPrompt(text: string) {
      return { prompt: [{ role: 'user', text }] };
    },
    async buildToolCallResultsPrompt(results) {
      return {
        prompt: [{ role: 'tool', text: JSON.stringify(results) }],
      };
    },
    async generateContent(prompt) {
      return generate(prompt);
    },
    async getResponseText(response) {
      return response.text;
    },
    async getUsageMetadata(response) {
      return response.usage;
    },
    async getToolCalls() {
      return [];
    },
    isThrottlingError: (error) => error?.message === 'throttled',
    isServerError: () => false,
    isConnectivityError: () => false,
    isDownloadError: () => false,
    async buildVideoPrompt() {
      throw new Error('not used');
    },
    async buildImagesPrompt() {
      throw new Error('not used');
    },
    async buildAudioPrompt() {
      throw new Error('not used');
    },
  };
}

function conversation(
  api: ChatApi<unknown, any, Message[], Response>,
  prompt: Message[] = [{ role: 'system', text: 'system' }],
  options: any = {},
  cleanup?: () => Promise<void>,
) {
  return new Conversation('conv-1', api, prompt, options, cleanup, silentLog as any);
}

describe('Conversation', () => {
  it('rewinds successful turns without reducing usage', async () => {
    const api = fakeApi(async (prompt) => reply(prompt.at(-1)!.text + '-reply', 4));
    const conv = conversation(api);

    await conv.say('one');
    await conv.say('two');

    expect(messageTexts(conv.getPrompt())).toEqual(['system', 'one', 'one-reply', 'two', 'two-reply']);
    expect(conv.getUsage()).toEqual({ totalTokens: 8 });

    conv.rewind(1);
    expect(messageTexts(conv.getPrompt())).toEqual(['system', 'one', 'one-reply']);
    expect(conv.getUsage()).toEqual({ totalTokens: 8 });

    conv.rewind(0);
    conv.rewind(-1);
    expect(messageTexts(conv.getPrompt())).toEqual(['system', 'one', 'one-reply']);

    conv.rewind(10);
    expect(messageTexts(conv.getPrompt())).toEqual(['system']);
    expect(conv.getUsage()).toEqual({ totalTokens: 8 });
  });

  it('does not keep a user message when say fails, including after a successful turn', async () => {
    let calls = 0;
    let lengthDuringFailedCall = 0;
    const api = fakeApi(async (prompt) => {
      calls += 1;
      if (calls === 2) {
        lengthDuringFailedCall = prompt.length;
        throw new Error('model failed');
      }
      return reply(`${prompt.at(-1)!.text}-reply`);
    });
    const conv = conversation(api);

    await conv.say('first');
    await expect(conv.say('second')).rejects.toThrow('model failed');

    expect(lengthDuringFailedCall).toBe(4);
    expect(messageTexts(conv.getPrompt())).toEqual(['system', 'first', 'first-reply']);
    expect(conv.getUsage()).toEqual({ totalTokens: 3 });

    await conv.say('third');
    expect(messageTexts(conv.getPrompt())).toEqual(['system', 'first', 'first-reply', 'third', 'third-reply']);
  });

  it('keeps the user message across a retry and commits it once the call succeeds', async () => {
    let calls = 0;
    const api = fakeApi(async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error('throttled');
      }
      return reply('after-retry');
    });
    const conv = conversation(api, [{ role: 'system', text: 'system' }], { backoffOnThrottling: [0] });

    await expect(conv.say('question')).resolves.toBe('after-retry');
    expect(calls).toBe(2);
    expect(messageTexts(conv.getPrompt())).toEqual(['system', 'question', 'after-retry']);
  });

  it('does not keep tool results and runs prompt cleanup even when submitToolCallResults fails', async () => {
    let toolPromptCleanupCalled = false;
    const api = fakeApi(async () => {
      throw new Error('tool follow-up failed');
    });
    api.buildToolCallResultsPrompt = async () => ({
      prompt: [{ role: 'tool', text: 'result' }],
      cleanup: async () => {
        toolPromptCleanupCalled = true;
      },
    });

    const conv = conversation(api);

    await expect(conv.submitToolCallResults([{ name: 'lookup', result: { ok: true } }], 'please continue')).rejects.toThrow('tool follow-up failed');

    expect(messageTexts(conv.getPrompt())).toEqual(['system']);
    expect(toolPromptCleanupCalled).toBe(true);
  });

  it('gives a fork its own prompt, checkpoints, and usage', async () => {
    const api = fakeApi(async (prompt) => reply(prompt.at(-1)!.text + '-reply', 5));
    const original = conversation(api);

    await original.say('before-fork');
    const forked = original.fork();

    expect(forked.getUsage()).toBeUndefined();
    expect(messageTexts(forked.getPrompt())).toEqual(['system', 'before-fork', 'before-fork-reply']);
    expect(forked.getPrompt()).not.toBe(original.getPrompt());

    await original.say('only-original');
    forked.rewind(1);

    expect(messageTexts(original.getPrompt())).toEqual(['system', 'before-fork', 'before-fork-reply', 'only-original', 'only-original-reply']);
    expect(messageTexts(forked.getPrompt())).toEqual(['system']);
    expect(original.getUsage()).toEqual({ totalTokens: 10 });
    expect(forked.getUsage()).toBeUndefined();

    await forked.say('only-fork');
    expect(messageTexts(forked.getPrompt())).toEqual(['system', 'only-fork', 'only-fork-reply']);
    expect(forked.getUsage()).toEqual({ totalTokens: 5 });
    expect(messageTexts(original.getPrompt())).toEqual(['system', 'before-fork', 'before-fork-reply', 'only-original', 'only-original-reply']);
  });

  it('forks at an earlier checkpoint without changing the original', async () => {
    const api = fakeApi(async (prompt) => reply(prompt.at(-1)!.text + '-reply', 5));
    const original = conversation(api);

    await original.say('one');
    await original.say('two');
    const forked = original.fork(1);

    expect(messageTexts(forked.getPrompt())).toEqual(['system', 'one', 'one-reply']);
    expect(forked.getUsage()).toBeUndefined();
    expect(messageTexts(original.getPrompt())).toEqual(['system', 'one', 'one-reply', 'two', 'two-reply']);
    expect(original.getUsage()).toEqual({ totalTokens: 10 });

    await forked.say('fork-continues');
    expect(messageTexts(forked.getPrompt())).toEqual(['system', 'one', 'one-reply', 'fork-continues', 'fork-continues-reply']);
    expect(messageTexts(original.getPrompt())).toEqual(['system', 'one', 'one-reply', 'two', 'two-reply']);
  });

  it('runs cleanup once, after every forked conversation has ended', async () => {
    let cleanups = 0;
    const api = fakeApi(async () => reply('ok'));
    const original = conversation(api, [{ role: 'system', text: 'system' }], {}, async () => {
      cleanups += 1;
    });
    const forked = original.fork();
    const derived = forked.fork();

    await original.end();
    await original.end();
    await forked.end();
    expect(cleanups).toBe(0);

    // Forking an ended conversation instance must throw
    expect(() => original.fork()).toThrow('Cannot fork a conversation that has already ended');

    await derived.end();
    expect(cleanups).toBe(1);

    expect(() => derived.fork()).toThrow('Cannot fork a conversation that has already ended');
  });
});
