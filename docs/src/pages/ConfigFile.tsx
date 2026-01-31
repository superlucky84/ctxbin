import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const ConfigFile = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>Config File</h1>

      <p>
        ctxbin can store credentials in a local config file.
        This is useful for human users but not recommended for AI agents.
      </p>

      <h2>Config File Location</h2>
      <CodeBlock
        language="text"
        code={`~/.ctxbin/config.json`}
      />

      <h2>Config File Format</h2>
      <CodeBlock
        language="json"
        code={`{
  "store_url": "https://your-redis.upstash.io",
  "store_token": "your-token-here"
}`}
      />

      <h2>Interactive Setup</h2>
      <p>
        Use <code>ctxbin init</code> for interactive setup (human-only):
      </p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin init
CTXBIN_STORE_URL: https://your-redis.upstash.io
CTXBIN_STORE_TOKEN: your-token-here`}
      />
      <p>
        This prompts for credentials and saves them to <code>~/.ctxbin/config.json</code>.
      </p>

      <h2>Manual Setup</h2>
      <CodeBlock
        language="bash"
        code={`$ mkdir -p ~/.ctxbin
$ cat > ~/.ctxbin/config.json << 'EOF'
{
  "store_url": "https://your-redis.upstash.io",
  "store_token": "your-token-here"
}
EOF`}
      />

      <h2>Resolution Order</h2>
      <ol>
        <li><strong>Environment variables</strong> (highest priority)</li>
        <li><code>~/.ctxbin/config.json</code> (fallback)</li>
      </ol>

      <p>
        Environment variables always override the config file.
      </p>

      <h2>Security Note</h2>
      <p>
        The config file contains sensitive credentials.
        Ensure proper file permissions (<code>chmod 600 ~/.ctxbin/config.json</code>).
      </p>
    </div>
  );
});
