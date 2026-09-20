# Operion Hosted MCP Server — Multi-Agent Configuration Guide
### Connecting Google Gemini, Anthropic Claude, and OpenAI ChatGPT

**Production MCP Server URL:** `https://operion-ai-project-management.vercel.app/api/mcp`  
**OpenAPI 3.1 Spec (for ChatGPT):** `https://operion-ai-project-management.vercel.app/api/v1/openapi.json`  
**Protocol Version:** MCP `2024-11-05` / JSON-RPC 2.0  
**Capabilities:** 31 Domain Tools & 4 Pre-shaped Resources  

---

## 1. Quick Start & Prerequisites

To allow an external AI agent (Claude, Gemini, or ChatGPT) to interact with your hosted workspace, you need two items:

1. **Your Workspace ID:** Found on your Operion **Settings** page (e.g. `adf9eb9c-f483-4d66-9433-a91b7d34ce39`).
2. **An Operion API Key:** Generated under **Settings → API Keys for External Agents** (starts with `opk_...`).

The server authenticates requests via:
- `Authorization: Bearer <YOUR_API_KEY>`
- `x-organization-id: <YOUR_WORKSPACE_ID>`

---

## 2. Anthropic Claude Desktop & Cursor IDE

### A. Claude Desktop Setup

Claude Desktop supports MCP servers via stdio bridges. The recommended and simplest way to connect Claude Desktop to Operion's hosted cloud server is using `mcp-remote`.

#### 1. Locate your configuration file:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json` (usually `C:\Users\<Username>\AppData\Roaming\Claude\claude_desktop_config.json`)

#### 2. Add the Operion MCP server configuration:
```json
{
  "mcpServers": {
    "operion": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://operion-ai-project-management.vercel.app/api/mcp",
        "--header",
        "x-organization-id: YOUR_WORKSPACE_ID",
        "--header",
        "Authorization: Bearer YOUR_OPERION_API_KEY"
      ]
    }
  }
}
```

> **Direct URL Format (for Claude Desktop versions supporting remote HTTP/SSE):**
> ```json
> {
>   "mcpServers": {
>     "operion": {
>       "url": "https://operion-ai-project-management.vercel.app/api/mcp",
>       "headers": {
>         "x-organization-id": "YOUR_WORKSPACE_ID",
>         "Authorization": "Bearer YOUR_OPERION_API_KEY"
>       }
>     }
>   }
> }
> ```

#### 3. Restart Claude Desktop.
You will see the hammer icon 🔨 in Claude Desktop showing **31 Operion Tools** available.

---

### B. Cursor IDE & Windsurf Setup

1. Open **Cursor Settings** (`Ctrl + Shift + J` or `Cmd + Shift + J`).
2. Navigate to **Features → MCP Servers**.
3. Click **Add New MCP Server**:
   - **Name:** `operion`
   - **Type:** `command`
   - **Command:** `npx -y mcp-remote https://operion-ai-project-management.vercel.app/api/mcp --header "x-organization-id: YOUR_WORKSPACE_ID" --header "Authorization: Bearer YOUR_OPERION_API_KEY"`
4. Click **Save** and verify the status indicator turns green with 31 tools.

---

## 3. Google Gemini & Antigravity IDE

### A. Antigravity IDE (Gemini Coding Agent)

Antigravity IDE manages MCP servers in `mcp_config.json`.

#### 1. Open or create your MCP configuration:
- **Workspace-level:** `.agents/mcp_config.json`
- **Global-level:** `C:\Users\<Username>\.gemini\config\mcp_config.json` (Windows) or `~/.gemini/config/mcp_config.json` (Linux/macOS)

#### 2. Add the Operion server definition:

> **Important Note on Antigravity UI:** In Antigravity IDE, the search bar in **Customizations → Add MCP Servers** is a package catalog search (for searching registry extensions by name like `supabase` or `github`). Custom or hosted MCP servers are added directly to your **`mcp_config.json`** file.

**Recommended Option (Direct Node.js Stdio Bridge):**
```json
{
  "mcpServers": {
    "operion": {
      "command": "node",
      "args": [
        "e:\\Ventures\\Operion-AI Project management\\scripts\\operion-mcp.mjs"
      ]
    }
  }
}
```

**Alternative Option (npx mcp-remote):**
```json
{
  "mcpServers": {
    "operion": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://operion-ai-project-management.vercel.app/api/mcp",
        "--header",
        "x-organization-id: YOUR_WORKSPACE_ID",
        "--header",
        "Authorization: Bearer YOUR_OPERION_API_KEY"
      ]
    }
  }
}
```

Once saved, Gemini agents in Antigravity instantly discover Operion and can run all 31 tools to create tasks, inspect blockers, and plan projects autonomously.


