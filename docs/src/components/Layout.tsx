import { mount } from 'lithent';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { appStore } from '@/store';
import { Home } from '@/pages/Home';
import { HomeKo } from '@/pages/Home_ko';
import { Introduction } from '@/pages/Introduction';
import { IntroductionKo } from '@/pages/Introduction_ko';
import { QuickStart } from '@/pages/QuickStart';
import { QuickStartKo } from '@/pages/QuickStart_ko';
import { AgentAddon } from '@/pages/AgentAddon';
import { AgentAddonKo } from '@/pages/AgentAddon_ko';
import { CtxCommands } from '@/pages/CtxCommands';
import { CtxCommandsKo } from '@/pages/CtxCommands_ko';
import { AgentCommands } from '@/pages/AgentCommands';
import { AgentCommandsKo } from '@/pages/AgentCommands_ko';
import { SkillCommands } from '@/pages/SkillCommands';
import { SkillCommandsKo } from '@/pages/SkillCommands_ko';
import { Skillpack } from '@/pages/Skillpack';
import { SkillpackKo } from '@/pages/Skillpack_ko';
import { Skillref } from '@/pages/Skillref';
import { SkillrefKo } from '@/pages/Skillref_ko';
import { ConfigEnv } from '@/pages/ConfigEnv';
import { ConfigEnvKo } from '@/pages/ConfigEnv_ko';
import { ConfigFile } from '@/pages/ConfigFile';
import { ConfigFileKo } from '@/pages/ConfigFile_ko';
import { ErrorCodes } from '@/pages/ErrorCodes';
import { ErrorCodesKo } from '@/pages/ErrorCodes_ko';
import { StorageModel } from '@/pages/StorageModel';
import { StorageModelKo } from '@/pages/StorageModel_ko';

type PageComponent = (...args: any[]) => any;

const normalizeRoute = (path: string) => {
  const cleaned = path.replace(/\/+$/, '');
  return cleaned || '/';
};

// Route configuration
const routes: Record<string, PageComponent> = {
  '/': Home,
  '/ko': HomeKo,
  '/guide/introduction': Introduction,
  '/ko/guide/introduction': IntroductionKo,
  '/guide/quick-start': QuickStart,
  '/ko/guide/quick-start': QuickStartKo,
  '/guide/agent-addon': AgentAddon,
  '/ko/guide/agent-addon': AgentAddonKo,
  '/commands/ctx': CtxCommands,
  '/ko/commands/ctx': CtxCommandsKo,
  '/commands/agent': AgentCommands,
  '/ko/commands/agent': AgentCommandsKo,
  '/commands/skill': SkillCommands,
  '/ko/commands/skill': SkillCommandsKo,
  '/advanced/skillpack': Skillpack,
  '/ko/advanced/skillpack': SkillpackKo,
  '/advanced/skillref': Skillref,
  '/ko/advanced/skillref': SkillrefKo,
  '/config/env': ConfigEnv,
  '/ko/config/env': ConfigEnvKo,
  '/config/file': ConfigFile,
  '/ko/config/file': ConfigFileKo,
  '/reference/errors': ErrorCodes,
  '/ko/reference/errors': ErrorCodesKo,
  '/reference/storage': StorageModel,
  '/ko/reference/storage': StorageModelKo,
};

const resolveRoute = (path: string): PageComponent => {
  const normalized = normalizeRoute(path);
  const current = routes[normalized];

  if (current) {
    return current;
  }

  if (normalized.startsWith('/ko')) {
    const fallback = normalizeRoute(normalized.replace(/^\/ko/, '') || '/');
    return routes[fallback] || Introduction;
  }

  return Introduction;
};

export const Layout = mount(renew => {
  const store = appStore.watch(renew);

  return () => {
    const CurrentPage = resolveRoute(store.route);

    return (
      <div class="min-h-screen bg-white dark:bg-[#1b1b1f] transition-colors">
        <Header />

        {/* Main Container - centered with max-width */}
        <div class="mx-auto max-w-[1440px]">
          <div class="flex">
            <Sidebar />

            {/* Main Content */}
            <main class="flex-1 w-full min-w-0 px-6 md:px-12 py-8 max-w-full">
              <div class="max-w-full md:max-w-[43rem] page-shell">
                <CurrentPage />
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  };
});
