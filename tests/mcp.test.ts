import { describe, it, expect } from 'vitest';
import { FABRIC_MCP_TOOLS } from '../src/routes/mcp/tools.js';

describe('MCP tool definitions', () => {
  it('defines exactly 6 tools', () => {
    expect(FABRIC_MCP_TOOLS).toHaveLength(6);
  });

  it('all tools have required fields', () => {
    for (const tool of FABRIC_MCP_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeTruthy();
    }
  });

  it('tool names follow fabric_ prefix convention', () => {
    for (const tool of FABRIC_MCP_TOOLS) {
      expect(tool.name).toMatch(/^fabric_/);
    }
  });

  const expectedTools = [
    'fabric_discover',
    'fabric_route',
    'fabric_evaluate',
    'fabric_feedback',
    'fabric_budget',
    'fabric_favorites',
  ];

  for (const name of expectedTools) {
    it(`includes ${name}`, () => {
      expect(FABRIC_MCP_TOOLS.find((t) => t.name === name)).toBeTruthy();
    });
  }

  it('fabric_discover requires category', () => {
    const tool = FABRIC_MCP_TOOLS.find((t) => t.name === 'fabric_discover')!;
    expect(tool.inputSchema.required).toContain('category');
  });

  it('fabric_route requires agentId, category, input', () => {
    const tool = FABRIC_MCP_TOOLS.find((t) => t.name === 'fabric_route')!;
    expect(tool.inputSchema.required).toContain('agentId');
    expect(tool.inputSchema.required).toContain('category');
    expect(tool.inputSchema.required).toContain('input');
  });

  it('fabric_evaluate requires providerId', () => {
    const tool = FABRIC_MCP_TOOLS.find((t) => t.name === 'fabric_evaluate')!;
    expect(tool.inputSchema.required).toContain('providerId');
  });

  it('fabric_feedback requires transactionId and score', () => {
    const tool = FABRIC_MCP_TOOLS.find((t) => t.name === 'fabric_feedback')!;
    expect(tool.inputSchema.required).toContain('transactionId');
    expect(tool.inputSchema.required).toContain('score');
  });

  it('fabric_budget requires action', () => {
    const tool = FABRIC_MCP_TOOLS.find((t) => t.name === 'fabric_budget')!;
    expect(tool.inputSchema.required).toContain('action');
  });

  it('fabric_favorites requires action', () => {
    const tool = FABRIC_MCP_TOOLS.find((t) => t.name === 'fabric_favorites')!;
    expect(tool.inputSchema.required).toContain('action');
  });

  it('descriptions are at least 50 chars', () => {
    for (const tool of FABRIC_MCP_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(50);
    }
  });

  it('no duplicate tool names', () => {
    const names = FABRIC_MCP_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
