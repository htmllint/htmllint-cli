#!/usr/bin/env node

var chalk = require('chalk'),
    cjson = require('cjson'),
    Liftoff = require('liftoff'),
    fs = require('fs'),
    glob = require('glob'),
    path = require('path'),
    Promise = require('bluebird');

var readFilePromise = Promise.promisify(fs.readFile),
    globPromise = Promise.promisify(glob);

var app = new Liftoff({
    processTitle: 'htmllint',
    moduleName: 'htmllint',
    configName: '.htmllint',
    extensions: {
        'rc': null
    }
});

var argv = require('yargs')
        .usage([
            'Lints html files with htmllint.',
            'Usage: $0 [OPTIONS] [ARGS]'
        ].join('\n'))
        .example('$0', 'lints all html files in the cwd and all child directories')
        .example('$0 init', 'creates a default .htmllintrc in the cwd')
        .example('$0 *.html', 'lints all html files in the cwd')
        .example('$0 public/*.html', 'lints all html files in the public directory')
        .default('rc', null)
        .describe('rc', 'path to a htmllintrc file to use (json)')
        .default('format', 'simple')
        .describe('format', 'output formatter (default: simple)')
        .default('cwd', null)
        .describe('cwd', 'path to use for the current working directory')
        .default('stdin-file-path', null)
        .describe('stdin-file-path', 'read html content from stdin and specify its file path')
        .argv;

var STDIN_FILENO = 0;
var args = argv._;

app.launch({
    cwd: argv.cwd,
    configPath: argv.rc
}, function (env) {
    var cwd = argv.cwd || process.cwd();

    var htmllintPath = 'htmllint';

    if (env.modulePath) {
        var cliPackage = require('../package.json'),
            semver = require('semver');

        var acceptedRange = cliPackage.dependencies.htmllint,
            localVersion = env.modulePackage.version;

        if (semver.satisfies(localVersion, acceptedRange)) {
            htmllintPath = env.modulePath;
        } else {
            console.log(
                chalk.red('local htmllint version is not supported:'),
                chalk.magenta(localVersion, '!=', acceptedRange)
            );
            console.log('using builtin version of htmllint');
        }
    }

    var htmllint = require(htmllintPath);
    var formatters = require('../lib/formatters');

    if (args[0] === 'init') {
        // copy .htmllintrc file
        var srcPath = path.join(__dirname, '../lib/default_cfg.json'),
            outputPath = path.join(env.cwd, '.htmllintrc');

        var opts = htmllint.Linter.getOptions('default'),
            config = JSON.stringify(opts, null, 4);
        config = '{\n    "plugins": [],  // npm modules to load\n'
               + config.slice(1);

        fs.writeFile(outputPath, config, function (err) {
            if (err) {
                console.error('error writing config file: ', err);
            }
        });
        return;
    }

    if (!env.configPath) {
        console.log(
            chalk.red('local .htmllintrc file not found'),
            '(you can create one using "htmllint init")'
        );
        process.exit(1);
    }

    var cfg = cjson.load(env.configPath);

    htmllint.use(cfg.plugins || []);
    delete cfg.plugins;

    if (argv.stdinFilePath) {
        args.unshift(STDIN_FILENO);
    }
    if (!args.length) {
        args = ['**/*.html'];
    }

    function lintFile(filename) {
        var p;
        if (filename === STDIN_FILENO) {
            filename = argv.stdinFilePath;
            p = new Promise(function (resolve, reject) {
                process.stdin.resume();
                process.stdin.setEncoding('utf8');

                var content = '';
                process.stdin.on('data', function (chunk) {
                    content += chunk;
                });
                process.stdin.on('end', function () {
                    resolve(content);
                });
                process.stdin.on('error', function (err) {
                    reject(err);
                });
            });
        } else {
            var filepath = path.resolve(cwd, filename);
            p = readFilePromise(filepath, 'utf8');
        }

        return p.then(function (src) {
                return htmllint(src, cfg);
            })
            .then(function (issues) {
                formatters.formatMessage.call(htmllint, argv.format, filename, issues);
                return { errorCount: issues.length };
            })
            .catch(function (err) {
                // MC: muahahahahah :D
                throw ('[htmllint error in ' + filename + ' ] ' + err);
            });
    }

    Promise.all(
        args.map(function (pattern) {
            if (pattern === STDIN_FILENO) {
                return STDIN_FILENO;
            }
            return globPromise(pattern, { cwd: cwd });
        })
    ).then(function (filesArr) {
        var files = Array.prototype.concat.apply([], filesArr);

        return Promise.settle(
            files.map(lintFile)
        );
    }, function (err) {
        console.error(chalk.red.bold('error during glob expansion:'), err);
    }).done(function (results) {
        var errorCount = 0;

        results.forEach(function (result) {
            if (result.isFulfilled()) {
                var resultValue = result.value();

                errorCount += resultValue.errorCount;
            } else {
                console.error(chalk.bold.red(result.reason()));
            }
        });

        formatters.done.call(htmllint, argv.format, errorCount, results.length);

        if (errorCount > 0) {
            process.exit(1);
        }
    });
});
