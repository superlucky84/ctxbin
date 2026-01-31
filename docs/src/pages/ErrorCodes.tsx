import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const ErrorCodes = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>Error Codes</h1>

      <p>
        All ctxbin errors are written to <code>stderr</code> with exit code <code>1</code>.
        Errors use a single-line format for easy parsing.
      </p>

      <h2>Error Format</h2>
      <CodeBlock
        language="text"
        code={`CTXBIN_ERR <CODE>: <message>`}
      />

      <h2>Error Codes</h2>

      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>INVALID_INPUT</code></td>
            <td>Missing, extra, or combined flags; invalid arguments</td>
          </tr>
          <tr>
            <td><code>MISSING_KEY</code></td>
            <td>Key is required but not provided (agent/skill commands)</td>
          </tr>
          <tr>
            <td><code>INVALID_URL</code></td>
            <td>URL format is invalid for skillref</td>
          </tr>
          <tr>
            <td><code>INVALID_REF</code></td>
            <td>Commit SHA is not 40-hex format</td>
          </tr>
          <tr>
            <td><code>INVALID_PATH</code></td>
            <td>Path contains traversal or is invalid</td>
          </tr>
          <tr>
            <td><code>NOT_IN_GIT</code></td>
            <td>Key inference requires git repo, but not inside one</td>
          </tr>
          <tr>
            <td><code>NOT_FOUND</code></td>
            <td>Key or remote path does not exist</td>
          </tr>
          <tr>
            <td><code>TYPE_MISMATCH</code></td>
            <td>Wrong flag for value type (e.g., --dir with string)</td>
          </tr>
          <tr>
            <td><code>SIZE_LIMIT</code></td>
            <td>Tarball or download exceeds size limit</td>
          </tr>
          <tr>
            <td><code>NETWORK</code></td>
            <td>Store or fetch request failed</td>
          </tr>
          <tr>
            <td><code>IO</code></td>
            <td>File system or parsing error</td>
          </tr>
        </tbody>
      </table>

      <h2>Examples</h2>
      <CodeBlock
        language="text"
        code={`CTXBIN_ERR NOT_IN_GIT: must run inside a git repository
CTXBIN_ERR MISSING_KEY: key is required
CTXBIN_ERR NOT_FOUND: no value for ctx:my-project/main
CTXBIN_ERR SIZE_LIMIT: skillpack tar.gz exceeds 7MB limit
CTXBIN_ERR TYPE_MISMATCH: --dir cannot be used with string values`}
      />

      <h2>Parsing Errors</h2>
      <CodeBlock
        language="bash"
        code={`# Extract error code
$ npx ctxbin ctx load 2>&1 | grep -oP 'CTXBIN_ERR \\K[A-Z_]+'

# Check for specific error
$ npx ctxbin ctx load 2>&1 | grep -q "CTXBIN_ERR NOT_FOUND" && echo "not found"`}
      />
    </div>
  );
});
