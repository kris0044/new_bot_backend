import { tool } from '@openrouter/sdk';
import { z } from 'zod';

export const calculatorTool = tool({
  name: 'calculate',
  description: 'Perform mathematical calculations',
  inputSchema: z.object({
    expression: z.string().describe('Math expression (e.g., "2 + 2", "sqrt(16)")'),
  }),
  execute: async ({ expression }) => {
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    const result = Function(`"use strict"; return (${sanitized})`)();
    return { expression, result };
  },
});

export const webSearchTool = tool({
  name: 'web_search',
  description: 'Search the web for information',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
  }),
  execute: async ({ query }) => {
    return { query, info: 'Web search executed' };
  },
});

export const defaultTools = [calculatorTool, webSearchTool];