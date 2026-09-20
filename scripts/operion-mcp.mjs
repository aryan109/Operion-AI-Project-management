#!/usr/bin/env node

/**
 * Operion MCP Stdio Bridge
 * Bridges standard input/output (used by Claude Desktop, Antigravity IDE, Cursor)
 * to the hosted Operion production MCP server at https://operion-ai-project-management.vercel.app/api/mcp
 */

import readline from "node:readline";

const HOSTED_URL =
  process.env.OPERION_MCP_URL ||
  "https://operion-ai-project-management.vercel.app/api/mcp";

const WORKSPACE_ID =
  process.env.OPERION_WORKSPACE_ID ||
  "adf9eb9c-f483-4d66-9433-a91b7d34ce39";

const API_KEY = process.env.OPERION_API_KEY || "";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const jsonRpcRequest = JSON.parse(trimmed);

    // If it's a notification without id (e.g. notifications/initialized), acknowledge silently
    if (jsonRpcRequest.id === undefined || jsonRpcRequest.id === null) {
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      "x-organization-id": WORKSPACE_ID,
    };

    if (API_KEY) {
      headers["Authorization"] = `Bearer ${API_KEY}`;
    }

    const res = await fetch(HOSTED_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(jsonRpcRequest),
    });

    if (!res.ok) {
      const errText = await res.text();
      const errResponse = {
        jsonrpc: "2.0",
        id: jsonRpcRequest.id,
        error: {
          code: -32000,
          message: `Server returned HTTP ${res.status}: ${errText}`,
        },
      };
      process.stdout.write(JSON.stringify(errResponse) + "\n");
      return;
    }

    const jsonRpcResponse = await res.json();
    process.stdout.write(JSON.stringify(jsonRpcResponse) + "\n");
  } catch (err) {
    process.stderr.write(`[operion-mcp] Error: ${err.message}\n`);
  }
});
