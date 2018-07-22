module.exports = {
  getUserInfo
  // Any other tasks add here...
}

const config = require('../../config.json')

const fs = require('fs')
const meow = require('meow')
const request = require('axios')
const Nightmare = require('nightmare')
const mongoose = require('mongoose')

const { DateTime } = require('luxon')
const _ = require('highland')

//
const options = getOptions()

const command = options.cmd
const login = options.login.split(':')[0]
const password = options.login.split(':')[1]

console.log('Options:', options)

let db = null
let driver, cookies
let FbLog, FbUser

// Run task
module.exports[command]()

//
// Functions
//
// Top level functions
//
function getOptions() {
  //  Get options from CLI

  const parser = meow(
    `
    Usage
      $ ./fbrarse [Options]
        or
      $ node fbparse [Options]

    Options
      --login,      -l
      --proxy,      -p
      --cmd,        -c    Default: getUserInfo
      --ref,        -r
      --id          -i
      --cburl       -u
      --useragent   -a
      --taskId      -t
      --help              This help`,
    {
      flags: {
        login: {
          alias: 'l'
        },
        proxy: {
          alias: 'p'
        },
        cmd: {
          alias: 'c',
          default: 'getUserInfo'
        },
        ref: {
          alias: 'r'
        },
        id: {
          alias: 'i'
        },
        cburl: {
          alias: 'u'
        },
        useragent: {
          alias: 'a'
        },
        taskId: {
          alias: 't'
        }
      }
    }
  )

  Object.keys(parser.flags).forEach(
    key => (parser.flags[key] = parser.flags[key].toString().trim())
  )

  return parser.flags
}

function getUserInfo() {
  initDb()
    .then(initWebDriver)
    .then(openFacebookPage)
    .then(setCookies)
    .then(loginToFacebook)
    .then(checkIfDisabledAccount)
    .then(checkIfOldPassword)
    .then(checkIfLoginNotice)
    .then(checkIfCheckPoint)
    .then(checkIfSaveLoginOnDevice)
    .then(checkNextButtons)
    .then(checkNextButtons)
    .then(checkNextButtons)
    .then(checkNextButtons)
    .then(checkIfCheckPoint)
    .then(saveCookies)
    .then(checkIfSearchBanned)
    .then(updateStatus)
    .then(processPhones)
    .then(finish)
    .catch(handleError)
}

//
// Middle level functions
//
async function handleError(err) {
  try {
    if (err.message.search(/timed out/) != -1) err.message = 'TimeOut'

    const corezoidData = {
      Status: err.message ? err.message : 'Error. Check server logs.'
    }

    await modifyCorezoid(corezoidData).catch(err => {
      console.error("Can't modify corezoid with data:", corezoidData)
      throw new Error('Modify Corezoid error:' + err)
    })

    const imgName = options.taskId + '.png'
    const imgPath = config.imgDir + imgName

    console.log('--> imgPath:', imgPath)

    const screenshot = await driver.screenshot(imgPath)

    await FbLog.update(
      {
        taskId: options.taskId
      },
      {
        img: '/screenshots/' + options.taskId + '.png'
      },
      {
        upsert: true
      }
    )
      .then(() => console.log('--> Screenshot saved:', imgPath))
      .catch(err => console.error("Can't save screenshot:", imgPath, '. ', err))

    console.error(err)

    await driver.end()
    process.exit()
  } catch (err) {
    console.error(err)
    await driver.end()
    process.exit()
  }
}

async function initDb() {
  console.log('-> Init Database')

  try {
    if (mongoose.connection.readyState == 0) await mongoose.connect(config.db)

    const db = await mongoose.connection
    db.on('error', console.error.bind(console, 'DB connection error:'))
    db.once('open', () => console.log('--> Connected to DB'))

    FbUser = require('../../mongoose/fb-user')
    FbLog = require('../../mongoose/fb-log')

    // Initial values
    await FbLog.update(
      {
        taskId: options.taskId
      },
      {
        date: new Date(),
        taskId: options.taskId,
        status: 'Started',
        stdout: '',
        stderr: ''
      },
      {
        upsert: true,
        overwrite: true
      }
    )
  } catch (err) {
    console.log('Init driver error:', err)
    throw new Error('LoadingError')
  }
}

