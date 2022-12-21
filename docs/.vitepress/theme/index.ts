import { useData, useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import giscusTalk from 'vitepress-plugin-comment-with-giscus'
import { toRefs } from 'vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  setup() {
    const { frontmatter } = toRefs(useData())
    const route = useRoute()

    giscusTalk(
      {
        repo: 'SJY0917032/SJY0917032.github.io',
        repoId: 'R_kgDOGnpcMg',
        category: 'General',
        categoryId: 'DIC_kwDOGnpcMs4C2728',
        mapping: 'pathname',
        inputPosition: 'top',
        lang: 'ko',
        loading: 'lazy',
      },
      { frontmatter, route },
      true
    )
  },
}
