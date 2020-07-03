#!/usr/bin/env node

process.argv.push("--gulpfile");
process.argv.push(require.resolve("..")); // 指定gulpfile
process.argv.push("--cwd");
process.argv.push(process.cwd()); // 指定当前目录，如果不指定的话，执行构建的时候就会切换到gulpfile所在的目录

require("gulp/bin/gulp");
