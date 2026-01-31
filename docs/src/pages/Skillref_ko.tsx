import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const SkillrefKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>Skillref (GitHub 참조)</h1>

      <p>
        Skillrefs는 GitHub 디렉터리 포인터를 단일 Redis 값으로 저장합니다.
        콘텐츠는 Redis에 저장되지 않고 로드 시 GitHub에서 가져옵니다.
      </p>

      <h2>전송 포맷</h2>
      <CodeBlock
        language="json"
        code={`ctxbin-skillref@1
{"url":"https://github.com/OWNER/REPO","path":"skills/example","ref":"<40자-16진수-sha>"}

// 또는 기본 브랜치 추적:
ctxbin-skillref@1
{"url":"https://github.com/OWNER/REPO","path":"skills/example","track":"default"}`}
      />

      <h2>Skillref 저장 (고정)</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill save my-skill \\
  --url https://github.com/OWNER/REPO \\
  --ref a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0 \\
  --path skills/my-skill`}
      />

      <h2>Skillref 저장 (기본 브랜치 추적)</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill save my-skill \\
  --url https://github.com/OWNER/REPO \\
  --path skills/my-skill`}
      />
      <p><code>--ref</code>를 생략하면 저장소의 기본 브랜치를 추적합니다.</p>

      <h2>Skillref 로드</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill load my-skill --dir ./output/my-skill`}
      />
      <p>skillref 로드에는 <code>--dir</code>이 필수입니다.</p>

      <h2>URL 요구사항</h2>
      <ul>
        <li>HTTPS GitHub 저장소 루트여야 함: <code>https://github.com/owner/repo</code></li>
        <li><code>.git</code> 접미사 허용 (제거됨)</li>
        <li><code>/tree/...</code> 경로 불허</li>
        <li><strong>공개 저장소만 지원</strong></li>
      </ul>

      <h2>Ref 요구사항</h2>
      <ul>
        <li><strong>전체 40자 16진수 커밋 SHA</strong>여야 함</li>
        <li>태그 및 브랜치 이름 불허</li>
        <li>생략 시 기본 브랜치 추적 (로드 시 해석)</li>
      </ul>

      <h2>Path 요구사항</h2>
      <ul>
        <li>저장소 내 디렉터리 경로여야 함</li>
        <li>선행 <code>/</code> 불허</li>
        <li><code>..</code> 탐색 불허</li>
      </ul>

      <h2>가져오기 동작</h2>
      <ul>
        <li><code>codeload.github.com</code>에서 다운로드</li>
        <li>연결 타임아웃: 5초</li>
        <li>다운로드 타임아웃: 30초</li>
        <li>최대 다운로드 크기: 20 MB 압축</li>
        <li>최대 추출 크기: 100 MB</li>
        <li>최대 파일 수: 5,000개</li>
      </ul>

      <h2>보안</h2>
      <ul>
        <li>심볼릭 링크 거부</li>
        <li>1회 리다이렉트만 허용 (GitHub 도메인 내)</li>
        <li>gzip 매직 바이트 검증</li>
        <li>원자적 추출 (임시 디렉터리 후 이동)</li>
      </ul>
    </div>
  );
});
