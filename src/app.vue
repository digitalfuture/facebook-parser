<template>
  <v-app id="app">
    <v-tabs v-model="active">
      <v-tab 
        id="users" 
        ripple>
        Users
      </v-tab>
      <v-tab-item>
        <Users/>
      </v-tab-item>
      <v-tab 
        id="logs" 
        ripple>
        Logs
      </v-tab>
      <v-tab-item>
        <Logs/>
      </v-tab-item>
    </v-tabs>
  </v-app>
</template>
<script>
import Users from './users.vue'
import Logs from './logs.vue'

export default {
  name: 'App',
  components: {
    Users,
    Logs
  }
}
</script>