---

## 4. OpenAI ChatGPT & Custom GPTs

ChatGPT connects to external enterprise platforms using **OpenAPI Custom Actions**. Operion provides a dedicated, real-time OpenAPI 3.1 specification at `/api/v1/openapi.json`.

### Step-by-Step Setup:

1. **Open ChatGPT GPT Builder:**
   - Go to [chatgpt.com/gpts/editor](https://chatgpt.com/gpts/editor) or click **Explore GPTs → Create**.

2. **Configure GPT Metadata:**
   - **Name:** `Operion Project Operator`
   - **Description:** `Autonomous project manager connecting directly to my Operion hosted workspace.`
   - **Instructions (Copy & Paste):**
     ```text
     You are the Operion Project Operator. You have direct API access to Operion to manage projects, workstreams, milestones, tasks, and dependency health.
     - Always query the workspace before making assumptions about status or project names.
     - When planning a project, decompose it into workstreams and specific actionable tasks.
     - When identifying blockers, list the blocked task and its predecessor dependencies clearly.
     ```

3. **Add the Operion Action:**
   - Under the **Configure** tab, scroll to the bottom and click **Create new action**.
   - In the **Schema** section, click **Import from URL** and paste:
     ```
     https://operion-ai-project-management.vercel.app/api/v1/openapi.json
     ```
   - Click **Import**. ChatGPT will parse the endpoints (`/api/v1/projects`, `/api/v1/tasks`, `/api/v1/search`, `/api/v1/reports/daily`, `/api/mcp`).

4. **Configure Authentication:**
   - Under **Authentication**, click the gear icon:
     - **Authentication Type:** `API Key`
     - **Auth Type:** `Bearer`
     - **API Key:** Paste your Operion API Key generated in **Settings → API Keys for External Agents**.
   - Click **Save**.

5. **Test in the Preview Panel:**
   - Type: `"List all active projects in my workspace"`
   - ChatGPT will prompt you to allow the request to `operion-ai-project-management.vercel.app`, make the authenticated call, and display your live projects!

---

## 5. Verified Operion Tools Reference

| Tool Category | Available MCP Tools | Purpose |
| :--- | :--- | :--- |
| **Workspace & Admin** | `getWorkspaceOverview`, `getAuditTrail` | Inspect organization stats, member roles, and audit trail of actions. |
| **Project Operations** | `listProjects`, `getProject`, `createProject`, `updateProject`, `archiveProject`, `duplicateProject` | Full project lifecycle management with health status. |
| **Workstreams & Milestones** | `listWorkstreams`, `createWorkstream`, `listMilestones`, `createMilestone`, `linkMilestoneDependencies` | Organize projects into streams and sequenced milestones. |
| **Task Engine** | `listTasks`, `getTask`, `createTask`, `updateTask`, `completeTask`, `assignTask`, `deleteTask` | Atomic deliverables, priorities (`urgent`, `high`, `medium`, `low`), and assignees. |
| **Dependencies & Cycles** | `addDependency`, `removeDependency`, `findBlockers`, `resolveBlocker` | Predecessor/successor edge management with circular dependency detection. |
| **Autonomous AI Ops** | `planProject`, `analyzeHealth`, `replanProject`, `extractTasksFromText`, `generateDailyReport`, `generatePortfolioReport` | High-level autonomous project generation and portfolio executive reports. |

---

## 6. Sample Agent Prompts

### Planning a New Project
> *"Plan a new project titled 'Multi-Region Supabase Failover & Read Replicas' with constraints: 'Must complete within 3 weeks and zero database downtime'. Break it down into engineering and testing workstreams."*

### Discovering Blockers
> *"Scan all active projects in Operion and show me any tasks that are currently blocked by incomplete predecessor tasks."*

### Generating Daily Standup Briefing
> *"Generate today's executive status report. Highlight completed tasks and any at-risk milestones."*

---

## 7. Troubleshooting & FAQ

### Issue: `401 Unauthorized: Invalid or revoked API key`
- **Fix:** Verify you have copied the full API key (starts with `opk_`). Make sure you added `Bearer ` before the token in your headers if configuring manually.

### Issue: `Tool not found` or `Protocol error`
- **Fix:** Ensure your client is sending valid JSON-RPC 2.0 packets with `method: "tools/call"` and `params: { name: "...", arguments: { ... } }`. When using `mcp-remote`, this translation is handled automatically.

### Issue: Localhost vs Hosted Cloud
- If testing locally, set the server URL to `http://localhost:3000/api/mcp`.
- For production, always use `https://operion-ai-project-management.vercel.app/api/mcp`.
