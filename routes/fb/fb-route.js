const express = require('express')
const mongoose = require('mongoose')
const config = require('../../config.json')

const { exec, spawn } = require('child_process')

const router = express.Router()

// router.post('/', execProcess)
router.post('/', spawnProcess)

// Exec way
function execProcess(req, res) {
  const query = {
    cmd: req.body.serverCommand,
    login: req.body.login,
    proxy: req.body.proxy,
    ref: req.body.ref,
    id: req.body.id,
    cburl: req.body.cburl,
    useragent: req.body.useragent,
    taskId: req.body.taskId
  }

  const cmdParams = {
    login: '-l ' + query.login,
    cmd: query.cmd ? '-c ' + query.cmd : '',
    proxy: query.proxy ? '-p ' + query.proxy : '',
    ref: '-r ' + query.ref,
    id: '-i ' + query.id,
    cburl: '-u ' + query.cburl,
    useragent: query.useragent ? '-a ' + '"' + query.useragent + '"' : '',
    taskId: '-t ' + query.taskId
  }

  const cmdString =
    'node ./routes/fb/fb-parse ' +
    cmdParams.login +
    ' ' +
    cmdParams.cmd +
    ' ' +
    cmdParams.proxy +
    ' ' +
    cmdParams.ref +
    ' ' +
    cmdParams.id +
    ' ' +
    cmdParams.cburl +
    ' ' +
    cmdParams.useragent +
    ' ' +
    cmdParams.taskId

  const child = exec(cmdString, (err, stdout, stderr) => {
    console.log(`Child process started. [ID = ${child.pid}]`)

    console.log(stdout)
    console.log(stderr)

    if (err) {
      console.log("Can't execute command. Params:", query)
    }
  })

  let stdout = ''
  let stderr = ''

  process.on('error', data => {
    console.log(data)
    child.kill()
  })

  child.stderr.on('data', data => {
    console.log(data)
    stderr += data + '\n'
    child.kill()
  })

  child.stdout.on('data', data => {
    console.log(data)
    stdout += data + '\n'
  })

  child.on('close', exitcode => {
    console.log(exitcode)

    const FbLog = require('../../mongoose/fb-log')

    FbLog.update(
      { taskId: query.taskId },
      {
        status: 'Finished',
        stdout,
        stderr
      },
      { upsert: true }
    ).catch(err => {
      console.log('Error:', err.message ? err.message : err)
    })

    console.log(
      `Child process [ID = ${child.pid}] finished. Exit code: ${exitcode}`
    )
    console.log('------------------------------------------------------------')
  })

  res.json({ Server: 'OK' })
}

// Spawn way
function spawnProcess(req, res) {
  const query = {
    cmd: req.body.serverCommand,
    login: req.body.login,
    proxy: req.body.proxy,
    ref: req.body.ref,
    id: req.body.id,
    cburl: req.body.cburl,
    useragent: req.body.useragent,
    taskId: req.body.taskId
  }

  const cmdArgs = [
    `-l ${query.login}`,
    query.cmd ? `-c ${query.cmd}` : '',
    query.proxy ? `-p ${query.proxy}` : '',
    `-r ${query.ref}`,
    `-i ${query.id}`,
    `-u ${query.cburl}`,
    query.useragent ? `-a ${query.useragent}` : '',
    `-t ${query.taskId}`
  ]

  const child = spawn('node', ['./routes/fb/fb-parse', ...cmdArgs], {
    detached: true
  })

  let stdout = ''
  let stderr = ''

  child.stdout.on('data', data => {
    stdout += data + '\n'
    console.log(`[PID ${child.pid}] ${data}`)
  })

  child.stderr.on('data', data => {
    stderr += data + '\n'
    console.error(`[PID ${child.pid}] ${data}`)
  })

  child.on('close', exitcode => {
    console.log(exitcode)

    const FbLog = require('../../mongoose/fb-log')

    FbLog.update(
      { taskId: query.taskId },
      {
        status: stderr ? 'Error' : 'Finished',
        stdout,
        stderr
      },
      {
        upsert: true
      }
    ).catch(err => {
      console.log('Error:', err.message ? err.message : err)
    })

    console.log(
      `Child process finished. [PID ${child.pid}]. Exit code: ${exitcode}`
    )

    console.log('------------------------------------------------------------')
  })

  child.on('error', err => {
    console.log(`Error in child process [ID = ${child.pid}]`)
    console.log('Error:', err)
  })

  res.json({ Server: 'OK' })
}

module.exports = router
