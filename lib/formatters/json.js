
var results = [];

exports.formatMessage = function (filename, issues) {
    var that = this;
    var result = {
        filePath: filename,
        messages: issues,
    };
    results.push(result);
};

exports.done = function (errorCount, fileCount) {
    console.log(JSON.stringify(results));
};
