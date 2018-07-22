# Social networks parser

**Backend:** MongoDB + Express + Nightmare

**Frontend:** Vue + Vuetify

Wab access to Logs and Users collections: [http://localhost:35001](http://localhost)

Web server help: [http://localhost:35001/help](http://localhost:35001/help)

## Installation

Be sure to have [MongoDB](https://docs.mongodb.com/manual/installation/) installed.

Then:

```shell
npm i
```

Edit `config.json` file to setup your environment.

## Start server

```shell
npm start
```

Or, do it with PM2 (recommended).
Install it if not yet:

```shell
npm install pm2
```

then:

```shell
pm2 start ecosystem.config.js
```
