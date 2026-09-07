import store from '@/store'
export default {
  install (Vue, options) {
    if (options.developmentOff && import.meta.env.DEV) return
    Vue.config.errorHandler = (error, vm, mes) => {
      const info = {
        type: 'script',
        code: 0,
        mes: error.message,
        url: window.location.href
      }
      Vue.nextTick(() => {
        store.dispatch('addErrorLog', info)
      })
    }
  }
}
