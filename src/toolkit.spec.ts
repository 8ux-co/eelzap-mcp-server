import { describe, expect, it, vi } from 'vitest';
import {
  RICH_TEXT_INSTRUCTIONS,
  readOnlyAnnotations,
  createAnnotations,
  updateAnnotations,
  deleteAnnotations,
  registerTools,
  registerPrompts,
} from './toolkit.js';
import type { ToolDefinition } from './types.js';
import { z } from 'zod';

describe('annotation constants', () => {
  it('readOnlyAnnotations marks read-only, non-destructive, idempotent', () => {
    expect(readOnlyAnnotations.readOnlyHint).toBe(true);
    expect(readOnlyAnnotations.destructiveHint).toBe(false);
    expect(readOnlyAnnotations.idempotentHint).toBe(true);
  });

  it('createAnnotations marks read-write, non-destructive, non-idempotent', () => {
    expect(createAnnotations.readOnlyHint).toBe(false);
    expect(createAnnotations.destructiveHint).toBe(false);
    expect(createAnnotations.idempotentHint).toBe(false);
  });

  it('updateAnnotations marks read-write, non-destructive, idempotent', () => {
    expect(updateAnnotations.readOnlyHint).toBe(false);
    expect(updateAnnotations.destructiveHint).toBe(false);
    expect(updateAnnotations.idempotentHint).toBe(true);
  });

  it('deleteAnnotations marks destructive', () => {
    expect(deleteAnnotations.readOnlyHint).toBe(false);
    expect(deleteAnnotations.destructiveHint).toBe(true);
    expect(deleteAnnotations.idempotentHint).toBe(false);
  });
});

describe('RICH_TEXT_INSTRUCTIONS', () => {
  it('is a non-empty string', () => {
    expect(typeof RICH_TEXT_INSTRUCTIONS).toBe('string');
    expect(RICH_TEXT_INSTRUCTIONS.length).toBeGreaterThan(0);
  });

  it('mentions data-media-id', () => {
    expect(RICH_TEXT_INSTRUCTIONS).toContain('data-media-id');
  });
});

describe('registerTools', () => {
  function makeServer() {
    return {
      registerTool: vi.fn(),
    };
  }

  it('registers each tool on the server', () => {
    const server = makeServer();
    const handler = vi.fn().mockResolvedValue({ result: 'ok' });
    const tools: ToolDefinition[] = [
      {
        name: 'test_tool',
        title: 'Test Tool',
        description: 'A test tool',
        inputSchema: z.object({ foo: z.string() }),
        annotations: readOnlyAnnotations,
        handler,
      },
    ];

    registerTools(server as never, tools);

    expect(server.registerTool).toHaveBeenCalledTimes(1);
    expect(server.registerTool).toHaveBeenCalledWith(
      'test_tool',
      expect.objectContaining({
        title: 'Test Tool',
        description: 'A test tool',
      }),
      expect.any(Function),
    );
  });

  it('registers multiple tools', () => {
    const server = makeServer();
    const tools: ToolDefinition[] = [
      {
        name: 'tool_a',
        title: 'Tool A',
        description: 'A',
        inputSchema: z.object({}),
        annotations: readOnlyAnnotations,
        handler: vi.fn(),
      },
      {
        name: 'tool_b',
        title: 'Tool B',
        description: 'B',
        inputSchema: z.object({}),
        annotations: createAnnotations,
        handler: vi.fn(),
      },
    ];

    registerTools(server as never, tools);
    expect(server.registerTool).toHaveBeenCalledTimes(2);
  });

  it('handler wraps successful result in jsonResult', async () => {
    const server = makeServer();
    const handler = vi.fn().mockResolvedValue({ id: 'abc' });
    const tools: ToolDefinition[] = [
      {
        name: 'my_tool',
        title: 'My Tool',
        description: 'desc',
        inputSchema: z.object({}),
        annotations: readOnlyAnnotations,
        handler,
      },
    ];

    registerTools(server as never, tools);

    const [, , wrappedHandler] = server.registerTool.mock.calls[0] as [string, unknown, (args: unknown) => Promise<unknown>];
    const result = await wrappedHandler({});

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ id: 'abc' }, null, 2),
        },
      ],
    });
  });

  it('handler wraps thrown error in errorResult', async () => {
    const server = makeServer();
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    const tools: ToolDefinition[] = [
      {
        name: 'failing_tool',
        title: 'Failing Tool',
        description: 'desc',
        inputSchema: z.object({}),
        annotations: readOnlyAnnotations,
        handler,
      },
    ];

    registerTools(server as never, tools);

    const [, , wrappedHandler] = server.registerTool.mock.calls[0] as [string, unknown, (args: unknown) => Promise<unknown>];
    const result = await wrappedHandler({});

    expect(result).toEqual(
      expect.objectContaining({
        isError: true,
        content: [expect.objectContaining({ text: 'Error: boom' })],
      }),
    );
  });
});

describe('registerPrompts', () => {
  it('registers the system_instructions prompt', () => {
    const server = {
      prompt: vi.fn(),
    };

    registerPrompts(server as never);

    expect(server.prompt).toHaveBeenCalledWith(
      'system_instructions',
      expect.any(String),
      expect.any(Function),
    );
  });

  it('prompt callback returns rich text instructions as a user message', () => {
    const server = {
      prompt: vi.fn(),
    };

    registerPrompts(server as never);

    const [, , callback] = server.prompt.mock.calls[0] as [string, string, () => unknown];
    const result = callback() as { messages: Array<{ role: string; content: { type: string; text: string } }> };

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.role).toBe('user');
    expect(result.messages[0]?.content.type).toBe('text');
    expect(result.messages[0]?.content.text).toContain('RICH_TEXT');
  });
});