async function initWebDriver() {
  console.log('-> Init web driver')

  try {
    if (options.proxy) {
      console.log('--> Using proxy:', options.proxy)
      const proxyCredentials = options.proxy.split(/@/)[0].split(/:/)
      const proxyUsername = proxyCredentials[0]
      const proxyPassword = proxyCredentials[1]

      const proxyAddress = options.proxy.split(/@/)[1]

      // Init web driver
      driver = Nightmare({
        show: config.show,
        waitTimeout: 120000,
        switches: {
          'proxy-server': proxyAddress
        }
      })

      if (proxyUsername)
        await driver.authentication(proxyUsername, proxyPassword)
    } else {
      driver = Nightmare({
        show: config.show,
        waitTimeout: 120000
      })
    }

    // if (options.useragent) await driver.useragent(options.useragent)
  } catch (err) {
    console.error('Init driver error:', err)
    throw new Error('LoadingError')
  }
}

async function openFacebookPage() {
  console.log('-> Open Facebook page')

  try {
    await driver.goto('https://m.facebook.com').wait(3000)
  } catch (err) {
    console.log('Open FB page error:', err)
    throw new Error(
      err.message == 'navigation error' ? 'ProxyError' : 'LoadingError'
    )
  }
}

async function setCookies() {
  console.log('-> Set cookies')

  try {
    cookies = await getCookiesFromDb({
      login
    })

    console.log('--> Cookies:', cookies ? 'yes' : 'no')

    if (cookies) {
      await driver.cookies.set(cookies)
    } else {
      await driver.cookies.set({
        name: 'locale',
        value: 'en_GB',
        domain: '.m.facebook.com',
        hostOnly: false,
        path: '/',
        secure: false,
        httpOnly: false,
        session: true
      })
    }

    await driver.refresh()
  } catch (err) {
    console.error('Set cookies error:', err)
    throw new Error('LoadingError')
  }
}

async function loginToFacebook() {
  console.log('-> Login to Facebook')

  try {
    const isNotLogged = await driver.wait(3000).exists('input#m_login_email')

    if (!isNotLogged) return

    await driver.evaluate(
      () => (document.querySelector('input#m_login_email').autocomplete = 'off')
    )

    const isPasswordFieldHidden = await driver.evaluate(() => {
      const passwordField = document.querySelector('input#m_login_password')

      const width = Number(
        window.getComputedStyle(passwordField).width.split('px')[0]
      )

      const result = width < 100

      return result
    })

    if (isPasswordFieldHidden) {
      console.log('--> Single login field found')

      await driver
        .insert('input#m_login_email', login)
        .wait(3000)
        .type('input#m_login_email', '\u000d')
        .wait(3000)
        .insert('input#m_login_password', password)
        .wait(3000)
        .type('input#m_login_password', '\u000d')
        .wait(5000)
    } else {
      console.log('--> Double login field found')

      await driver
        .insert('input#m_login_email', login)
        .wait(2000)
        .insert('input#m_login_password', password)
        .wait(2000)
        .type('input#m_login_password', '\u000d')
        .wait(5000)
    }
  } catch (err) {
    console.log('Login screen error:', err)
    throw new Error('LoadingError')
  }
}

