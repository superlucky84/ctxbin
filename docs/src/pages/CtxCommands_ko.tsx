import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

export const CtxCommandsKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>ctx 명령어</h1>

      <p>
        <code>ctx</code> 리소스는 브랜치 범위의 프로젝트 컨텍스트를 저장합니다.
        키는 git 저장소 이름과 브랜치에서 자동으로 추론될 수 있습니다.
      </p>

      <h2>키 추론</h2>
      <p>
        키를 제공하지 않으면 ctxbin이 자동으로 키를 추론합니다.
        자세한 내용은 <span onClick={() => navigateTo('/guide/key-inference')} class="text-indigo-600 hover:underline cursor-pointer">키 추론</span> 페이지를 참고하세요.
      </p>
      <CodeBlock
        language="text"
        code={`key = {project}/{branch}
project = package.json의 "name" 필드, 없으면 폴더 이름
branch  = git rev-parse --abbrev-ref HEAD`}
      />
      <p>이 기능은 git 저장소 안에서 실행해야 합니다.</p>
      <p class="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm">
        <strong>참고:</strong> <code>package.json</code>이 있으면 <code>name</code> 필드를 프로젝트 이름으로 사용합니다.
        name과 폴더 이름이 다르면 stderr에 경고가 출력됩니다.
        <code>package.json</code>이 없으면 폴더 이름을 사용합니다 (git remote URL은 사용하지 않음—다양한 git 서비스의 URL 파싱은 불안정함).
      </p>

      <h2>Load</h2>
      <p>Redis에서 컨텍스트 로드:</p>
      <CodeBlock
        language="bash"
        code={`# 자동 키 (git에서 추론)
$ npx ctxbin ctx load

# 명시적 키
$ npx ctxbin ctx load my-project/main`}
      />
      <p>
        <code>--raw</code>를 사용하면 저장된 값을 그대로 출력합니다 (메타 래퍼 포함):
      </p>
      <p>
        <code>--raw</code>는 sync/migration 같은 원문 복제 용도에 권장되며, 기본적으로 경고를 출력합니다.
        자동화에서는 <code>CTXBIN_SUPPRESS_RAW_WARN=1</code>로 경고를 숨길 수 있습니다.
      </p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx load my-project/main --raw`}
      />

      <h2>Save (교체)</h2>
      <p>새 컨텍스트 저장, 기존 값 교체:</p>
      <p>명시적 키는 git 밖에서 유용하지만 일반적인 사용에는 비추천입니다.</p>
      <CodeBlock
        language="bash"
        code={`# --value 플래그에서
$ npx ctxbin ctx save --value "마크다운 문자열"

# 파일에서
$ npx ctxbin ctx save --file context.md

# stdin에서
$ cat context.md | npx ctxbin ctx save

# 명시적 키 사용
$ npx ctxbin ctx save my-project/main --file context.md`}
      />
      <p>
        <code>--raw</code>를 사용하면 입력값을 그대로 저장합니다 (메타 자동 주입/갱신 없음):
      </p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save my-project/main --raw --file context.md`}
      />

      <h2>Save (추가)</h2>
      <p>기존 컨텍스트에 추가 (구분자: <code>\n\n</code>):</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save --append --file note.md
$ npx ctxbin ctx save my-project/main --append --value "추가 노트"`}
      />
      <p>키가 존재하지 않으면 일반 save와 동일하게 동작합니다.</p>
      <p><code>--append</code>와 <code>--raw</code>는 함께 사용할 수 없습니다.</p>

      <h2>List</h2>
      <p>저장된 모든 컨텍스트 목록:</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx list
my-project/main    --value
my-project/feature --value`}
      />

      <h2>Delete</h2>
      <p>컨텍스트 삭제:</p>
      <CodeBlock
        language="bash"
        code={`# 자동 키
$ npx ctxbin ctx delete

# 명시적 키
$ npx ctxbin ctx delete my-project/main`}
      />
      <ul>
        <li>확인 프롬프트 없음 (에이전트 안전)</li>
        <li>키를 추론할 수 없으면 빠른 실패</li>
      </ul>

      <h2>Redis 매핑</h2>
      <CodeBlock
        language="text"
        code={`Redis Key (HASH): ctx
Field           : {project}/{branch}
Value           : 마크다운 문자열 (UTF-8)`}
      />
    </div>
  );
});
