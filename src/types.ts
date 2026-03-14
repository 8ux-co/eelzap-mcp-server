import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { ZodTypeAny } from 'zod';

export type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema?: ZodTypeAny;
  annotations: ToolAnnotations;
  handler: (args: any) => Promise<unknown>;
};