async function checkIfLoginNotice() {
  try {
    const notCorrectEmail = await driver.wait(3000).evaluate(() => {
      const result =
        document.body.innerHTML.search(
          /The email address that you've entered doesn't match any account./
        ) != -1
      return result
    })

    const notCorrectPassword = await driver.wait(3000).evaluate(() => {
      const result =
        document.body.innerHTML.search(
          /The password you entered is incorrect./
        ) != -1
      return result
    })

    if (notCorrectEmail || notCorrectPassword) {
      console.log('--> Is it LOGIN NOTICE screen? yes')

      await FbUser.update(
        {
          login
        },
        {
          login,
          cookies,
          password,
          date: new Date(),
          alert: true
        },
        {
          upsert: true,
          overwrite: true
        }
      )

      throw new Error(
        'Login notice detected fot this account. Process finished.'
      )
    } else {
      console.log('--> Is it LOGIN NOTICE screen? no')
    }
  } catch (err) {
    console.log('Login error: ' + err.message)
    throw new Error('IncorrectPassword')
  }
}

async function checkIfCheckPoint() {
  try {
    const url = await driver.url()
    const isCheckPoint = (await url.search(/checkpoint/)) != -1
    // const hasNextButton = await driver.exists(
    //   '#checkpointSubmitButton-actual-button[type="submit"]'
    // )

    if (!isCheckPoint) {
      console.log('--> Is it CHECK POINT screen? NO')
      return
    }

    // if (hasNextButton) {
    //   console.log('--> Is it CHECK POINT soft screen? YES')
    //   await driver
    //     .click('#checkpointSubmitButton-actual-button[type="submit"]')
    //     .wait(3000)
    // } else {
    console.log('--> Is it CHECK POINT hard screen? YES')

    await FbUser.update(
      {
        login
      },
      {
        login,
        cookies,
        password,
        date: new Date(),
        alert: true
      },
      {
        upsert: true,
        overwrite: true
      }
    )

    console.log('Checkpoint detected for this account. Process will exit.')
    throw new Error()
    // }
  } catch (err) {
    throw new Error('CheckPoint')
  }
}

async function checkIfSaveLoginOnDevice() {
  try {
    const url = await driver.url()
    const isSaveToDevice = (await url.search(/save-device/)) != -1

    if (!isSaveToDevice) {
      console.log('--> Is it SAVE LOGIN ON DEVICE screen: no')

      return
    }

    console.log('--> Is it SAVE LOGIN ON DEVICE screen: yes')

    await driver.click('button[type="submit"]').wait(3000)
  } catch (err) {
    throw new Error(
      'Error on SAVE LOGIN ON DEVICE screen' + err.message ? err.message : err
    )
  }
}

async function checkIfOldPassword() {
  try {
    const isOldPassword = await driver.wait(3000).evaluate(() => {
      const result =
        document.body.innerHTML.search(/You used an old password./) != -1
      return result
    })

    if (isOldPassword) {
      console.log('--> It is Old Password. Process finished.')

      throw new Error()
    }
  } catch (err) {
    // await modifyCorezoid('Login error')
    console.log('Old password error: ' + err.message)
    throw new Error('IncorrectPassword')
  }
}

async function checkIfDisabledAccount() {
  try {
    const isDisabledAccount = await driver.wait(3000).evaluate(() => {
      const result =
        document.body.innerHTML.search(/Your account has been disabled./) != -1
      return result
    })

    if (isDisabledAccount) {
      console.log('--> It is Disabled Account. Process finished.')

      throw new Error()
    } else {
      return
    }
  } catch (err) {
    console.error('Disabled account error: ' + err.message)
    throw new Error('IncorrectPassword')
  }
}

async function checkNextButtons() {
  try {
    const hasNextButtonPopup = await driver.exists('a#u_0_n')
    const hasNextButton = await driver.exists('a#nux-nav-button.touchable')

    if (hasNextButtonPopup) {
      console.log('--> Has it NEXT button? yes')
      await driver.click('a#u_0_n').wait(3000)
    } else if (hasNextButton) {
      console.log('--> Has it NEXT button? yes')
      await driver.click('a#nux-nav-button.touchable').wait(3000)
    } else {
      console.log('--> Has it NEXT button? no')
    }
  } catch (err) {
    throw new Error('Error checking NEXT buttons: ' + err.message)
  }
}

