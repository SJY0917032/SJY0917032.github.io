import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'SJY Blog',
  description: 'Personal Wiki & Dev Blog by SJY',
  lang: 'ko-KR',

  base: '/',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,

  sitemap: {
    hostname: 'https://sjy0917032.github.io'
  },

  head: [
    ['meta', { name: 'author', content: 'SJY' }],
    ['meta', { name: 'keywords', content: 'programming, wiki, blog, development, typescript, javascript' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'SJY Blog' }],
    ['meta', { property: 'og:title', content: 'SJY Blog' }],
    ['meta', { property: 'og:description', content: 'Personal Wiki & Dev Blog by SJY' }],
    ['meta', { property: 'og:url', content: 'https://sjy0917032.github.io' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: 'SJY Blog' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  ],

  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: 'SJY Blog',

    nav: [
      { text: 'Home', link: '/' },
      {
        text: '글',
        items: [
          { text: '실무 이야기', link: '/work/' },
          { text: '프로젝트', link: '/projects/' },
        ]
      },
      {
        text: 'Wiki',
        items: [
          { text: 'Programming', link: '/programming/' },
          { text: 'Knowledge', link: '/knowledge/' },
        ]
      },
      { text: 'Diary', link: '/diary/diary' },
      { text: 'Plans', link: '/plans/' },
    ],

    sidebar: {
      '/work/': [
        {
          text: '실무 이야기',
          collapsed: false,
          items: [
            { text: '목록', link: '/work/' },
          ]
        },
        {
          text: '아키텍처 & 설계',
          collapsed: false,
          items: [
            { text: '공급사 6곳의 API를 하나로', link: '/work/api-gateway-layer' },
            { text: '예약 성공, 결제 실패 — 분산 트랜잭션 없이 일관성 확보하기', link: '/work/distributed-transaction' },
            { text: '인천공항이 네 가지 이름으로 저장된 이유 — 공급사 데이터 정규화', link: '/work/data-normalization' },
          ]
        },
        {
          text: '인프라 & 비용',
          collapsed: false,
          items: [
            { text: 'AWS 인프라 비용 92% 절감 — DocumentDB TTL 아카이빙과 RabbitMQ 전환', link: '/work/infra-cost-reduction' },
          ]
        },
        {
          text: '자동화 & 운영',
          collapsed: false,
          items: [
            { text: '인수증 발송 파이프라인 재설계 — GAS에서 NestJS + SQS + Lambda로', link: '/work/invoice-pipeline' },
            { text: '레거시 TMS 연동 개편 — 인터페이스 추상화와 재시도 설계', link: '/work/legacy-tms-refactor' },
            { text: '수기 결제 자동화 — 토스페이먼츠 정기결제와 PG 추상화 설계', link: '/work/payment-automation' },
            { text: 'Google Sheets에서 NestJS 어드민으로 — 팀 계층 RBAC 설계', link: '/work/admin-rbac' },
          ]
        },
      ],
      '/projects/': [
        {
          text: '프로젝트',
          collapsed: false,
          items: [
            { text: '목록', link: '/projects/' },
          ]
        },
        {
          text: '분산 시스템',
          collapsed: false,
          items: [
            { text: 'Redis 리더 선출로 분산 크론 스케줄러 만들기', link: '/projects/distributed-scheduler' },
            { text: '수평 확장 가능한 실시간 채팅·현재상태 시스템', link: '/projects/realtime-chat' },
          ]
        },
        {
          text: '비동기 처리',
          collapsed: false,
          items: [
            { text: '주문과 결제를 비동기로 분리하면 생기는 일', link: '/projects/order-payment' },
            { text: '알림 채널 3개를 독립 큐로 분리한 이유', link: '/projects/notification-dispatcher' },
          ]
        },
        {
          text: '검색 & 데이터',
          collapsed: false,
          items: [
            { text: 'SQLite FTS5로 검색 파이프라인 만들기', link: '/projects/search-pipeline' },
          ]
        },
      ],
      '/programming/': [
        {
          text: 'Programming',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/programming/' },
          ]
        },
        {
          text: 'Languages',
          collapsed: false,
          items: [
            { text: 'JavaScript / TypeScript', link: '/programming/#javascript-typescript' },
          ]
        }
      ],
      '/knowledge/': [
        {
          text: 'Knowledge Base',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/knowledge/' },
          ]
        }
      ],
      '/diary/': [
        {
          text: 'Diary',
          collapsed: false,
          items: [
            { text: 'Index', link: '/diary/diary' },
          ]
        }
      ]
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '검색',
            buttonAriaLabel: '검색'
          },
          modal: {
            noResultsText: '결과를 찾을 수 없습니다',
            resetButtonTitle: '검색 초기화',
            footer: {
              selectText: '선택',
              navigateText: '이동',
              closeText: '닫기'
            }
          }
        }
      }
    },

    outline: {
      level: [2, 3],
      label: '목차'
    },

    lastUpdated: {
      text: '마지막 수정',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    },

    docFooter: {
      prev: '이전 글',
      next: '다음 글'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/SJY0917032' }
    ],

    footer: {
      message: 'Built with VitePress',
      copyright: '© 2025 SJY'
    },

    returnToTopLabel: '맨 위로',
    darkModeSwitchLabel: '테마',
    darkModeSwitchTitle: '다크 모드로 전환',
    lightModeSwitchTitle: '라이트 모드로 전환',
  },

  markdown: {
    lineNumbers: true,
    toc: {
      level: [2, 3]
    },
    image: {
      lazyLoading: true
    }
  },

  transformPageData(pageData) {
    const canonicalUrl = `https://sjy0917032.github.io/${pageData.relativePath}`
      .replace(/index\.md$/, '')
      .replace(/\.md$/, '')
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: canonicalUrl }],
      ['meta', { property: 'og:url', content: canonicalUrl }]
    )
  }
})
