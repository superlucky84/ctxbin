import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

const addonBlock = [
  '<!-- BEGIN CTXBIN AGENT ADDON -->',
  '',
  '## ctxbin (Context Persistence)',
  '',
  'Use `ctxbin ctx save` to store **branch-scoped context** so the next agent can continue without re-explanation.',
  '> Tip: `npx ctxbin skill load ctxbin` prints the bundled ctxbin skill text',
  '> so agents can reference the full ctxbin guidance.',
  '',
  '### How ctx keys are inferred (when key is omitted)',
  '```',
  'key = {project}/{branch}',
  'project = git repository root directory name',
  'branch  = git rev-parse --abbrev-ref HEAD',
  '```',
  '',
  '### Save context (preferred)',
  '```bash',
  'ctxbin ctx save --value "<summary + next steps + decisions>"',
  '```',
  '',
  '### Save via stdin',
  '```bash',
  'echo "<context>" | ctxbin ctx save',
  '```',
  '',
  '### Load context',
  '```bash',
  'ctxbin ctx load',
  '```',
  '',
  '### What to include in ctx',
  '- What changed (summary)',
  '- What remains (next steps)',
  '- Completed vs remaining checklist items',
  '- Important decisions/constraints',
  '- Files touched and why',
  '- Failing tests or warnings',
  '',
  '### Do not',
  "- Don't store secrets",
  "- Don't overwrite with trivial messages",
  '',
  '<!-- END CTXBIN AGENT ADDON -->',
].join('\n');

async function copyAddonBlock(event: Event) {
  const button = event.currentTarget as HTMLButtonElement | null;
  const original = button?.textContent || 'Copy';

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(addonBlock);
    } else if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = addonBlock;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    if (button) {
      button.textContent = 'Copied';
      setTimeout(() => {
        button.textContent = original;
      }, 1500);
    }
  } catch {
    if (button) {
      button.textContent = 'Copy failed';
      setTimeout(() => {
        button.textContent = original;
      }, 1500);
    }
  }
}

export const AgentAddon = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>AI Agent Addon</h1>

      <p>
        Copy/paste the block below into your project's agent instruction file
        (for example <code>AGENT.md</code>, <code>CLAUDE.md</code>, or an equivalent).
      </p>

      <div class="relative mb-8">
        <button
          type="button"
          onClick={copyAddonBlock}
          class="absolute right-3 top-3 z-10 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Copy
        </button>
        <CodeBlock language="text" code={addonBlock} />
      </div>

      <h2>ctxbin (Context Persistence)</h2>

      <p>
        Use <code>ctxbin ctx save</code> to store <strong>branch-scoped context</strong> so the next
        agent can continue without re-explanation.
      </p>

      <blockquote>
        Tip: <code>npx ctxbin skill load ctxbin</code> prints the bundled ctxbin skill text
        so agents can reference the full ctxbin guidance.
      </blockquote>

      <h3>How ctx keys are inferred (when key is omitted)</h3>
      <CodeBlock
        language="text"
        code={`key = {project}/{branch}
project = git repository root directory name
branch  = git rev-parse --abbrev-ref HEAD`}
      />

      <h3>Save context (preferred)</h3>
      <CodeBlock
        language="bash"
        code={`$ ctxbin ctx save --value "<summary + next steps + decisions>"`}
      />

      <h3>Save via stdin</h3>
      <CodeBlock
        language="bash"
        code={`$ echo "<context>" | ctxbin ctx save`}
      />

      <h3>Load context</h3>
      <CodeBlock
        language="bash"
        code={`$ ctxbin ctx load`}
      />

      <h2>What to include in ctx</h2>
      <ul>
        <li>What changed (summary)</li>
        <li>What remains (next steps)</li>
        <li>Completed vs remaining checklist items</li>
        <li>Important decisions/constraints</li>
        <li>Files touched and why</li>
        <li>Failing tests or warnings</li>
      </ul>

      <h2>Do not</h2>
      <ul>
        <li>Don't store secrets</li>
        <li>Don't overwrite with trivial messages</li>
      </ul>
    </div>
  );
});
