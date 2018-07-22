<template>
  <v-card>
    <v-toolbar>
      <v-toolbar-title>Facebook parser logs</v-toolbar-title>
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
      :items="logs"
      :rows-per-page-items="[20,50,100,{'text':'All','value':-1}]"
      :pagination.sync="pagination">
      <template 
        slot="items"
        slot-scope="props">
        <td>{{ formatDate(props.item.date) }}</td>
        <td>{{ props.item.taskId }}</td>
        <td>{{ props.item.status }}</td>

        <td>
          <v-btn 
            v-if="props.item.stdout" 
            icon 
            @click="handleShowInfo(props.item)">
            <v-icon>mdi-circle</v-icon>
          </v-btn>
        </td>

        <td>
          <v-btn 
            v-if="props.item.stderr"
            icon 
            @click="handleShowError(props.item)">
            <v-icon>mdi-circle</v-icon>
          </v-btn>
        </td>

      </template>
    </v-data-table>
      
    <v-dialog 
      v-model="infoDialog"
      lazy>
      <v-card>
        <v-card-title>
          INFO
        </v-card-title>
        <v-card-text>
          {{ stdout }}  
        </v-card-text>
        <v-card-actions>
          <v-btn 
            flat
            @click.stop="infoDialog = false">Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <v-dialog 
      v-model="errorDialog"
      lazy>
      <v-card>
        <v-card-title>
          ERROR
        </v-card-title>
        <v-container>
          <v-layout
            row
            wrap>
            <v-flex xs6>
              <v-card-text>
                {{ stderr }}
              </v-card-text>
            </v-flex>
            <v-flex xs6>
              <v-card-media
                :src="img"
                :height="img ? '300px' : 'auto'"
                contain />
            </v-flex>
          </v-layout>
        </v-container>
        <v-card-actions>
          <v-btn 
            flat
            @click.stop="errorDialog = false">Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-card>
</template>
<script>
import { DateTime } from 'luxon'

export default {
  name: 'Logs',
  data: () => ({
    headers: [
      { text: 'Started', value: 'date' },
      { text: 'Task ID', value: 'taskId' },
      { text: 'Status', value: 'status' },
      { text: 'Info', value: 'info' },
      { text: 'Error', value: 'error' }
    ],
    pagination: { sortBy: 'date', descending: true, rowsPerPage: 20 },
    logs: [],
    interval: null,
    infoDialog: false,
    errorDialog: false,
    img: '',
    stdout: null,
    stderr: null
  }),
  mounted() {
    this.getLogs()
  },
  methods: {
    getLogs() {
      return axios
        .get('/api/v1/FbLogs', { limit: 500, sort: 'date' })
        .then(res =>
          res.data.sort((a, b) => new Date(b.date) - new Date(a.date))
        )
        .then(data => {
          this.logs = data
          // console.log('Logs refreshed')
        })
        .catch(err => {
          console.log(err)
        })
    },
    setInterval() {
      this.interval = setInterval(() => {
        this.getLogs()
      }, 3000)
    },
    clearInterval() {
      clearInterval(this.interval)
      this.interval = null
    },
    handleShowInfo(item) {
      this.infoDialog = true
      this.stdout = item.stdout
    },
    handleShowError(item) {
      this.errorDialog = true
      this.img = item.img
      this.stderr = item.stderr
    },
    formatDate(date) {
      return DateTime.fromISO(date).toFormat('ff')
    }
  }
}
</script>
