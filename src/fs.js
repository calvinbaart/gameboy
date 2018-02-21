if (process.env.APP_ENV === "browser") {
    module.exports = {
        writeSync: function (fd, line) {
            
        },
        openSync: function () {
            return 0;
        }
    };
} else {
    module.exports = require("fs");
}