async function saveCookies() {
  console.log('--> Save cookies')

  try {
    cookies = await driver.cookies.get()

    const isUserExists =
      (await checkUserInDb({
        login
      })) != undefined

    console.log(`--> Is ${login} exists in DB?`, isUserExists)

    await FbUser.update(
      {
        login
      },
      {
        login,
        cookies,
        password,
        date: new Date()
      },
      {
        upsert: true,
        overwrite: true
      }
    )

    if (isUserExists) console.log(`--> User info updated`)
    else console.log(`--> New user created`)
  } catch (err) {
    throw new Error('Error saving cookies' + err.message)
  }
}

async function checkIfSearchBanned() {
  console.log('-> Check if Search banned')

  try {
    await driver
      .wait('#search_jewel a')
      .wait(1000)
      .click('#search_jewel a')
      .wait(3000)

    const isSearchBanned = (await findUserInfo(config.test.phone)) == false

    if (isSearchBanned) throw new Error('SearchBan')
  } catch (err) {
    throw new Error(err.message == 'SearchBan' ? 'SearchBan' : err.message)
  }
}

async function updateStatus() {
  console.log('-> Update process status: Working')

  try {
    await FbLog.update(
      {
        taskId: options.taskId
      },
      {
        date: new Date(),
        status: 'Working'
      },
      {
        new: true
      }
    )

    await modifyCorezoid({
      Status: 'Working'
    })
  } catch (err) {
    console.error('Update status error:', err)
    throw new Error(err.message)
  }
}

async function processPhones() {
  console.log('-> Process phones:')

  const filename = __dirname + '/' + config.phones
  const length = 30

  try {
    if (!fs.existsSync(filename)) throw new Error(`File ${filename} not found`)

    let stream = fs.createReadStream(filename, 'utf8')

    let counter = 0

    const chunkArray = []

    await _(stream)
      .split()
      .filter(x => x.length > 0)
      .batch(length)
      .each(list => chunkArray.push(list))
      .toPromise(Promise)

    for (const chunk of chunkArray)
      await processPhonesChunk(chunk, length, counter)
  } catch (err) {
    throw new Error('Error processing phones: ' + err.message)
  }
}

async function processPhonesChunk(phones, length, counter) {
  try {
    for (const phone of phones) {
      const timeToCheck = (length + 1) % ++counter == 0

      if (timeToCheck) {
        console.log("It's time to check if account banned")
        await checkIfSearchBanned()
      }

      await doFakeActivity()
      await findUserInfo(phone)
    }
  } catch (err) {
    throw new Error(
      err.message === 'SearchBanned'
        ? 'SearchBanned'
        : 'Process phones error:' + err
    )
  }
}

async function finish() {
  try {
    await modifyCorezoid('Finished')
    await driver.end()

    process.exit()
  } catch (err) {
    throw new Error('Error finishing process: ' + err)
    process.exit()
  }
}

//
// Low level functions
//
async function checkUserInDb(userData) {
  try {
    const result = await FbUser.findOne(userData).exec()
    return result
  } catch (err) {
    throw new Error('DB error: ' + err.message)
    // console.log('DB error:', err)
  }
}

async function getCookiesFromDb(userData) {
  try {
    const result = await FbUser.findOne(userData, {
      cookies: 1
    }).exec()
    return result ? result.cookies : null
  } catch (err) {
    throw new Error('DB error: ' + err.message)
    // console.log('DB error:', err)
  }
}

