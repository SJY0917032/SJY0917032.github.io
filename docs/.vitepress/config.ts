import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
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
    ['script', { defer: '', src: 'https://cloud.umami.is/script.js', 'data-website-id': '1110dc38-fc52-44e9-a143-9582f6b9d1c0' }],
  ],

  themeConfig: {
    logo: false,
    siteTitle: 'SJY Blog',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Posts', link: '/posts/' },
      { text: 'Resume', link: '/resume/' },
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
            { text: '예약 성공, 결제 실패 — 분산 트랜잭션 없이 일관성 확보', link: '/posts/distributed-transaction' },
            { text: '쿠폰이 예약 코드 안에 있으면 안 되는 이유', link: '/posts/coupon-domain' },
            { text: '어드민 RBAC 설계', link: '/posts/admin-rbac' },
          ]
        },
        {
          text: '데이터 & 검색',
          collapsed: false,
          items: [
            { text: '지점 마스터 시스템', link: '/posts/location-master' },
          ]
        },
        {
          text: '인프라 & 비용',
          collapsed: false,
          items: [
            { text: 'DocumentDB 비용 91% 절감', link: '/posts/infra-cost-reduction' },
          ]
        },
        {
          text: '자동화 & 운영',
          collapsed: false,
          items: [
            { text: '인수증 발송 파이프라인 재설계', link: '/posts/invoice-pipeline' },
            { text: '레거시 TMS 연동 개편', link: '/posts/legacy-tms-refactor' },
            { text: '수기 결제 자동화', link: '/posts/payment-automation' },
            { text: 'PG사 추상화 — 이니시스 이틀 만에 연동', link: '/posts/pg-abstraction' },
          ]
        },
        {
          text: 'API 연동',
          collapsed: false,
          items: [
            { text: '예약이 두 건 잡혔습니다 — 멱등키', link: '/posts/idempotency-key' },
          ]
        },
        {
          text: '오픈소스 기여',
          collapsed: false,
          items: [
            { text: 'Claw-Empire 기여 후기', link: '/posts/oss-claw-empire' },
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
}))
