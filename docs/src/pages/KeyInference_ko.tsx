import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const KeyInferenceKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>키 추론</h1>

      <p>
        <code>ctx</code> 명령어를 명시적 키 없이 사용하면, ctxbin이 git 저장소에서 자동으로
        키를 추론합니다. 이 페이지에서는 추론이 정확히 어떻게 작동하는지 설명합니다.
      </p>

      <h2>키 형식</h2>
      <CodeBlock
        language="text"
        code={`key = {project}/{branch}`}
      />

      <h2>프로젝트 이름 결정 방법</h2>
      <p>프로젝트 이름은 다음 순서로 결정됩니다:</p>
      <ol>
        <li>
          <strong>package.json name 필드</strong>: git 루트에 <code>package.json</code>이 있으면
          <code>name</code> 필드를 프로젝트 이름으로 사용합니다.
        </li>
        <li>
          <strong>폴더 이름 폴백</strong>: <code>package.json</code>이 없으면
          git 저장소 루트 폴더 이름을 사용합니다.
        </li>
      </ol>

      <h3>package.json이 있는 경우 예시</h3>
      <CodeBlock
        language="json"
        code={`// package.json
{
  "name": "my-awesome-app",
  ...
}`}
      />
      <p>
        <code>main</code> 브랜치에 있다면 추론된 키는:
        <code>my-awesome-app/main</code>
      </p>

      <h3>package.json이 없는 경우 예시</h3>
      <p>
        저장소가 <code>/home/user/projects/my-project</code>에 있고 <code>feature</code> 브랜치에 있다면,
        추론된 키는: <code>my-project/feature</code>
      </p>

      <h2>브랜치 이름</h2>
      <p>브랜치 이름은 다음 명령어로 결정됩니다:</p>
      <CodeBlock
        language="bash"
        code={`git rev-parse --abbrev-ref HEAD`}
      />

      <h2>경고: 이름 불일치</h2>
      <p>
        <code>package.json</code>이 있고 그 <code>name</code>이 폴더 이름과 다르면
        stderr에 경고가 출력됩니다:
      </p>
      <CodeBlock
        language="text"
        code={`CTXBIN_WARN: package.json name "my-awesome-app" differs from folder name "my-project". Using "my-awesome-app".`}
      />
      <p>
        이를 통해 예상과 다른 키를 사용하고 있는지 확인할 수 있습니다.
      </p>

      <h2>왜 Git Remote URL을 사용하지 않나요?</h2>
      <p>
        일부 도구는 git remote URL을 파싱해서 프로젝트 이름을 결정합니다.
        ctxbin은 의도적으로 이를 피합니다:
      </p>
      <ul>
        <li>Remote URL은 git 서비스마다 다름 (GitHub, GitLab, Bitbucket, 자체 호스팅)</li>
        <li>URL 형식이 일관되지 않음 (HTTPS vs SSH, <code>.git</code> 접미사 유무)</li>
        <li>저장소에 여러 remote가 있거나 remote가 없을 수 있음</li>
        <li>파싱이 불안정하고 예기치 않은 동작을 유발할 수 있음</li>
      </ul>

      <h2>키 추론 실패 시</h2>
      <p>
        git 저장소 밖에서 명시적 키 없이 <code>ctx</code> 명령어를 실행하면 오류가 발생합니다:
      </p>
      <CodeBlock
        language="text"
        code={`CTXBIN_ERR NOT_IN_GIT: must be inside a git repository or provide an explicit key`}
      />

      <h2>명시적 키 사용</h2>
      <p>
        명시적 키를 제공하면 추론을 우회할 수 있습니다:
      </p>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin ctx save my-project/main --value "컨텍스트"
$ npx ctxbin ctx load my-project/main`}
      />
      <p>
        다음 경우에 유용합니다:
      </p>
      <ul>
        <li>git 저장소 밖에 있을 때</li>
        <li>폴더 이름이나 package.json 이름이 의도한 키와 다를 때</li>
        <li>여러 로컬 클론에서 일관된 키를 사용하고 싶을 때</li>
      </ul>
    </div>
  );
});
