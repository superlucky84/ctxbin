import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const AgentAddon = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>AI Agent Addon</h1>

      <p>
        Copy/paste the block below into your <code>AGENT.md</code> or <code>CLAUDE.md</code> to enable
        ctxbin context persistence for AI agents.
      </p>

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
