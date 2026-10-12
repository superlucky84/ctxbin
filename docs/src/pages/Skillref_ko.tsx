import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';
import { navigateTo } from '@/store';

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

      <h2>--ref 사용 시점</h2>
      <p>
        <code>--ref</code> 옵션은 스킬을 특정 버전에 <strong>고정</strong>할지,
        최신 코드를 <strong>추적</strong>할지 결정합니다.
      </p>
      <ul>
        <li>
          <strong>--ref 사용 (고정)</strong>: 해당 커밋의 동일한 코드를 항상 가져옵니다.
          재현성, 버전 관리가 필요하거나 예기치 않게 변경되지 않는 안정적인 스킬이 필요할 때 사용하세요.
        </li>
        <li>
          <strong>--ref 생략 (추적)</strong>: 로드할 때마다 기본 브랜치의 최신 코드를 가져옵니다.
          항상 최신 버전의 스킬을 사용하고 싶을 때 사용하세요.
        </li>
      </ul>

      <h2>Skillref 로드</h2>
      <CodeBlock
        language="bash"
        code={`$ npx ctxbin skill load my-skill --dir ./output/my-skill`}
      />
      <p>skillref 로드에는 <code>--dir</code>이 필수입니다.</p>

      <h2>Sync로 설치</h2>
      <CodeBlock language="bash" code={`npx ctxbin sync --target all --dry-run
npx ctxbin sync --target all`} />
      <p>Sync는 참조를 해석하고 내려받으며 지정한 저장소 디렉터리의 루트에 SKILL.md가 있어야 합니다. 고정 참조는 같은 커밋을 사용하고, 기본 브랜치 추적 참조는 미리보기를 포함한 실행마다 기본 브랜치를 해석합니다. 원격 저장소 접근과 GitHub 다운로드가 필요합니다.</p>
      <p>Load --dir은 같은 경로 파일을 복사하며 추가 로컬 파일은 유지합니다. Sync는 같은 이름의 설치된 스킬 전체를 교체해 내려받은 보조 파일을 반영하고 내부의 오래된 파일을 제거합니다. 다른 로컬 스킬은 유지합니다. 설치 위치와 삭제 옵션은 <span onClick={() => navigateTo('/commands/sync')} class="text-indigo-600 hover:underline cursor-pointer">sync 명령어</span>에서 확인하세요.</p>

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
        <li>격리된 임시 공간에서 추출·검증 후 대상 디렉터리에 복사</li>
      </ul>
      <p>같은 이름 미관리 항목의 교체에는 --force가 필요합니다. 미리보기에서 replace-unmanaged로 표시하며, 관리 항목의 내용·권한이 같으면 unchanged로 표시해 다시 쓰지 않습니다.</p>
      <p>원본 값 백업은 저장된 참조만 보관하며 외부 GitHub 저장소 파일을 내려받거나 스냅샷으로 만들지 않습니다. 자세한 내용은 <span onClick={() => navigateTo('/commands/backup-restore')} class="text-indigo-600 hover:underline cursor-pointer">백업·복구 안내</span>.</p>
    </div>
  );
});
