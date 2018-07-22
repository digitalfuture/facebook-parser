const express = require('express')
const router = express.Router()
const request = require('axios')

router.post('/', checkProxy)

async function checkProxy(req, res) {
  console.log('--> Proxy checking:\n', req.body)
  const url = 'http://m.facebook.com'

  try {
    const result = await request.get(url, {
      proxy: {
        host: req.body.host,
        port: req.body.port,
        auth: {
          username: req.body.username,
          password: req.body.password
        }
      },
      timeout: 5000
    })

    console.log(
      '---> Proxy check result:',
      result.status == 200 ? 'OK' : 'FAIL'
    )
    console.log('------------------------------------------------------------')

    res.json(result.status == 200 ? 'OK' : 'FAIL')
  } catch (err) {
    console.log('---> Proxy check error:', err.message)
    console.log('------------------------------------------------------------')

    res.json('FAIL')
  }
}

module.exports = router
