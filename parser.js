const express = require('express')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const mongoose = require('mongoose')
const { DateTime } = require('luxon')
const restify = require('express-restify-mongoose')

const config = require('./config.json')
const fbRoute = require('./routes/fb/fb-route')
const proxyRoute = require('./routes/proxy-route')

//
const app = express()
const router = express.Router()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(methodOverride())

if (mongoose.connection.readyState == 0)
  mongoose
    .connect(config.db)
    .catch(err => console.error('Error connection to DB'))

// GET fb//FbUsers
restify.serve(
  router,
  mongoose.model(
    'FbUsers',
    new mongoose.Schema({
      date: Date,
      id: Number,
      name: String,
      login: String,
      password: String,
      location: String,
      origin: String,
      phone: String,
      cookies: Object,
      alert: Boolean
    })
  )
)

// GET fb/FbLogs
restify.serve(
  router,
  mongoose.model(
    'FbLogs',
    new mongoose.Schema({
      date: Date,
      taskId: String,
      status: String,
      stdout: String,
      stderr: String
    })
  )
)

app.use(router)

app.use(express.static('www'))

app.get('/', (req, res, next) => {
  res.render('index.html')
})

app.use('/fb', fbRoute)
app.use('/proxy', proxyRoute)

app.get('/help', (req, res) => {
  res.send(`
  <pre>
  Social networks parser server. Available routes: 

    POST /fb              - Facebook parser
          
      PARAMETERS:
        login             - Facebook login
        proxy             - user:password@server
        command           - command to run. 'getUserInfo' by default


    POST /proxy           - Proxy checker
          
      PARAMETERS:
        username
        password
        host
        port

  DB API endpoints:

    POST /api/v1/FbUsers  - Facebook users
    POST /api/v1/FbLogs   - Facebook parser logs
  </pre>
  `)
})

require('events').EventEmitter.defaultMaxListeners = 100

const server = app.listen(config.port, () =>
  console.log('-> Parser app listening on port', config.port)
)
