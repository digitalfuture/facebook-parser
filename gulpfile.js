const gulp = require('gulp')
const browserify = require('browserify')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const uglify = require('gulp-uglify')
const sourcemaps = require('gulp-sourcemaps')
const log = require('gulplog')
const babelify = require('babelify')
const vueify = require('vueify')

gulp.task('js', () => {
  const b = browserify({
    entries: './src/index.js',
    debug: true,
    transform: ['babelify', 'vueify']
  })

  return b
    .bundle()
    .pipe(source('index.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(uglify())
    .on('error', log.error)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./www'))
})

gulp.task('build', gulp.series('js'))
gulp.task('default', gulp.series('build'))
