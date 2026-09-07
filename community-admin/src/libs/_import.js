const views = import.meta.glob('../view/**/*.vue')

export default (dir) => {
  const loader = views[`../view${dir}.vue`]

  if (!loader) {
    throw new Error(`Unknown view component: ${dir}`)
  }

  return loader
}
