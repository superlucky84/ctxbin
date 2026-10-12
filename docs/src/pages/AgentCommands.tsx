import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

export const AgentCommands = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>agent Commands</h1>

      <p>
        The <code>agent</code> resource stores agent role definitions.
        <strong>Key is always required</strong> (no auto-inference).
      </p>

      <h2>Load</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin agent load frontend-reviewer`}
      />

      <h2>Save</h2>
      <CodeBlock
        language="bash"
        code={`# From --value flag
$ npx ctxbin agent save frontend-reviewer --value "# Agent role markdown"

# From file
$ npx ctxbin agent save frontend-reviewer --file agent.md`}
      />

      <h2>Install Shared Agent Rules</h2>
      <p>Save provider-neutral Markdown, then install every remote agent and skill into Claude Code/Codex. Shared agent frontmatter supports name and description only; the name must match the remote key.</p>
      <CodeBlock language="markdown" code={`---
name: reviewer
description: Review code changes for correctness and missing tests.
---

Inspect changed code and report actionable findings.`} />
      <CodeBlock language="bash" code={`npx ctxbin agent save reviewer --file reviewer.md
npx ctxbin sync --target all --dry-run
npx ctxbin sync --target all`} />
      <p>Claude gets ~/.claude/agents/&lt;name&gt;.md; Codex gets ~/.codex/agents/&lt;name&gt;.toml. Legacy Markdown receives a name from the key and preserves a valid local description before falling back to “Agent rules for &lt;name&gt;.” Unsupported model/tool metadata returns an error. Use existing agent save --file to upload changes; sync reads the remote store only. See <span onClick={() => navigateTo('/commands/sync')} class="text-indigo-600 hover:underline cursor-pointer">sync commands</span> for replacement, source-scoped pruning, and overrides.</p>

      <h2>Append</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin agent save frontend-reviewer --append --file addition.md`}
      />

      <h2>List</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin agent list
frontend-reviewer --value
backend-reviewer  --value`}
      />

      <h2>Delete</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin agent delete frontend-reviewer`}
      />
      <ul>
        <li>Missing key results in immediate error</li>
        <li>No confirmation prompt</li>
      </ul>

      <h2>Redis Mapping</h2>
      <CodeBlock
        language="text"
        code={`Redis Key (HASH): agent
Field           : {agent-name}
Value           : markdown string`}
      />
      <p>Replacing an unmanaged matching local item requires --force. Preview labels it replace-unmanaged; identical managed entries are unchanged without rewrites.</p>
    </div>
  );
});
