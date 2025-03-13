const { src, dest, series, parallel, watch, lastRun } = require('gulp');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const cssmin = require('gulp-minify-css');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const cleanCSS = require('gulp-clean-css');
//const del = require('del');
const fs = require('fs');
const https = require('https');
const sass = require('gulp-sass')(require('sass'));
sass.compiler = require('node-sass');
const fileinclude = require('gulp-file-include');
const server = require('browser-sync').create();

const jqueryCDN = 'https://code.jquery.com/jquery-3.6.4.min.js';
const jqueryPath = 'src/assets/js/jquery.min.js';

var paths = {
    css: {
        src: [
            'src/assets/sass/*.sass',
        ],
        dest: 'build/assets/css/'
    },
    js: {
        src: 'src/assets/js/*.js',
        dest: 'build/assets/js/'
    },
    images: {
        src: 'src/assets/images/**/*.{jpg,jpeg,png,gif}',
        dest: 'build/assets/images/'
    },
    svg: {
        src: 'src/assets/svg/**/*.svg',
        dest: 'build/assets/svg/'
    },
    fonts: {
        src: [
            'src/assets/webfonts/**/*.{woof,WOOF,woff2,WOFF2,ttf,TTF,otf,OTF,eot,EOT}',
        ],
        dest: 'build/assets/webfonts/'
    },
    html: {
        src: [
            'src/*.html',
        ],
        dest: 'build/'
    }
};

// Download jQuery if not exists
function checkAndDownloadJQuery(cb) {
    if (!fs.existsSync(jqueryPath)) {
        console.log('Downloading jQuery...');
        const file = fs.createWriteStream(jqueryPath);
        https.get(jqueryCDN, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('jQuery downloaded.');
                cb();
            });
        }).on('error', (err) => {
            console.error(`Error downloading jQuery: ${err.message}`);
            cb(err);
        });
    } else {
        cb();
    }
}

/* Not all tasks need to use streams, a gulpfile is just another node program
 * and you can use all packages available on npm, but it must return either a
 * Promise, a Stream or take a callback and call it
 */
function clean() {
    // You can use multiple globbing patterns as you would with `gulp.src`,
    // for example if you are using del 2.0 or above, return its promise
    //return del(['build/assets']);
}

// Reload Server
async function reload() {
    server.reload();
}

/*
 * Define our tasks using plain functions
 */
function styles() {
    return src(paths.css.src)
        .pipe(sass().on('error', sass.logError))
        .pipe(cleanCSS())
        .pipe(cssmin())
        // pass in options to the stream
        .pipe(rename({
            basename: 'main',
            suffix: '.min'
        }))
        .pipe(dest(paths.css.dest));
}

function fonts() {
    return src(paths.fonts.src)
        .pipe(dest(paths.fonts.dest));
}

function scripts() {
    return src(paths.js.src, { sourcemaps: true })
        .pipe(babel())
        .pipe(uglify())
        .pipe(concat('main.min.js'))
        .pipe(dest(paths.js.dest));
}

async function images() {
    return src(paths.images.src, { since: lastRun(images), encoding: false })
        .pipe(dest(paths.images.dest));
}

function svg() {
    return src(paths.svg.src, { since: lastRun(svg), encoding: false })
        .pipe(dest(paths.svg.dest));
}

async function includeHTML() {
    return src(paths.html.src)
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(dest(paths.html.dest));
}

function watchTasks() {
    watch(paths.css.src, series(parallel(styles, reload)));
    watch(paths.js.src, series(parallel(scripts, reload)));
    watch(paths.fonts.src, series(parallel(fonts, reload)));
    watch(paths.images.src, series(parallel(images, reload)));
    watch(paths.svg.src, series(parallel(svg, reload)));
    watch("src/**/*.html", series(buildAndReload));
}

// Build files html and reload server
async function buildAndReload() {
    await styles();
    await scripts();
    await fonts();
    await images();
    await svg();
    await includeHTML();
    reload();
}

/*
 * Specify if tasks run in series or parallel using `series` and `parallel`
 */
function build() {
    server.init({
        server: { baseDir: 'build/' },
        open: false  // ✅ Prevents BrowserSync from trying to open a browser 
    });

    // Build and reload at the first time
    buildAndReload();

    watchTasks();

    //series(clean, parallel(styles, scripts, images, svg, buildAndReload));
}

/*
 * You can use CommonJS `exports` module notation to declare tasks
 */
exports.clean = clean;
exports.styles = styles;
exports.scripts = scripts;
exports.fonts = fonts;
exports.checkAndDownloadJQuery = checkAndDownloadJQuery;
exports.watchTasks = watchTasks;
exports.build = build;
exports.includeHTML = includeHTML;
exports.buildAndReload = buildAndReload;
/*
 * Define default task that can be called by just running `gulp` from cli
 */
exports.default = series(checkAndDownloadJQuery, build);