async function findUserInfo(phone) {
  phone = phone.startsWith('7') ? '+' + phone : '+7' + phone
  console.log('--> Find user by phone number', phone)

  try {
    await checkSlowDownDialog()

    await driver.wait('input#main-search-input')

    await driver
      .wait(3000)
      .insert('input#main-search-input')
      .wait(1000)

    const userFound = await driver
      .insert('input#main-search-input', phone)
      .type('input#main-search-input', '\u000d')
      .wait(30000 + 30000 * Math.random())
      .exists('#BrowseResultsContainer')

    if (!userFound) {
      console.log('--> User not found for phone:', phone)

      return false
    } else {
      console.log('--> User found')

      const userData = await driver.evaluate(() => ({
        name: document.querySelector('._uok').innerText,
        location: document.querySelector('._1tcc').innerText,
        origin: document.querySelector('._eu5').innerText,
        id: JSON.parse(
          document.querySelector('#root a').getAttribute('data-store')
        ).result_id
      }))

      userData.phone = phone
      userData.date = new Date()

      await FbUser.update(
        {
          phone: phone
        },
        userData,
        {
          upsert: true,
          overwrite: true
        }
      )

      console.log(`--> User info for phone: ${phone} updated`)
      return true
    }
  } catch (err) {
    if (err.message === 'SearchBan') throw new Error('SearchBan')

    throw new Error(
      err.message
        ? 'Find user error: ' + err.message
        : 'Find user error: ' + err
    )
    // console.log('Find user error:', err)
  }
}

async function checkSlowDownDialog() {
  console.log('--> Checking SLOW DOWN Dialog')

  try {
    const isConfirmDialod = await driver.exists(
      'input[name="fb_dtsg"]:not([type="hidden"])'
    )

    if (isConfirmDialod) throw new Error('SearchBan')
  } catch (err) {
    if (err.message === 'SearchBan') throw new Error('SearchBan')
    else throw new Error(err)
  }
}

async function doFakeActivity() {
  console.log('--> Doing fake activity')

  try {
    await driver
      .wait(1000)
      .goto('https://m.facebook.com')
      .wait(3000)
      .back()
      .wait('search_jewel a')
      .click('search_jevel a')
  } catch (err) {
    throw new Error(err)
  }
}

//
// Network interactions
//
async function sendToTelegram(msg) {
  console.log('--> Send message to telegram:', msg)
  // const url =
  //   'https://api.telegram.org/bot447003401:AAEVw54I3pmnLyw9BnonkwTz65rv9spwKfk/sendMessage'
  // const params = { text: msg, chat_id: '3070903' }
  // const headers = { accept: 'application/json', 'cache-control': 'no-cache' }
  // const response = request.get(url, { headers, params })
  // return
}

async function sendToCorezoid(data) {
  console.log('--> Send to Corezoid:', data)

  // try {
  //   await request.post(config.callbackUrl, { processStatus: data })
  // } catch (err) {
  //   throw new Error('Send to Corezoid error: ' + err.message)
  // }
}

async function modifyCorezoid(data) {
  const query = {
    ops: [
      {
        type: 'modify',
        obj: 'task',
        ref: options.ref,
        conv_id: options.id,
        data
      }
    ]
  }

  console.log('--> Modify Corezoid with data:', data)

  try {
    const response = await request({
      method: 'post',
      url: options.cburl,
      data: query,
      headers: {
        'Content-type': 'application/json',
        Accept: 'text/plain'
      }
    })

    return response
  } catch (err) {
    throw new Error('Modify Corezoid error: ' + err.message)
  }
}

async function BQExport(data) {
  console.log('BQExport with data:', data)

  // try {
  //   DateTime.local().setZone('Europe/Moscow')

  //   // tm = dp.parse(datetime.datetime.now(tz).isoformat())
  //   // data['DateAdd'] = tm.strftime('%s')
  //   data['DateAdd'] = DateTime()
  //     .local()
  //     .toISO()
  //     .replace(/\+03:00/g, '')
  //   querystring = data

  //   console.log(querystring)

  //   headers = { 'Content-type': 'application/json', Accept: 'text/plain' }
  //   response = await requests.post(
  //     'https://us-central1-newsbloggerstop.cloudfunctions.net/FBPROFILES',
  //     { verify: false, data: querystring, headers }
  //   )
  //   return response.data
  // } catch (err) {
  //   console.log('BQExport error:', err)
  //   return 0
  // }
}
