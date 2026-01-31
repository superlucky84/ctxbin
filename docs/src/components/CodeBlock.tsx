import { lmount, mountCallback, ref } from 'lithent';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';

// Register languages
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('text', () => ({ contains: [] }));

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock = lmount<CodeBlockProps>(() => {
  const codeRef = ref<HTMLElement | null>(null);

  mountCallback(() => {
    if (!codeRef.value) return;

    const lang =
      codeRef.value.className.match(/language-(\w+)/)?.[1] || 'bash';

    // Bash는 별도 처리
    if (lang === 'bash') {
      hljs.highlightElement(codeRef.value);
      if (codeRef.value.innerHTML) {
        codeRef.value.innerHTML = codeRef.value.innerHTML.replace(
          /^(\s*)\$(\s)/gm,
          '$1<span class="bash-prompt">$</span>$2'
        );
      }
      return;
    }

    const original = codeRef.value.textContent || '';
    const highlighted = hljs.highlight(original, { language: lang }).value;
    codeRef.value.innerHTML = highlighted;
  });

  return ({ code, language }) => (
    <pre class="code-block bg-gray-100 dark:bg-[#1e1e1e] p-6 rounded-lg overflow-x-auto mb-6 text-xs md:text-sm border border-gray-200 dark:border-gray-800">
      <code ref={codeRef} class={`language-${language || 'bash'}`}>
        {code}
      </code>
    </pre>
  );
});
