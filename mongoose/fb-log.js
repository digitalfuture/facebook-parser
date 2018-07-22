const mongoose = require('mongoose')

const fbLogSchema = mongoose.Schema({
  date: Date,
  taskId: String,
  status: String,
  stdout: String,
  stderr: String,
  img: String
})

module.exports = mongoose.model('FbLog', fbLogSchema)
