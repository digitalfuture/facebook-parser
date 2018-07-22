const mongoose = require('mongoose')

const fbUserSchema = mongoose.Schema({
  date: Date,
  login: String,
  password: String,
  name: String,
  phone: String,
  location: String,
  origin: String,
  cookies: Object,
  alert: Boolean,
  id: Number
})

module.exports = mongoose.model('FbUser', fbUserSchema)
