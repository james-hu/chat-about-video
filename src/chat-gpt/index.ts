import type { ChatCompletions, GetChatCompletionsOptions, OpenAIClientOptions } from '@azure/openai';

import { OpenAIClient } from '@azure/openai';

import { ChatAPI, ChatApiClientOptions } from '../types';

export type ChatGptClientOptions = ChatApiClientOptions<OpenAIClientOptions, GetChatCompletionsOptions>;

export type ChatGptPromptContent = Parameters<OpenAIClient['getChatCompletions']>[1];
export type ChatGptCompletionOptions = Parameters<OpenAIClient['getChatCompletions']>[2];

export class ChatGptApi implements ChatAPI<OpenAIClient, ChatGptCompletionOptions, ChatGptPromptContent, ChatCompletions> {
  protected client: OpenAIClient;

  constructor(protected options: ChatGptClientOptions) {
    const { credential, endpoint, clientSettings } = options;
    this.client = endpoint ? new OpenAIClient(endpoint, credential, clientSettings) : new OpenAIClient(credential, clientSettings);
  }

  async getClient(): Promise<OpenAIClient> {
    return this.client;
  }

  async generateContent(prompt: ChatGptPromptContent, options: ChatGptCompletionOptions): Promise<ChatCompletions> {
    const { deploymentName, completionOptions } = this.options;
    return this.client.getChatCompletions(deploymentName, prompt, { ...completionOptions, ...options });
  }

  async appendToPrompt(newPromptOrResponse: ChatGptPromptContent | ChatCompletions, prompt?: ChatGptPromptContent): Promise<ChatGptPromptContent> {
    prompt = prompt ?? [];
    if (isChatCompletions(newPromptOrResponse)) {
      const responseText = getResponseText(newPromptOrResponse) ?? '';
      prompt.push({
        role: 'assistant',
        content: responseText,
      });
    } else {
      prompt.push(...newPromptOrResponse);
    }
    return prompt;
  }

  async buildTextPrompt(text: string, _conversationId?: string): Promise<{ prompt: ChatGptPromptContent }> {
    return {
      prompt: [
        {
          role: 'user',
          content: text,
        },
      ],
    };
  }
}

function isChatCompletions(obj: any): obj is ChatCompletions {
  return Array.isArray(obj.choices);
}

function getResponseText(result: ChatCompletions): string | undefined {
  return result?.choices?.[0]?.message?.content ?? undefined;
}
