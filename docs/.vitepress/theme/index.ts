import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import './custom.css'

function initScrollReveal() {
  const targets = document.querySelectorAll(
    '.vp-doc h2, .vp-doc h3, .vp-doc pre, .vp-doc blockquote, .vp-doc table, .blog-card'
  )
  if (!targets.length) return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scroll-reveal', 'revealed')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  )

  targets.forEach((el) => {
    el.classList.add('scroll-reveal')
    observer.observe(el)
  })
}

function initReadingProgress() {
  const existing = document.querySelector('.reading-progress')
  if (existing) existing.remove()

  const isDocPage = document.querySelector('.vp-doc')
  if (!isDocPage) return

  const bar = document.createElement('div')
  bar.className = 'reading-progress'
  bar.style.width = '0%'
  document.body.appendChild(bar)

  const onScroll = () => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
    bar.style.width = `${Math.min(progress, 100)}%`
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
}

function initCardSpotlight() {
  const cards = document.querySelectorAll('.blog-card')
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e: Event) => {
      const mouseEvent = e as MouseEvent
      const rect = (card as HTMLElement).getBoundingClientRect()
      const x = ((mouseEvent.clientX - rect.left) / rect.width) * 100
      const y = ((mouseEvent.clientY - rect.top) / rect.height) * 100
      ;(card as HTMLElement).style.setProperty('--mouse-x', `${x}%`)
      ;(card as HTMLElement).style.setProperty('--mouse-y', `${y}%`)
    })
  })
}

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute()

    onMounted(() => {
      nextTick(() => {
        initScrollReveal()
        initReadingProgress()
        initCardSpotlight()
      })
    })

    watch(() => route.path, () => {
      nextTick(() => {
        initScrollReveal()
        initReadingProgress()
        initCardSpotlight()
      })
    })
  },
} satisfies Theme
