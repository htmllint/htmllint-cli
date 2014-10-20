#!/usr/bin/env node

var Liftoff = require('liftoff'),
    argv = require('minimist')(process.argv.slice(2)),
    fs = require('fs');

var app = new Liftoff({
    processTitle: 'htmllint',
    moduleName: 'htmllint',
    configName: 'htmllintrc'
});

app.launch({
    cwd: argv.cwd,
    configPath: argv.rc
}, function (env) {
    var htmllint = require(env.modulePath),
        rc = env.configPath ? require(env.configPath) : {},
        filesrc = fs.readFileSync(argv['_'][0]);

    var issues = htmllint(filesrc, rc);

    issues.forEach(printIssue);
});

function printIssue(issue) {
    console.log('(' + issue.line + ', ' + issue.column + '): ' + issue.msg);
}
