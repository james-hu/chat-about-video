/* eslint-disable unicorn/prefer-module */
// This is a test verifying that ChatGPT style tool calling works with Gemini.
//
// This script can be executed with a command line like this from the project root directory:
// export GEMINI_API_KEY=...
// npx ts-node test/integration/gemini-chatgpt-style-tools.ts

import { consoleWithColour } from '@handy-common-utils/misc-utils';
/* eslint-disable node/no-unpublished-import */
import chalk from 'chalk';
import path from 'node:path';
import readline from 'node:readline';

import { ChatAboutVideo, ConversationResponse, ConversationWithGemini, ToolCallResult } from '../../src';

async function demo() {
  const chat = new ChatAboutVideo(
    {
      credential: {
        key: process.env.GEMINI_API_KEY!,
      },
      clientSettings: {
        modelParams: {
          model: 'gemini-2.5-flash',
        },
      },
      extractVideoFrames: {
        limit: 100,
        interval: 0.5,
      },
      completionOptions: {
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH' as any,
            threshold: 'BLOCK_NONE' as any,
          },
        ],
      },
    },
    consoleWithColour({ debug: process.env.ENABLE_DEBUG === 'true' }, chalk),
  );

  const conversation = (await chat.startConversation(
    path.resolve(__dirname, '../sample-media-files/engine-start.h264.aac.mp4'),
  )) as ConversationWithGemini;

  // ChatGPT style tools
  const tools: any[] = [
    {
      type: 'function',
      function: {
        name: 'get_weather_forecast',
        description: 'Get the current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city and state, e.g. San Francisco, CA',
            },
          },
          required: ['location'],
        },
      },
    },
    ...exampleTools,
  ];

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(chalk.cyan('Testing ChatGPT style tools with Gemini...'));

  const question = 'What is the weather in San Francisco?';
  console.log(chalk.red('\nUser: ') + question);

  let response = await conversation.say<ConversationResponse>(question, {
    tools,
  });

  if (typeof response !== 'string' && response?.toolCalls) {
    const toolResults: ToolCallResult[] = [];
    for (const call of response.toolCalls) {
      console.log(chalk.yellow(`AI requests tool: ${call.name}(${JSON.stringify(call.arguments)})`));

      const result = call.name === 'get_weather_forecast' ? { forecast: 'Sunny', temperature: '25C' } : { error: 'Unknown tool' };

      toolResults.push({
        name: call.name,
        result,
      });
    }
    response = await conversation.submitToolCallResults(toolResults);
  }

  console.log(chalk.blue('\nAI: ' + response));

  await conversation.end();
  console.log('Demo finished');
  rl.close();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
demo().catch((error) => console.log(chalk.red(JSON.stringify(error, null, 2)), error));

