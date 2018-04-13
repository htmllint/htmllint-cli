
var formatters = {
    simple: require('./simple'),
    json: require('./json'),
};

exports.formatMessage = function (formatter, filename, issues) {
    if (!(formatter in formatters)) {
        throw ('[htmllint] formatter \'' + formatter + '\' not found');
    }
    formatters[formatter].formatMessage.call(this, filename, issues);
};

exports.done = function (formatter, errorCount, fileCount) {
    formatters[formatter].done.call(this, errorCount, fileCount);
};
