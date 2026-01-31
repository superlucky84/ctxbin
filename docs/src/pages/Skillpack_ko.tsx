import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const SkillpackKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>Skillpack (디렉터리 번들)</h1>

      <p>
        Skillpacks는 전체 스킬 디렉터리를 단일 Redis 값으로 저장합니다.
        디렉터리는 <code>tar.gz</code>로 압축되고 Base64로 인코딩됩니다.
      </p>

      <h2>전송 포맷</h2>
      <CodeBlock
        language="text"
        code={`ctxbin-skillpack@1
<base64(tar.gz bytes)>`}
      />

      <h2>Skillpack 저장</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill save fp-pack --dir ./skills/fp-pack`}
      />

      <h2>Skillpack 로드</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill load fp-pack --dir ./output/fp-pack`}
      />
      <p>
        skillpack 로드에는 <code>--dir</code>이 필수입니다. 없으면 에러가 반환됩니다.
      </p>

      <h2>규칙</h2>
      <ul>
        <li>파일 항목은 결정론을 위해 사전순으로 정렬됨</li>
        <li>gzip mtime은 <code>0</code>으로 설정; uid/gid도 <code>0</code></li>
        <li>심볼릭 링크는 허용되지 않음; 발견되면 저장 실패</li>
      </ul>

      <h2>기본 제외 항목</h2>
      <ul>
        <li><code>.git/</code></li>
        <li><code>node_modules/</code></li>
        <li><code>.DS_Store</code></li>
      </ul>

      <h2>크기 제한</h2>
      <p>
        압축된 tarball <strong>7 MB</strong> 제한. 초과 시 대용량/바이너리 파일 제거를
        권장하는 명확한 에러와 함께 저장 실패.
      </p>

      <h2>추출 규칙</h2>
      <ul>
        <li>대상 디렉터리가 없으면 생성</li>
        <li>같은 경로의 기존 파일은 덮어쓰기</li>
        <li>추가 파일은 그대로 유지</li>
        <li>일반 파일과 디렉터리만 허용</li>
      </ul>

      <h2>권한 정규화</h2>
      <ul>
        <li>디렉터리: <code>0755</code></li>
        <li>일반 파일: <code>0644</code></li>
        <li>실행 파일: <code>0755</code></li>
        <li>setuid/setgid/sticky 비트는 제거됨</li>
        <li>Windows: chmod 실패는 무시됨</li>
      </ul>
    </div>
  );
});
