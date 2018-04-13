
var chalk = require('chalk');

exports.formatMessage = function (filename, issues) {
    var that = this;
    issues.forEach(function (issue) {
        var msg = [
            chalk.magenta(filename), ': ',
            'line ', issue.line, ', ',
            'col ', issue.column, ', ',
            chalk.red(that.messages.renderIssue(issue))
        ].join('');

        console.log(msg);
    });
};

exports.done = function (errorCount, fileCount) {
    console.log('');
    console.log(chalk.yellow('[htmllint] found %d errors out of %d files'),
        errorCount, fileCount);
};
