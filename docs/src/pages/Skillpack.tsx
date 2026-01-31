import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const Skillpack = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>Skillpack (Directory Bundle)</h1>

      <p>
        Skillpacks store a whole skill directory as a single Redis value.
        The directory is compressed as <code>tar.gz</code> and encoded as Base64.
      </p>

      <h2>On-Wire Format</h2>
      <CodeBlock
        language="text"
        code={`ctxbin-skillpack@1
<base64(tar.gz bytes)>`}
      />

      <h2>Save a Skillpack</h2>
      <CodeBlock
        language="bash"
        code={`$ ctxbin skill save fp-pack --dir ./skills/fp-pack`}
      />

      <h2>Load a Skillpack</h2>
      <CodeBlock
        language="bash"
        code={`$ ctxbin skill load fp-pack --dir ./output/fp-pack`}
      />
      <p>
        <code>--dir</code> is required for skillpack load. Without it, an error is returned.
      </p>

      <h2>Rules</h2>
      <ul>
        <li>File entries are sorted lexicographically for determinism</li>
        <li>gzip mtime is set to <code>0</code>; uid/gid are <code>0</code></li>
        <li>Symlinks are not allowed; save fails if any are found</li>
      </ul>

      <h2>Default Excludes</h2>
      <ul>
        <li><code>.git/</code></li>
        <li><code>node_modules/</code></li>
        <li><code>.DS_Store</code></li>
      </ul>

      <h2>Size Limit</h2>
      <p>
        <strong>7 MB</strong> compressed tarball limit. If exceeded, save fails with a clear error
        suggesting removal of large/binary files.
      </p>

      <h2>Extraction Rules</h2>
      <ul>
        <li>Target directory is created if missing</li>
        <li>Existing files at the same paths are overwritten</li>
        <li>Extra files are left untouched</li>
        <li>Only regular files and directories are allowed</li>
      </ul>

      <h2>Permission Normalization</h2>
      <ul>
        <li>Directories: <code>0755</code></li>
        <li>Regular files: <code>0644</code></li>
        <li>Executable files: <code>0755</code></li>
        <li>setuid/setgid/sticky bits are stripped</li>
        <li>Windows: chmod failures are ignored</li>
      </ul>
    </div>
  );
});
