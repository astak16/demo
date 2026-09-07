export const getRoutesName = (routes) => {
  if (!Array.isArray(routes)) return []

  return routes.reduce((names, item) => {
    names.push(item.name)

    if (Array.isArray(item.children) && item.children.length > 0) {
      names.push(...getRoutesName(item.children))
    }

    return names
  }, [])
}
