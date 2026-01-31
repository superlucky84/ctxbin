import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const StorageModel = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>Storage Model</h1>

      <p>
        ctxbin uses <strong>Upstash Redis</strong> as its storage backend,
        accessed via the <strong>HTTP REST API</strong>.
        Only the <strong>HASH</strong> data type is used.
      </p>

      <h2>Redis Data Model</h2>
      <p>Each resource type maps to one Redis hash:</p>

      <h3>Context (ctx)</h3>
      <CodeBlock
        language="text"
        code={`Redis Key (HASH): ctx
Field           : {project}/{branch}
Value           : markdown string (UTF-8)`}
      />
      <CodeBlock
        language="bash"
        code={`# Redis equivalent
HSET ctx my-project/main "# Context markdown..."
HGET ctx my-project/main
HDEL ctx my-project/main`}
      />

      <h3>Agent</h3>
      <CodeBlock
        language="text"
        code={`Redis Key (HASH): agent
Field           : {agent-name}
Value           : markdown string`}
      />
      <CodeBlock
        language="bash"
        code={`# Redis equivalent
HSET agent frontend-reviewer "# Agent role markdown..."
HGET agent frontend-reviewer
HDEL agent frontend-reviewer`}
      />

      <h3>Skill</h3>
      <CodeBlock
        language="text"
        code={`Redis Key (HASH): skill
Field           : {skill-name}
Value           : markdown string | skillpack | skillref`}
      />
      <CodeBlock
        language="bash"
        code={`# Redis equivalent
HSET skill fp-pack "# Skill markdown..."
HGET skill fp-pack
HDEL skill fp-pack`}
      />

      <h2>Internal Store Interface</h2>
      <CodeBlock
        language="typescript"
        code={`interface Store {
  get(hash: string, field: string): string | null;
  set(hash: string, field: string, value: string): void;
  delete(hash: string, field: string): void;
  list(hash: string): Array<{ field: string; value: string }>;
}`}
      />

      <h2>Deletion Rules</h2>
      <ul>
        <li><strong>Deletion is always explicit</strong></li>
        <li>Saving an empty value <strong>never deletes data</strong></li>
        <li><code>delete</code> is the only way to remove stored content</li>
        <li>No soft-delete</li>
        <li>No confirmation prompts (agent-safe)</li>
      </ul>

      <h2>Non-Goals</h2>
      <ul>
        <li>No RAG</li>
        <li>No embeddings</li>
        <li>No search</li>
        <li>No versioning</li>
        <li>No history</li>
        <li>No merge</li>
        <li>No permissions</li>
        <li>No inference</li>
      </ul>
    </div>
  );
});
