import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

export const QuickStart = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>Quick Start</h1>

      <h2>Prerequisites</h2>
      <ul>
        <li>Node.js 18+</li>
        <li>Upstash Redis account (for storage)</li>
      </ul>

      <h2>1. Set Up Credentials</h2>
      <p>Set environment variables:</p>
      <CodeBlock
        language="bash"
        code={`$ export CTXBIN_STORE_URL="https://your-upstash-url"
$ export CTXBIN_STORE_TOKEN="your-upstash-token"`}
      />

      <p>Or use interactive setup (human-only):</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin init
CTXBIN_STORE_URL: https://...
CTXBIN_STORE_TOKEN: ...`}
      />

      <h2>2. Using with AI Agents (Core Usage)</h2>
      <p>
        <strong>This is the primary way to use ctxbin.</strong> Let AI agents save and load context for you.
      </p>

      <h3>Option 1: Zero-setup (simplest)</h3>
      <p>Just ask your AI agent directly:</p>
      <CodeBlock
        language="text"
        code={`"Run \`npx ctxbin help\`, read the output, then save the current context."`}
      />
      <p>The agent will self-discover the usage guide and follow it.</p>

      <h3>Option 2: Add-on file</h3>
      <p>For consistent behavior across sessions, copy the add-on into your agent instruction file:</p>
      <ol>
        <li>
          Copy <span onClick={() => navigateTo('/guide/agent-addon')} class="text-indigo-600 hover:underline cursor-pointer">agent-addon.md</span> into
          your project's agent instruction file (e.g. <code>AGENT.md</code>, <code>CLAUDE.md</code>)
        </li>
        <li>Then simply ask your AI agent:</li>
      </ol>
      <CodeBlock
        language="text"
        code={`"Use npx ctxbin to save the current context."
"Use npx ctxbin to load the current context."`}
      />

      <h3>Skill management with agents</h3>
      <p>You can also ask agents to save skills to ctxbin:</p>
      <CodeBlock
        language="text"
        code={`"Save this skill to ctxbin: https://github.com/user/repo/tree/main/skills/my-skill (skip --ref)"

Or:

"Save the skill at ./claude/skills/my-skill to ctxbin using --dir."`}
      />
      <p>
        The agent will parse the GitHub URL and convert it to the appropriate <code>--url</code> and <code>--path</code> options.
      </p>

      <h2>3. Direct CLI Usage</h2>
      <p>You can also use ctxbin directly from the command line.</p>

      <h3>Save Context</h3>
      <p>Inside a git repository, save context (key is auto-inferred):</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save --value "# Project Context

## Summary
- Implemented user authentication
- Added login/logout endpoints

## Next Steps
- Add password reset
- Implement session management"`}
      />

      <h3>Load Context</h3>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx load`}
      />

      <h3>Append to Context</h3>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save --append --value "## Update
- Fixed bug in login flow"`}
      />

      <h3>List All Contexts</h3>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx list
my-project/main    --value
my-project/feature --value`}
      />

      <h3>Delete Context</h3>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx delete`}
      />

      <h2>4. Install Remote Skills and Agents</h2>
      <p>Use step 1 credentials to install all definitions by default, or select exact keys with --skill/--agent. Preview downloads and validates the remote content without changing installation directories:</p>
      <CodeBlock language="bash" code={`# Save reusable definitions with existing commands
npx ctxbin skill save my-skill --dir ./skills/my-skill
npx ctxbin agent save reviewer --file reviewer.md

# Preview and install both clients
npx ctxbin sync --target all --dry-run
npx ctxbin sync --target all

# One client, including removal of its tracked stale entries
npx ctxbin sync --target codex --prune`} />
      <p>The skill bundle needs root SKILL.md. Shared agent Markdown accepts name and description frontmatter; legacy plain Markdown also works. Matching skill folders are replaced entirely and local-only entries remain. See <span onClick={() => navigateTo('/commands/sync')} class="text-indigo-600 hover:underline cursor-pointer">sync commands</span> for the agent example, paths, directory overrides, and recovery details.</p>
      <p>To upload local changes, use the existing skill save --dir or agent save --file commands. Sync only reads the remote store and does not require Git or a key.</p>

      <h2>Key Inference</h2>
      <p>
        For <code>ctx</code> commands, when no key is provided, ctxbin automatically infers
        the key from your git repository (<code>{'{project}/{branch}'}</code>).
      </p>
      <p>
        See <span onClick={() => navigateTo('/guide/key-inference')} class="text-indigo-600 hover:underline cursor-pointer">Key Inference</span> for
        details on how project names are determined and when to use explicit keys.
      </p>
      <p>Replacing an unmanaged matching local item requires --force. Preview labels it replace-unmanaged; identical managed entries are unchanged without rewrites.</p>
      <p>Back up original stored values separately from client installation, then preview recovery with <span onClick={() => navigateTo('/commands/backup-restore')} class="text-indigo-600 hover:underline cursor-pointer">backup / restore</span>.</p>
      <CodeBlock language="bash" code={'npx ctxbin backup --file ./backups/ctxbin.json\nnpx ctxbin restore --file ./backups/ctxbin.json --dry-run'} />
    </div>
  );
});
