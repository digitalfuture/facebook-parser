module.exports = {
  apps: [
    {
      name: 'parser',
      script: './parser.js',
      watch: true,
      ignore_watch: ['node_modules', 'www'],
      watch_options: {
        followSymlinks: false
      },
      treekill: true
    }
  ]
}
