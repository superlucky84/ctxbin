import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const Introduction = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>Introduction</h1>

      <p>
        <code>ctxbin</code> is a <strong>minimal, deterministic Node.js CLI tool</strong> executed via <code>npx</code>,
        designed for <strong>AI coding agents</strong> to store, load, append, and delete
        <strong>markdown-based context, agent roles, and skills</strong> using a
        <strong>simple key-value store backed by Upstash Redis</strong>.
      </p>

      <h2>What ctxbin IS</h2>
      <ul>
        <li>A thin Redis HASH client</li>
        <li>Non-interactive (except <code>init</code>)</li>
        <li>Explicit and predictable</li>
        <li>Agent-safe by design</li>
      </ul>

      <h2>What ctxbin is NOT</h2>
      <ul>
        <li>Not AI memory</li>
        <li>Not a RAG system</li>
        <li>Not semantic search</li>
        <li>Not intelligent retrieval</li>
      </ul>

      <h2>Execution Model</h2>
      <ul>
        <li><strong>Runtime:</strong> Node.js</li>
        <li><strong>Distribution:</strong> npm</li>
        <li><strong>Execution:</strong> <code>npx ctxbin ...</code></li>
        <li><strong>Platform:</strong> macOS / Linux / Windows</li>
        <li><strong>Shell assumptions:</strong> none</li>
      </ul>

      <p>All commands except <code>init</code> are <strong>non-interactive</strong>.</p>

      <h2>Storage Backend</h2>
      <ul>
        <li><strong>Backend:</strong> Upstash Redis</li>
        <li><strong>Access:</strong> HTTP REST API</li>
        <li><strong>Redis data type:</strong> HASH only</li>
      </ul>

      <h2>Three Resource Types</h2>

      <h3>1. Context (ctx)</h3>
      <p>Branch-scoped project context. Key can be auto-inferred from git.</p>
      <CodeBlock
        language="bash"
        code={`$ ctxbin ctx save --value "project context"
$ ctxbin ctx load`}
      />

      <h3>2. Agent</h3>
      <p>Agent role definitions. Key is always required.</p>
      <CodeBlock
        language="bash"
        code={`$ ctxbin agent save reviewer --value "# Agent role"
$ ctxbin agent load reviewer`}
      />

      <h3>3. Skill</h3>
      <p>Skill definitions as string, skillpack (directory), or skillref (GitHub reference).</p>
      <CodeBlock
        language="bash"
        code={`$ ctxbin skill save my-skill --value "# Skill markdown"
$ ctxbin skill save my-skill --dir ./skills/my-skill
$ ctxbin skill save my-skill --url https://github.com/owner/repo --path skills/my-skill`}
      />

      <h2>Non-Interactive Guarantee</h2>
      <p>All commands except <code>init</code> must:</p>
      <ul>
        <li>Never prompt</li>
        <li>Never block</li>
        <li>Fail fast with clear errors</li>
      </ul>
    </div>
  );
});
