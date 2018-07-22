import Vue from 'vue'
import App from './app.vue'

Vue.use(Vuetify)

new Vue({
  el: '#app',
  render: h => h(App)
})

Vue.config.productionTip = false