const exampleTools = [
  {
    type: 'function',
    function: {
      name: 'start_meeting',
      description: 'Start a new group meeting with the specified attendees. The first attendee is the host.',
      parameters: {
        type: 'object',
        properties: {
          attendees: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Email addresses of meeting attendees. First one is the host.',
          },
        },
        required: ['attendees'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finish_meeting',
      description: 'End an in-progress meeting.',
      parameters: {
        type: 'object',
        properties: {
          meetingId: {
            type: 'string',
            description: 'The ID of the meeting to finish.',
          },
        },
        required: ['meetingId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_meeting_content',
      description: 'Get the transcript/content of an in-progress or finished meeting by its ID.',
      parameters: {
        type: 'object',
        properties: {
          meetingId: {
            type: 'string',
            description: 'The ID of the meeting to retrieve.',
          },
        },
        required: ['meetingId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'say_in_meeting',
      description: 'Say something in an ongoing meeting. The speaker must be an attendee of the meeting.',
      parameters: {
        type: 'object',
        properties: {
          meetingId: {
            type: 'string',
            description: 'The ID of the meeting.',
          },
          speaker: {
            type: 'string',
            description: 'The email address of the speaker.',
          },
          content: {
            type: 'string',
            description: 'What the speaker said.',
          },
        },
        required: ['meetingId', 'speaker', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: "Send an email. Uses the agent's configured email account.",
      parameters: {
        type: 'object',
        properties: {
          to: {
            anyOf: [
              {
                type: 'string',
              },
              {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            ],
            description: 'Recipient(s) - email address or array of addresses.',
          },
          cc: {
            anyOf: [
              {
                type: 'string',
              },
              {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            ],
            description: 'CC recipient(s).',
          },
          subject: {
            type: 'string',
            description: 'Email subject.',
          },
          bodyText: {
            type: 'string',
            description: 'Plain text body of the email.',
          },
        },
        required: ['to', 'subject', 'bodyText'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_email_private_comment',
      description:
        'Add a private comment/note to an email. These comments are only visible to the agent and are persisted in the email index. This is a good way to keep track of important information or status of an email across different work sessions. Identify the email by its Message-ID (e.g. <xxx@domain>) from the email content.',
      parameters: {
        type: 'object',
        properties: {
          messageId: {
            type: 'string',
            description: 'The Message-ID (e.g. <xxx@domain>) of the email to comment on.',
          },
          comment: {
            type: 'string',
            description: 'The private comment to add to the email.',
          },
        },
        required: ['messageId', 'comment'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'archive_email',
      description:
        'Archive an email to hide it from future work sessions. Use this for emails that are handled, read, or no longer relevant, to reduce noise. Identify the email by its Message-ID (e.g. <xxx@domain>) from the email content.',
      parameters: {
        type: 'object',
        properties: {
          messageId: {
            type: 'string',
            description: 'The Message-ID (e.g. <xxx@domain>) of the email to archive.',
          },
        },
        required: ['messageId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_memory',
      description:
        'Update your long-term memory. Use this to record important information, unfinished plans, and background context for future work.',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The full markdown content of your memory. This will overwrite the existing memory.',
          },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tavily_search',
      description:
        'Search the web for current information on any topic. Use for news, facts, or data beyond your knowledge cutoff. Returns snippets and source URLs.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          search_depth: {
            type: 'string',
            enum: ['basic', 'advanced', 'fast', 'ultra-fast'],
            description:
              "The depth of the search. 'basic' for generic results, 'advanced' for more thorough search, 'fast' for optimized low latency with high relevance, 'ultra-fast' for prioritizing latency above all else",
            default: 'basic',
          },
          topic: {
            type: 'string',
            enum: ['general'],
            description: 'The category of the search. This will determine which of our agents will be used for the search',
            default: 'general',
          },
          time_range: {
            type: 'string',
            description: 'The time range back from the current date to include in the search results',
            enum: ['day', 'week', 'month', 'year'],
          },
          start_date: {
            type: 'string',
            description: 'Will return all results after the specified start date. Required to be written in the format YYYY-MM-DD.',
            default: '',
          },
          end_date: {
            type: 'string',
            description: 'Will return all results before the specified end date. Required to be written in the format YYYY-MM-DD',
            default: '',
          },
          max_results: {
            type: 'number',
            description: 'The maximum number of search results to return',
            default: 5,
            minimum: 5,
            maximum: 20,
          },
          include_images: {
            type: 'boolean',
            description: 'Include a list of query-related images in the response',
            default: false,
          },
          include_image_descriptions: {
            type: 'boolean',
            description: 'Include a list of query-related images and their descriptions in the response',
            default: false,
          },
          include_raw_content: {
            type: 'boolean',
            description: 'Include the cleaned and parsed HTML content of each search result',
            default: false,
          },
          include_domains: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'A list of domains to specifically include in the search results, if the user asks to search on specific sites set this to the domain of the site',
            default: [],
          },
          exclude_domains: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'List of domains to specifically exclude, if the user asks to exclude a domain set this to the domain of the site',
            default: [],
          },
          country: {
            type: 'string',
            description:
              'Boost search results from a specific country. This will prioritize content from the selected country in the search results. Available only if topic is general.',
            default: '',
          },
          include_favicon: {
            type: 'boolean',
            description: 'Whether to include the favicon URL for each result',
            default: false,
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tavily_extract',
      description: 'Extract content from URLs. Returns raw page content in markdown or text format.',
      parameters: {
        type: 'object',
        properties: {
          urls: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'List of URLs to extract content from',
          },
          extract_depth: {
            type: 'string',
            enum: ['basic', 'advanced'],
            description: "Use 'advanced' for LinkedIn, protected sites, or tables/embedded content",
            default: 'basic',
          },
          include_images: {
            type: 'boolean',
            description: 'Include images from pages',
            default: false,
          },
          format: {
            type: 'string',
            enum: ['markdown', 'text'],
            description: 'Output format',
            default: 'markdown',
          },
          include_favicon: {
            type: 'boolean',
            description: 'Include favicon URLs',
            default: false,
          },
          query: {
            type: 'string',
            description: 'Query to rerank content chunks by relevance',
          },
        },
        required: ['urls'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tavily_crawl',
      description: 'Crawl a website starting from a URL. Extracts content from pages with configurable depth and breadth.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The root URL to begin the crawl',
          },
          max_depth: {
            type: 'integer',
            description: 'Max depth of the crawl. Defines how far from the base URL the crawler can explore.',
            default: 1,
            minimum: 1,
          },
          max_breadth: {
            type: 'integer',
            description: 'Max number of links to follow per level of the tree (i.e., per page)',
            default: 20,
            minimum: 1,
          },
          limit: {
            type: 'integer',
            description: 'Total number of links the crawler will process before stopping',
            default: 50,
            minimum: 1,
          },
          instructions: {
            type: 'string',
            description: 'Natural language instructions for the crawler. Instructions specify which types of pages the crawler should return.',
          },
          select_paths: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Regex patterns to select only URLs with specific path patterns (e.g., /docs/.*, /api/v1.*)',
            default: [],
          },
          select_domains: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: String.raw`Regex patterns to restrict crawling to specific domains or subdomains (e.g., ^docs\.example\.com$)`,
            default: [],
          },
          allow_external: {
            type: 'boolean',
            description: 'Whether to return external links in the final response',
            default: true,
          },
          extract_depth: {
            type: 'string',
            enum: ['basic', 'advanced'],
            description:
              'Advanced extraction retrieves more data, including tables and embedded content, with higher success but may increase latency',
            default: 'basic',
          },
          format: {
            type: 'string',
            enum: ['markdown', 'text'],
            description:
              'The format of the extracted web page content. markdown returns content in markdown format. text returns plain text and may increase latency.',
            default: 'markdown',
          },
          include_favicon: {
            type: 'boolean',
            description: 'Whether to include the favicon URL for each result',
            default: false,
          },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tavily_map',
      description: "Map a website's structure. Returns a list of URLs found starting from the base URL.",
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The root URL to begin the mapping',
          },
          max_depth: {
            type: 'integer',
            description: 'Max depth of the mapping. Defines how far from the base URL the crawler can explore',
            default: 1,
            minimum: 1,
          },
          max_breadth: {
            type: 'integer',
            description: 'Max number of links to follow per level of the tree (i.e., per page)',
            default: 20,
            minimum: 1,
          },
          limit: {
            type: 'integer',
            description: 'Total number of links the crawler will process before stopping',
            default: 50,
            minimum: 1,
          },
          instructions: {
            type: 'string',
            description: 'Natural language instructions for the crawler',
          },
          select_paths: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Regex patterns to select only URLs with specific path patterns (e.g., /docs/.*, /api/v1.*)',
            default: [],
          },
          select_domains: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: String.raw`Regex patterns to restrict crawling to specific domains or subdomains (e.g., ^docs\.example\.com$)`,
            default: [],
          },
          allow_external: {
            type: 'boolean',
            description: 'Whether to return external links in the final response',
            default: true,
          },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tavily_research',
      description:
        'Perform comprehensive research on a given topic or question. Use this tool when you need to gather information from multiple sources to answer a question or complete a task. Returns a detailed response based on the research findings.',
      parameters: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'A comprehensive description of the research task',
          },
          model: {
            type: 'string',
            enum: ['mini', 'pro', 'auto'],
            description:
              "Defines the degree of depth of the research. 'mini' is good for narrow tasks with few subtopics. 'pro' is good for broad tasks with many subtopics. 'auto' automatically selects the best model.",
            default: 'auto',
          },
        },
        required: ['input'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: 'Retrieve web page content from a specified URL',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL to fetch. Make sure to include the schema (http:// or https:// if not defined, preferring https for most cases)',
          },
          timeout: {
            type: 'number',
            description: 'Page loading timeout in milliseconds, default is 30000 (30 seconds)',
          },
          waitUntil: {
            type: 'string',
            description:
              "Specifies when navigation is considered complete, options: 'load', 'domcontentloaded', 'networkidle', 'commit', default is 'load'",
          },
          extractContent: {
            type: 'boolean',
            description: 'Whether to intelligently extract the main content, default is true',
          },
          maxLength: {
            type: 'number',
            description: 'Maximum length of returned content (in characters), default is no limit',
          },
          returnHtml: {
            type: 'boolean',
            description: 'Whether to return HTML content instead of Markdown, default is false',
          },
          waitForNavigation: {
            type: 'boolean',
            description:
              'Whether to wait for additional navigation after initial page load (useful for sites with anti-bot verification), default is false',
          },
          navigationTimeout: {
            type: 'number',
            description: 'Maximum time to wait for additional navigation in milliseconds, default is 10000 (10 seconds)',
          },
          disableMedia: {
            type: 'boolean',
            description: 'Whether to disable media resources (images, stylesheets, fonts, media), default is true',
          },
          debug: {
            type: 'boolean',
            description: 'Whether to enable debug mode (showing browser window), overrides the --debug command line flag if specified',
          },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_urls',
      description: 'Retrieve web page content from multiple specified URLs',
      parameters: {
        type: 'object',
        properties: {
          urls: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Array of URLs to fetch',
          },
          timeout: {
            type: 'number',
            description: 'Page loading timeout in milliseconds, default is 30000 (30 seconds)',
          },
          waitUntil: {
            type: 'string',
            description:
              "Specifies when navigation is considered complete, options: 'load', 'domcontentloaded', 'networkidle', 'commit', default is 'load'",
          },
          extractContent: {
            type: 'boolean',
            description: 'Whether to intelligently extract the main content, default is true',
          },
          maxLength: {
            type: 'number',
            description: 'Maximum length of returned content (in characters), default is no limit',
          },
          returnHtml: {
            type: 'boolean',
            description: 'Whether to return HTML content instead of Markdown, default is false',
          },
          waitForNavigation: {
            type: 'boolean',
            description:
              'Whether to wait for additional navigation after initial page load (useful for sites with anti-bot verification), default is false',
          },
          navigationTimeout: {
            type: 'number',
            description: 'Maximum time to wait for additional navigation in milliseconds, default is 10000 (10 seconds)',
          },
          disableMedia: {
            type: 'boolean',
            description: 'Whether to disable media resources (images, stylesheets, fonts, media), default is true',
          },
          debug: {
            type: 'boolean',
            description: 'Whether to enable debug mode (showing browser window), overrides the --debug command line flag if specified',
          },
        },
        required: ['urls'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browser_install',
      description: 'Install Playwright Chromium browser binary. Call this if you get an error about the browser not being installed.',
      parameters: {
        type: 'object',
        properties: {
          withDeps: {
            type: 'boolean',
            description: 'Install system dependencies required by Chromium browser. Default is false',
            default: false,
          },
          force: {
            type: 'boolean',
            description: 'Force installation even if Chromium is already installed. Default is false',
            default: false,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'click',
      description: 'Clicks on the provided element',
      parameters: {
        type: 'object',
        properties: {
          uid: {
            type: 'string',
            description: 'The uid of an element on the page from the page content snapshot',
          },
          dblClick: {
            type: 'boolean',
            description: 'Set to true for double clicks. Default is false.',
          },
          includeSnapshot: {
            type: 'boolean',
            description: 'Whether to include a snapshot in the response. Default is false.',
          },
        },
        required: ['uid'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'close_page',
      description: 'Closes the page by its index. The last open page cannot be closed.',
      parameters: {
        type: 'object',
        properties: {
          pageId: {
            type: 'number',
            description: 'The ID of the page to close. Call list_pages to list pages.',
          },
        },
        required: ['pageId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'drag',
      description: 'Drag an element onto another element',
      parameters: {
        type: 'object',
        properties: {
          from_uid: {
            type: 'string',
            description: 'The uid of the element to drag',
          },
          to_uid: {
            type: 'string',
            description: 'The uid of the element to drop into',
          },
          includeSnapshot: {
            type: 'boolean',
            description: 'Whether to include a snapshot in the response. Default is false.',
          },
        },
        required: ['from_uid', 'to_uid'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'emulate',
      description: 'Emulates various features on the selected page.',
      parameters: {
        type: 'object',
        properties: {
          networkConditions: {
            type: 'string',
            enum: ['No emulation', 'Offline', 'Slow 3G', 'Fast 3G', 'Slow 4G', 'Fast 4G'],
            description: 'Throttle network. Set to "No emulation" to disable. If omitted, conditions remain unchanged.',
          },
          cpuThrottlingRate: {
            type: 'number',
            minimum: 1,
            maximum: 20,
            description: 'Represents the CPU slowdown factor. Set the rate to 1 to disable throttling. If omitted, throttling remains unchanged.',
          },
          geolocation: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  latitude: {
                    type: 'number',
                    minimum: -90,
                    maximum: 90,
                    description: 'Latitude between -90 and 90.',
                  },
                  longitude: {
                    type: 'number',
                    minimum: -180,
                    maximum: 180,
                    description: 'Longitude between -180 and 180.',
                  },
                },
                required: ['latitude', 'longitude'],
                additionalProperties: false,
              },
              {
                type: 'null',
              },
            ],
            description: 'Geolocation to emulate. Set to null to clear the geolocation override.',
          },
          userAgent: {
            type: ['string', 'null'],
            description: 'User agent to emulate. Set to null to clear the user agent override.',
          },
          colorScheme: {
            type: 'string',
            enum: ['dark', 'light', 'auto'],
            description: 'Emulate the dark or the light mode. Set to "auto" to reset to the default.',
          },
          viewport: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  width: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Page width in pixels.',
                  },
                  height: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Page height in pixels.',
                  },
                  deviceScaleFactor: {
                    type: 'number',
                    minimum: 0,
                    description: 'Specify device scale factor (can be thought of as dpr).',
                  },
                  isMobile: {
                    type: 'boolean',
                    description: 'Whether the meta viewport tag is taken into account. Defaults to false.',
                  },
                  hasTouch: {
                    type: 'boolean',
                    description: 'Specifies if viewport supports touch events. This should be set to true for mobile devices.',
                  },
                  isLandscape: {
                    type: 'boolean',
                    description: 'Specifies if viewport is in landscape mode. Defaults to false.',
                  },
                },
                required: ['width', 'height'],
                additionalProperties: false,
              },
              {
                type: 'null',
              },
            ],
            description: 'Viewport to emulate. Set to null to reset to the default viewport.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'evaluate_script',
      description:
        'Evaluate a JavaScript function inside the currently selected page. Returns the response as JSON,\nso returned values have to be JSON-serializable.',
      parameters: {
        type: 'object',
        properties: {
          function: {
            type: 'string',
            description:
              'A JavaScript function declaration to be executed by the tool in the currently selected page.\nExample without arguments: `() => {\n  return document.title\n}` or `async () => {\n  return await fetch("example.com")\n}`.\nExample with arguments: `(el) => {\n  return el.innerText;\n}`\n',
          },
          args: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                uid: {
                  type: 'string',
                  description: 'The uid of an element on the page from the page content snapshot',
                },
              },
              required: ['uid'],
              additionalProperties: false,
            },
            description: 'An optional list of arguments to pass to the function.',
          },
        },
        required: ['function'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fill',
      description: 'Type text into a input, text area or select an option from a <select> element.',
      parameters: {
        type: 'object',
        properties: {
          uid: {
            type: 'string',
            description: 'The uid of an element on the page from the page content snapshot',
          },
          value: {
            type: 'string',
            description: 'The value to fill in',
          },
          includeSnapshot: {
            type: 'boolean',
            description: 'Whether to include a snapshot in the response. Default is false.',
          },
        },
        required: ['uid', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fill_form',
      description: 'Fill out multiple form elements at once',
      parameters: {
        type: 'object',
        properties: {
          elements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                uid: {
                  type: 'string',
                  description: 'The uid of the element to fill out',
                },
                value: {
                  type: 'string',
                  description: 'Value for the element',
                },
              },
              required: ['uid', 'value'],
              additionalProperties: false,
            },
            description: 'Elements from snapshot to fill out.',
          },
          includeSnapshot: {
            type: 'boolean',
            description: 'Whether to include a snapshot in the response. Default is false.',
          },
        },
        required: ['elements'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_console_message',
      description: 'Gets a console message by its ID. You can get all messages by calling list_console_messages.',
      parameters: {
        type: 'object',
        properties: {
          msgid: {
            type: 'number',
            description: 'The msgid of a console message on the page from the listed console messages',
          },
        },
        required: ['msgid'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_network_request',
      description: 'Gets a network request by an optional reqid, if omitted returns the currently selected request in the DevTools Network panel.',
      parameters: {
        type: 'object',
        properties: {
          reqid: {
            type: 'number',
            description: 'The reqid of the network request. If omitted returns the currently selected request in the DevTools Network panel.',
          },
          requestFilePath: {
            type: 'string',
            description: 'The absolute or relative path to save the request body to. If omitted, the body is returned inline.',
          },
          responseFilePath: {
            type: 'string',
            description: 'The absolute or relative path to save the response body to. If omitted, the body is returned inline.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'handle_dialog',
      description: 'If a browser dialog was opened, use this command to handle it',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['accept', 'dismiss'],
            description: 'Whether to dismiss or accept the dialog',
          },
          promptText: {
            type: 'string',
            description: 'Optional prompt text to enter into the dialog.',
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'hover',
      description: 'Hover over the provided element',
      parameters: {
        type: 'object',
        properties: {
          uid: {
            type: 'string',
            description: 'The uid of an element on the page from the page content snapshot',
          },
          includeSnapshot: {
            type: 'boolean',
            description: 'Whether to include a snapshot in the response. Default is false.',
          },
        },
        required: ['uid'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_console_messages',
      description: 'List all console messages for the currently selected page since the last navigation.',
      parameters: {
        type: 'object',
        properties: {
          pageSize: {
            type: 'integer',
            exclusiveMinimum: 0,
            description: 'Maximum number of messages to return. When omitted, returns all requests.',
          },
          pageIdx: {
            type: 'integer',
            minimum: 0,
            description: 'Page number to return (0-based). When omitted, returns the first page.',
          },
          types: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'log',
                'debug',
                'info',
                'error',
                'warn',
                'dir',
                'dirxml',
                'table',
                'trace',
                'clear',
                'startGroup',
                'startGroupCollapsed',
                'endGroup',
                'assert',
                'profile',
                'profileEnd',
                'count',
                'timeEnd',
                'verbose',
                'issue',
              ],
            },
            description: 'Filter messages to only return messages of the specified resource types. When omitted or empty, returns all messages.',
          },
          includePreservedMessages: {
            type: 'boolean',
            default: false,
            description: 'Set to true to return the preserved messages over the last 3 navigations.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_network_requests',
      description: 'List all requests for the currently selected page since the last navigation.',
      parameters: {
        type: 'object',
        properties: {
          pageSize: {
            type: 'integer',
            exclusiveMinimum: 0,
            description: 'Maximum number of requests to return. When omitted, returns all requests.',
          },
          pageIdx: {
            type: 'integer',
            minimum: 0,
            description: 'Page number to return (0-based). When omitted, returns the first page.',
          },
          resourceTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'document',
                'stylesheet',
                'image',
                'media',
                'font',
                'script',
                'texttrack',
                'xhr',
                'fetch',
                'prefetch',
                'eventsource',
                'websocket',
                'manifest',
                'signedexchange',
                'ping',
                'cspviolationreport',
                'preflight',
                'fedcm',
                'other',
              ],
            },
            description: 'Filter requests to only return requests of the specified resource types. When omitted or empty, returns all requests.',
          },
          includePreservedRequests: {
            type: 'boolean',
            default: false,
            description: 'Set to true to return the preserved requests over the last 3 navigations.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_pages',
      description: 'Get a list of pages  open in the browser.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate_page',
      description: 'Navigates the currently selected page to a URL.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['url', 'back', 'forward', 'reload'],
            description: 'Navigate the page by URL, back or forward in history, or reload.',
          },
          url: {
            type: 'string',
            description: 'Target URL (only type=url)',
          },
          ignoreCache: {
            type: 'boolean',
            description: 'Whether to ignore cache on reload.',
          },
          handleBeforeUnload: {
            type: 'string',
            enum: ['accept', 'decline'],
            description: 'Whether to auto accept or beforeunload dialogs triggered by this navigation. Default is accept.',
          },
          initScript: {
            type: 'string',
            description: 'A JavaScript script to be executed on each new document before any other scripts for the next navigation.',
          },
          timeout: {
            type: 'integer',
            description: 'Maximum wait time in milliseconds. If set to 0, the default timeout will be used.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'new_page',
      description: 'Creates a new page',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL to load in a new page.',
          },
          background: {
            type: 'boolean',
            description: 'Whether to open the page in the background without bringing it to the front. Default is false (foreground).',
          },
          isolatedContext: {
            type: 'string',
            description:
              'If specified, the page is created in an isolated browser context with the given name. Pages in the same browser context share cookies and storage. Pages in different browser contexts are fully isolated.',
          },
          timeout: {
            type: 'integer',
            description: 'Maximum wait time in milliseconds. If set to 0, the default timeout will be used.',
          },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'performance_analyze_insight',
      description:
        'Provides more detailed information on a specific Performance Insight of an insight set that was highlighted in the results of a trace recording.',
      parameters: {
        type: 'object',
        properties: {
          insightSetId: {
            type: 'string',
            description: 'The id for the specific insight set. Only use the ids given in the "Available insight sets" list.',
          },
          insightName: {
            type: 'string',
            description: 'The name of the Insight you want more information on. For example: "DocumentLatency" or "LCPBreakdown"',
          },
        },
        required: ['insightSetId', 'insightName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'performance_start_trace',
      description:
        'Starts a performance trace recording on the selected page. This can be used to look for performance problems and insights to improve the performance of the page. It will also report Core Web Vital (CWV) scores for the page.',
      parameters: {
        type: 'object',
        properties: {
          reload: {
            type: 'boolean',
            description:
              'Determines if, once tracing has started, the current selected page should be automatically reloaded. Navigate the page to the right URL using the navigate_page tool BEFORE starting the trace if reload or autoStop is set to true.',
          },
          autoStop: {
            type: 'boolean',
            description: 'Determines if the trace recording should be automatically stopped.',
          },
          filePath: {
            type: 'string',
            description:
              'The absolute file path, or a file path relative to the current working directory, to save the raw trace data. For example, trace.json.gz (compressed) or trace.json (uncompressed).',
          },
        },
        required: ['reload', 'autoStop'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'performance_stop_trace',
      description: 'Stops the active performance trace recording on the selected page.',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description:
              'The absolute file path, or a file path relative to the current working directory, to save the raw trace data. For example, trace.json.gz (compressed) or trace.json (uncompressed).',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'press_key',
      description:
        'Press a key or key combination. Use this when other input methods like fill() cannot be used (e.g., keyboard shortcuts, navigation keys, or special key combinations).',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'A key or a combination (e.g., "Enter", "Control+A", "Control++", "Control+Shift+R"). Modifiers: Control, Shift, Alt, Meta',
          },
          includeSnapshot: {
            type: 'boolean',
            description: 'Whether to include a snapshot in the response. Default is false.',
          },
        },
        required: ['key'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resize_page',
      description: "Resizes the selected page's window so that the page has specified dimension",
      parameters: {
        type: 'object',
        properties: {
          width: {
            type: 'number',
            description: 'Page width',
          },
          height: {
            type: 'number',
            description: 'Page height',
          },
        },
        required: ['width', 'height'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'select_page',
      description: 'Select a page as a context for future tool calls.',
      parameters: {
        type: 'object',
        properties: {
          pageId: {
            type: 'number',
            description: 'The ID of the page to select. Call list_pages to get available pages.',
          },
          bringToFront: {
            type: 'boolean',
            description: 'Whether to focus the page and bring it to the top.',
          },
        },
        required: ['pageId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'take_memory_snapshot',
      description: 'Capture a memory heapsnapshot of the currently selected page to memory leak debugging',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'A path to a .heapsnapshot file to save the heapsnapshot to.',
          },
        },
        required: ['filePath'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'take_screenshot',
      description: 'Take a screenshot of the page or element.',
      parameters: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['png', 'jpeg', 'webp'],
            default: 'png',
            description: 'Type of format to save the screenshot as. Default is "png"',
          },
          quality: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description:
              'Compression quality for JPEG and WebP formats (0-100). Higher values mean better quality but larger file sizes. Ignored for PNG format.',
          },
          uid: {
            type: 'string',
            description: 'The uid of an element on the page from the page content snapshot. If omitted takes a pages screenshot.',
          },
          fullPage: {
            type: 'boolean',
            description: 'If set to true takes a screenshot of the full page instead of the currently visible viewport. Incompatible with uid.',
          },
          filePath: {
            type: 'string',
            description:
              'The absolute path, or a path relative to the current working directory, to save the screenshot to instead of attaching it to the response.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'take_snapshot',
      description:
        'Take a text snapshot of the currently selected page based on the a11y tree. The snapshot lists page elements along with a unique\nidentifier (uid). Always use the latest snapshot. Prefer taking a snapshot over taking a screenshot. The snapshot indicates the element selected\nin the DevTools Elements panel (if any).',
      parameters: {
        type: 'object',
        properties: {
          verbose: {
            type: 'boolean',
            description: 'Whether to include all possible information available in the full a11y tree. Default is false.',
          },
          filePath: {
            type: 'string',
            description:
              'The absolute path, or a path relative to the current working directory, to save the snapshot to instead of attaching it to the response.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'type_text',
      description: 'Type text using keyboard into a previously focused input',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to type',
          },
          submitKey: {
            type: 'string',
            description: 'Optional key to press after typing. E.g., "Enter", "Tab", "Escape"',
          },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'upload_file',
      description: 'Upload a file through a provided element.',
      parameters: {
        type: 'object',
        properties: {
          uid: {
            type: 'string',
            description: 'The uid of the file input element or an element that will open file chooser on the page from the page content snapshot',
          },
          filePath: {
            type: 'string',
            description: 'The local path of the file to upload',
          },
          includeSnapshot: {
            type: 'boolean',
            description: 'Whether to include a snapshot in the response. Default is false.',
          },
        },
        required: ['uid', 'filePath'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'wait_for',
      description: 'Wait for the specified text to appear on the selected page.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'array',
            items: {
              type: 'string',
            },
            minItems: 1,
            description: 'Non-empty list of texts. Resolves when any value appears on the page.',
          },
          timeout: {
            type: 'integer',
            description: 'Maximum wait time in milliseconds. If set to 0, the default timeout will be used.',
          },
        },
        required: ['text'],
      },
    },
  },
];
