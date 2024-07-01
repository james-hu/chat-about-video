export interface ChatApiClientOptions<CS, CO> {
  credential: {
    key: string;
  };
  endpoint?: string;
  deploymentName: string;
  clientSettings: CS;
  completionOptions?: CO;
}

export interface ChatAPI<CLIENT, OPTIONS, PROMPT, RESPONSE> {
  /**
   * Get the raw client.
   * This function could be useful for advanced use cases.
   * @returns The raw client.
   */
  getClient(): Promise<CLIENT>;
  /**
   * Append a new prompt or response to the form a full prompt.
   * This function is useful to build a prompt that contains conversation history.
   * @param newPromptOrResponse A new prompt to be appended, or previous response to be appended.
   * @param prompt The conversation history which is a prompt containing previous prompts and responses.
   *               If it is not provided, the conversation history returned will contain only what is in newPromptOrResponse.
   * @returns The full prompt which is effectively the conversation history.
   */
  appendToPrompt(newPromptOrResponse: PROMPT | RESPONSE, prompt?: PROMPT): Promise<PROMPT>;
  /**
   * Generate content based on the given prompt and options.
   * @param prompt The full prompt to generate content.
   * @param options Optional options to control the content generation.
   * @returns The generated content.
   */
  generateContent(prompt: PROMPT, options?: OPTIONS): Promise<RESPONSE>;

  /**
   * Build prompt for sending video content to AI
   * @param videoFile Path to the video file.
   * @param conversationId Unique identifier of the conversation.
   * @returns An object containing the prompt, optional options, and a cleanup function.
   */
  buildVideoPrompt(
    videoFile: string,
    conversationId?: string,
  ): Promise<{
    prompt: PROMPT;
    options?: OPTIONS;
    cleanup?: () => Promise<void>;
  }>;

  /**
   * Build prompt for sending text content to AI
   * @param text The text content to be sent.
   * @param conversationId Unique identifier of the conversation.
   * @returns An object containing the prompt.
   */
  buildTextPrompt(
    text: string,
    conversationId?: string,
  ): Promise<{
    prompt: PROMPT;
  }>;
}
