import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'SJY Blog',
  description: 'Personal Dev Blog by SJY',
  lang: 'ko-KR',

  base: '/',
  cleanUrls: true,
  lastUpdated: false,
  ignoreDeadLinks: true,

  sitemap: {
    hostname: 'https://sjy0917032.github.io'
  },

  head: [
    ['meta', { name: 'author', content: 'SJY' }],
    ['meta', { name: 'keywords', content: 'programming, blog, development, typescript, javascript, backend' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'SJY Blog' }],
    ['meta', { property: 'og:title', content: 'SJY Blog' }],
    ['meta', { property: 'og:description', content: 'Personal Dev Blog by SJY' }],
    ['meta', { property: 'og:url', content: 'https://sjy0917032.github.io' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: 'SJY Blog' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  ],

  themeConfig: {
    logo: false,
    siteTitle: 'SJY Blog',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Posts', link: '/posts/' },
    ],

    sidebar: {
      '/posts/': [
        {
          text: 'Posts',
          collapsed: false,
          items: [
            { text: '목록', link: '/posts/' },
          ]
        },
        {
          text: '아키텍처 & 설계',
          collapsed: false,
          items: [
            { text: '공급사 6곳의 API를 하나로', link: '/posts/api-gateway-layer' },
            { text: '예약 성공, 결제 실패 — 분산 트랜잭션 없이 일관성 확보하기', link: '/posts/distributed-transaction' },
            { text: '인천공항이 네 가지 이름으로 저장된 이유 — 공급사 데이터 정규화', link: '/posts/data-normalization' },
          ]
        },
        {
          text: '인프라 & 비용',
          collapsed: false,
          items: [
            { text: 'DocumentDB 스토리지 비용 91% 절감', link: '/posts/infra-cost-reduction' },
          ]
        },
        {
          text: '자동화 & 운영',
          collapsed: false,
          items: [
            { text: '인수증 발송 파이프라인 재설계', link: '/posts/invoice-pipeline' },
            { text: '레거시 TMS 연동 개편', link: '/posts/legacy-tms-refactor' },
            { text: '수기 결제 자동화', link: '/posts/payment-automation' },
            { text: 'Google Sheets에서 NestJS 어드민으로', link: '/posts/admin-rbac' },
          ]
        },
        {
          text: '분산 시스템',
          collapsed: false,
          items: [
            { text: 'Redis 분산 크론 스케줄러', link: '/posts/distributed-scheduler' },
            { text: '실시간 채팅·현재상태 시스템', link: '/posts/realtime-chat' },
          ]
        },
        {
          text: '비동기 처리',
          collapsed: false,
          items: [
            { text: '주문과 결제를 비동기로 분리하면', link: '/posts/order-payment' },
            { text: '알림 채널 3개를 독립 큐로', link: '/posts/notification-dispatcher' },
          ]
        },
        {
          text: '검색 & 데이터',
          collapsed: false,
          items: [
            { text: 'SQLite FTS5 검색 파이프라인', link: '/posts/search-pipeline' },
          ]
        },
        {
          text: '오픈소스 기여',
          collapsed: false,
          items: [
            { text: 'AI 에이전트 오케스트레이터에 기여한 이야기', link: '/posts/oss-claw-empire' },
          ]
        },
      ],
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
