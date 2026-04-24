#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { lint } from "./linter.mjs";

const server = new Server(
  { name: "promptlint", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "lint_prompt",
      description:
        "Static-analyze an AI prompt (system prompt, agent instructions, tool definitions) for contradictions, redundancy, ambiguity, long examples, and politeness fluff. Returns a score (0–100), issue list, trimmed version, and token savings. Response has two text content items: [0] human summary, [1] full JSON — parse with JSON.parse(result.content[1].text) for structured access.",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The prompt text to analyze.",
          },
        },
        required: ["text"],
      },
    },
    {
      name: "trim_prompt",
      description:
        "Return a mechanically-trimmed version of the prompt with politeness fluff removed and whitespace compacted. Scope: drops sentences whose core intent is thanks/apology/invitation-to-ask (e.g. 'Thank you for …', 'Let me know if …'); removes 'Please'/'Kindly' prefixes and re-capitalizes. Does NOT resolve contradictions, redundancy, or ambiguity — run lint_prompt for those. Fenced code blocks are preserved verbatim.",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The prompt text to trim.",
          },
        },
        required: ["text"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const text = args?.text ?? "";

  if (name === "lint_prompt") {
    const result = lint(text);
    const summary =
      `score: ${result.score}/100 · issues: ${result.issues.length} · ` +
      `tokens: ${result.tokensBefore} → ${result.tokensAfter} (-${result.saved}, ${result.savedPercent}%)`;
    return {
      content: [
        { type: "text", text: summary },
        { type: "text", text: JSON.stringify(result, null, 2) },
      ],
    };
  }

  if (name === "trim_prompt") {
    const result = lint(text);
    return {
      content: [
        { type: "text", text: result.trimmed },
        {
          type: "text",
          text: `\n---\nSaved ${result.saved} tokens (${result.savedPercent}%). Original: ${result.tokensBefore}, trimmed: ${result.tokensAfter}.`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write("promptlint-mcp ready on stdio\n");
