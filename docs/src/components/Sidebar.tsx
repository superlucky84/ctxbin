import { mount } from 'lithent';
import { appStore, navigateTo, resolveRouteForLanguage } from '@/store';

interface MenuItem {
  text: { en: string; ko: string };
  link: string;
  external?: boolean;
}

interface MenuSection {
  text: { en: string; ko: string };
  items: MenuItem[];
}

const menuData: MenuSection[] = [
  {
    text: { en: 'Getting Started', ko: '시작하기' },
    items: [
      { text: { en: 'Introduction', ko: '소개' }, link: '/guide/introduction' },
      { text: { en: 'Quick Start', ko: '빠른 시작' }, link: '/guide/quick-start' },
      {
        text: { en: 'GitHub', ko: 'GitHub' },
        link: 'https://github.com/superlucky84/ctxbin',
        external: true,
      },
      {
        text: { en: 'AI Agent Addon', ko: 'AI Agent Addon' },
        link: '/guide/agent-addon',
      },
    ],
  },
  {
    text: { en: 'Commands', ko: '명령어' },
    items: [
      { text: { en: 'ctx Commands', ko: 'ctx 명령어' }, link: '/commands/ctx' },
      { text: { en: 'agent Commands', ko: 'agent 명령어' }, link: '/commands/agent' },
      { text: { en: 'skill Commands', ko: 'skill 명령어' }, link: '/commands/skill' },
    ],
  },
  {
    text: { en: 'Advanced', ko: '고급 기능' },
    items: [
      { text: { en: 'Skillpack (Directory)', ko: 'Skillpack (디렉터리)' }, link: '/advanced/skillpack' },
      { text: { en: 'Skillref (GitHub)', ko: 'Skillref (GitHub)' }, link: '/advanced/skillref' },
    ],
  },
  {
    text: { en: 'Configuration', ko: '설정' },
    items: [
      { text: { en: 'Environment Variables', ko: '환경 변수' }, link: '/config/env' },
      { text: { en: 'Config File', ko: '설정 파일' }, link: '/config/file' },
    ],
  },
  {
    text: { en: 'Reference', ko: '레퍼런스' },
    items: [
      { text: { en: 'Error Codes', ko: '에러 코드' }, link: '/reference/errors' },
      { text: { en: 'Storage Model', ko: '저장소 모델' }, link: '/reference/storage' },
    ],
  },
];

const normalizePath = (path: string) => path.replace(/\/+$/, '') || '/';

export const Sidebar = mount(renew => {
  const store = appStore.watch(renew);
  const expanded: Record<string, boolean> = Object.fromEntries(
    menuData.map(section => [section.text.en, false])
  );
  let prevRoute = '';

  const handleClick = (link: string) => {
    const lang = store.route.startsWith('/ko') ? 'ko' : 'en';
    navigateTo(resolveRouteForLanguage(link, lang));
  };

  const toggleSection = (titleKey: string) => {
    expanded[titleKey] = !expanded[titleKey];
    renew();
  };

  return () => {
    const routeChanged = store.route !== prevRoute;
    const normalizedRoute = normalizePath(store.route);
    const currentLang = store.route.startsWith('/ko') ? 'ko' : 'en';
    const toLocalizedLink = (link: string) =>
      normalizePath(resolveRouteForLanguage(link, currentLang));

    // Close all sections when navigating to home
    if (
      routeChanged &&
      (normalizedRoute === '/' || normalizedRoute === '/ko')
    ) {
      menuData.forEach(section => {
        expanded[section.text.en] = false;
      });
    }

    const view = (
      <>
        {/* Mobile overlay */}
        {store.sidebarOpen && (
          <div
            class="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => {
              store.sidebarOpen = false;
            }}
          />
        )}

        {/* Sidebar */}
        <aside
          class={`
            fixed lg:sticky top-16 left-0 z-40
            w-64 h-[calc(100vh-4rem)] flex-shrink-0
            bg-white dark:bg-[#1b1b1f]
            border-r border-gray-200 dark:border-gray-800
            overflow-y-auto
            transition-transform duration-300
            ${store.sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav class="pl-6 md:pl-12 pr-3 md:pr-4 py-6">
            {menuData.map(section => {
              const sectionKey = section.text.en;
              if (
                routeChanged &&
                normalizedRoute !== '/' &&
                normalizedRoute !== '/ko'
              ) {
                const hasActive = section.items.some(item => {
                  if (item.external) return false;
                  return toLocalizedLink(item.link) === normalizedRoute;
                });
                if (hasActive) {
                  expanded[sectionKey] = true;
                }
              }

              const isExpanded = expanded[sectionKey];

              return (
                <div class="mb-3">
                  <button
                    class="mb-1 w-full flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider"
                    onClick={() => toggleSection(sectionKey)}
                  >
                    <span>{section.text[currentLang]}</span>
                    <span class="text-base leading-none">
                      {isExpanded ? '▾' : '▸'}
                    </span>
                  </button>
                  <ul
                    class={`
                      space-y-0 overflow-hidden transition-all duration-200 ease-in-out
                      ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}
                    `}
                    aria-hidden={!isExpanded}
                  >
                    {section.items.map(item => {
                      const isExternal = item.external;
                      const targetLink = isExternal
                        ? item.link
                        : resolveRouteForLanguage(item.link, currentLang);
                      const isActive = isExternal
                        ? false
                        : normalizedRoute === normalizePath(targetLink);
                      return (
                        <li>
                          <a
                            href={targetLink}
                            target={isExternal ? '_blank' : undefined}
                            rel={isExternal ? 'noreferrer' : undefined}
                            onClick={
                              isExternal
                                ? undefined
                                : (e: Event) => {
                                    e.preventDefault();
                                    handleClick(item.link);
                                  }
                            }
                            class={`
                              block px-2 py-1.5 rounded-md text-sm font-normal transition-colors
                              ${
                                isActive
                                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                                  : 'text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }
                            `}
                          >
                            {item.text[currentLang]}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>
      </>
    );

    prevRoute = store.route;
    return view;
  };
});
