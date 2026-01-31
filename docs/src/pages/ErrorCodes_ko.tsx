import { mount } from 'lithent';
import { CodeBlock } from '@/components/CodeBlock';

export const ErrorCodesKo = mount(() => {
  return () => (
    <div class="page-sheet">
      <h1>에러 코드</h1>

      <p>
        모든 ctxbin 에러는 <code>stderr</code>에 기록되며 종료 코드 <code>1</code>로 종료됩니다.
        에러는 쉬운 파싱을 위해 단일 줄 형식을 사용합니다.
      </p>

      <h2>에러 형식</h2>
      <CodeBlock
        language="text"
        code={`CTXBIN_ERR <CODE>: <message>`}
      />

      <h2>에러 코드</h2>

      <table>
        <thead>
          <tr>
            <th>코드</th>
            <th>설명</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>INVALID_INPUT</code></td>
            <td>누락, 추가 또는 결합된 플래그; 잘못된 인자</td>
          </tr>
          <tr>
            <td><code>MISSING_KEY</code></td>
            <td>키가 필요하지만 제공되지 않음 (agent/skill 명령어)</td>
          </tr>
          <tr>
            <td><code>INVALID_URL</code></td>
            <td>skillref에 대해 URL 형식이 잘못됨</td>
          </tr>
          <tr>
            <td><code>INVALID_REF</code></td>
            <td>커밋 SHA가 40자 16진수 형식이 아님</td>
          </tr>
          <tr>
            <td><code>INVALID_PATH</code></td>
            <td>경로에 탐색이 포함되거나 잘못됨</td>
          </tr>
          <tr>
            <td><code>NOT_IN_GIT</code></td>
            <td>키 추론에 git 저장소가 필요하지만 안에 있지 않음</td>
          </tr>
          <tr>
            <td><code>NOT_FOUND</code></td>
            <td>키 또는 원격 경로가 존재하지 않음</td>
          </tr>
          <tr>
            <td><code>TYPE_MISMATCH</code></td>
            <td>값 타입에 잘못된 플래그 (예: 문자열에 --dir)</td>
          </tr>
          <tr>
            <td><code>SIZE_LIMIT</code></td>
            <td>tarball 또는 다운로드가 크기 제한 초과</td>
          </tr>
          <tr>
            <td><code>NETWORK</code></td>
            <td>저장소 또는 가져오기 요청 실패</td>
          </tr>
          <tr>
            <td><code>IO</code></td>
            <td>파일 시스템 또는 파싱 에러</td>
          </tr>
        </tbody>
      </table>

      <h2>예제</h2>
      <CodeBlock
        language="text"
        code={`CTXBIN_ERR NOT_IN_GIT: must run inside a git repository
CTXBIN_ERR MISSING_KEY: key is required
CTXBIN_ERR NOT_FOUND: no value for ctx:my-project/main
CTXBIN_ERR SIZE_LIMIT: skillpack tar.gz exceeds 7MB limit
CTXBIN_ERR TYPE_MISMATCH: --dir cannot be used with string values`}
      />

      <h2>에러 파싱</h2>
      <CodeBlock
        language="bash"
        code={`# 에러 코드 추출
$ npx ctxbin ctx load 2>&1 | grep -oP 'CTXBIN_ERR \\K[A-Z_]+'

# 특정 에러 확인
$ npx ctxbin ctx load 2>&1 | grep -q "CTXBIN_ERR NOT_FOUND" && echo "not found"`}
      />
    </div>
  );
});
