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
        text: 'Wiki',
        items: [
          { text: 'Programming', link: '/programming/' },
          { text: 'Knowledge', link: '/knowledge/' },
          { text: 'Projects', link: '/projects/' },
        ]
      },
      { text: 'Diary', link: '/diary/diary' },
      { text: 'Plans', link: '/plans/' },
    ],

    sidebar: {
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
      '/projects/': [
        {
          text: 'Projects',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/projects/' },
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
