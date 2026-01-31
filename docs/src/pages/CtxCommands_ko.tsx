import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const CtxCommandsKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>ctx 명령어</h1>

      <p>
        <code>ctx</code> 리소스는 브랜치 범위의 프로젝트 컨텍스트를 저장합니다.
        키는 git 저장소 이름과 브랜치에서 자동으로 추론될 수 있습니다.
      </p>

      <h2>키 추론</h2>
      <p>키를 제공하지 않으면 ctxbin이 자동으로 키를 추론합니다:</p>
      <CodeBlock
        language="text"
        code={`key = {project}/{branch}
project = git 저장소 루트 디렉터리 이름
branch  = git rev-parse --abbrev-ref HEAD`}
      />
      <p>이 기능은 git 저장소 안에서 실행해야 합니다.</p>

      <h2>Load</h2>
      <p>Redis에서 컨텍스트 로드:</p>
      <CodeBlock
        language="bash"
        code={`# 자동 키 (git에서 추론)
$ npx ctxbin ctx load

# 명시적 키
$ npx ctxbin ctx load my-project/main`}
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

      <h2>Save (추가)</h2>
      <p>기존 컨텍스트에 추가 (구분자: <code>\n\n</code>):</p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save --append --file note.md
$ npx ctxbin ctx save my-project/main --append --value "추가 노트"`}
      />
      <p>키가 존재하지 않으면 일반 save와 동일하게 동작합니다.</p>

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
