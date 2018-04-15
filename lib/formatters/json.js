
var results = [];

exports.formatMessage = function (filename, issues) {
    var that = this;
    var result = {
        filePath: filename,
        messages: issues.map(function (issue) {
            return Object.assign({}, issue, {
                message: that.messages.renderIssue(issue),
            });
        }),
    };
    results.push(result);
};

exports.done = function (errorCount, fileCount) {
    console.log(JSON.stringify(results));
};
