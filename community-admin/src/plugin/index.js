import config from '@/config'
const { plugin } = config
const plugins = import.meta.glob('./*/index.js', { eager: true })

export default (Vue) => {
  for (const name in plugin) {
    const value = plugin[name]
    const module = plugins[`./${name}/index.js`]

    if (!module) {
      throw new Error(`Unknown plugin: ${name}`)
    }

    Vue.use(module.default, typeof value === 'object' ? value : undefined)
  }
}
