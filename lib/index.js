const { src, dest, parallel, series, watch } = require("gulp");

const del = require("del");

const loadPlugins = require("gulp-load-plugins");
const plugins = loadPlugins();

const browserSync = require("browser-sync");
const bs = browserSync.create(); // 创建一个开发服务器

const cwd = process.cwd();
let config = {
  // 默认路径配置
  build: {
    src: "src",
    dist: "dist",
    temp: "temp",
    public: "public",
    paths: {
      styles: "assets/styles/*.scss",
      scripts: "assets/scripts/*.js",
      pages: "*.html",
      images: "assets/images/**",
      fonts: "assets/fonts/**",
    },
  },
};

try {
  const loadConfig = require(`${cwd}/pages.config.js`);
  config = Object.assign({}, config, loadConfig);
} catch (e) {}

const clean = () => {
  return del([config.build.dist, config.build.temp]);
};

const style = () => {
  return src(config.build.paths.styles, {
    base: config.build.src,
    cwd: config.build.src,
  }) // 使用base选项保留原始目录结构，使用cwd选项相当于做路径拼接
    .pipe(plugins.sass({ outputStyle: "expanded " })) // 输出样式使用expended能保留原始换行和缩进
    .pipe(dest(config.build.temp));
};

const script = () => {
  return src(config.build.paths.scripts, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.babel({ presets: [require("@babel/preset-env")] }))
    .pipe(dest(config.build.temp));
};

const page = () => {
  return src(config.build.paths.pages, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.swig({ data: config.data, cache: false })) // cache: false 关闭 swig 缓存机制
    .pipe(dest(config.build.temp));
};

const image = () => {
  return src(config.build.paths.images, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const font = () => {
  return src(config.build.paths.fonts, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const extra = () => {
  return src("**", {
    base: config.build.public,
    cwd: config.build.public,
  }).pipe(dest(config.build.dist));
};

const serve = () => {
  watch(config.build.paths.styles, { cwd: config.build.src }, style);
  watch(config.build.paths.scripts, { cwd: config.build.src }, script);
  watch(config.build.paths.pages, { cwd: config.build.src }, page);
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)
  watch(
    [config.build.paths.images, config.build.paths.fonts],
    { cwd: config.build.src },
    bs.reload
  ); // 一旦监听到静态资源变化直接执行服务器重载
  watch("**", { cwd: config.build.public }, bs.reload);

  bs.init({
    files: config.build.temp + "/**",
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public], // 一个请求过来会挨个从数组中指定的位置进行资源查找
      routes: {
        "/node_modules": "node_modules",
      },
    },
  });
};

const useref = () => {
  return src(config.build.paths.pages, {
    base: config.build.temp,
    cwd: config.build.temp,
  }) // 读取编译后的html文件
    .pipe(plugins.useref({ searchPath: [config.build.temp, "."] })) // 根据searchPath里配置的根路径查找html里引用的资源，将查找到的资源内容写入到构建注释指明的文件中，替换html里资源的引用位置
    .pipe(plugins.if(/\.js$/, plugins.uglify())) // 压缩js
    .pipe(plugins.if(/\.css$/, plugins.cleanCss())) // 压缩css
    .pipe(
      plugins.if(
        /\.html$/,
        plugins.htmlmin({
          // 压缩html
          collapseWhiteSpace: true, // 删除空白符
          minifyCSS: true, // 压缩内联CSS
          minifyJS: true, // 压缩内联JS
        })
      )
    )
    .pipe(dest(config.build.dist)); // 把修改后的html和构建注释里指明的文件写到dist目录下
};

// 编译
const compile = parallel(style, script, page);

// 构建
const build = series(
  clean,
  parallel(series(compile, useref), image, font, extra)
);

// 开发
const develop = series(compile, serve);

module.exports = {
  clean,
  build,
  develop,
};
