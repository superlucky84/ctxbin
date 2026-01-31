import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const ConfigEnv = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>Environment Variables</h1>

      <p>
        ctxbin requires two credentials to connect to Upstash Redis.
        Environment variables are the recommended method for AI agents.
      </p>

      <h2>Required Variables</h2>
      <CodeBlock
        language="bash"
        code={`CTXBIN_STORE_URL   # Upstash Redis REST URL
CTXBIN_STORE_TOKEN # Upstash Redis REST token`}
      />

      <h2>Setting Environment Variables</h2>

      <h3>Bash / Zsh</h3>
      <CodeBlock
        language="bash"
        code={`export CTXBIN_STORE_URL="https://your-redis.upstash.io"
export CTXBIN_STORE_TOKEN="your-token-here"`}
      />

      <h3>In a Script</h3>
      <CodeBlock
        language="bash"
        code={`CTXBIN_STORE_URL="https://..." CTXBIN_STORE_TOKEN="..." npx ctxbin ctx load`}
      />

      <h3>.env File (with dotenv)</h3>
      <CodeBlock
        language="text"
        code={`# .env
CTXBIN_STORE_URL=https://your-redis.upstash.io
CTXBIN_STORE_TOKEN=your-token-here`}
      />

      <h2>Resolution Order</h2>
      <ol>
        <li><strong>Environment variables</strong> (highest priority)</li>
        <li><code>~/.ctxbin/config.json</code> (fallback)</li>
      </ol>

      <p>
        If environment variables are set, <code>npx ctxbin init</code> is not required.
      </p>

      <h2>Getting Upstash Credentials</h2>
      <ol>
        <li>Create an account at <a href="https://upstash.com" target="_blank">upstash.com</a></li>
        <li>Create a new Redis database</li>
        <li>Go to the database details page</li>
        <li>Copy the REST URL and REST Token</li>
      </ol>
    </div>
  );
});
