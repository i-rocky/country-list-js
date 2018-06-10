let gulp        = require('gulp');
let babel       = require('babelify');
let watch       = require('gulp-watch');
let rename      = require('gulp-rename');
let uglify      = require('gulp-uglify');
let notify      = require("gulp-notify");
let browserify  = require('gulp-browserify');
let sourcemaps  = require('gulp-sourcemaps');

gulp.task('compile', function() {
    return gulp.src('./src/index.js')
        .pipe(sourcemaps.init())
        .pipe(browserify({ insertGlobals: true}))
        .pipe(uglify())
        .pipe(rename('country.min.js'))
        .pipe(sourcemaps.write())
        .pipe(notify("Build complete"))
        .pipe(gulp.dest('./dist'));
});

gulp.task('watch', function() {
    gulp.watch('src/**/*.js', ['compile']);
});

gulp.task('default', ['watch', 'compile']);