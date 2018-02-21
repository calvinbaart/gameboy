if (process.env.APP_ENV === "browser") {
    module.exports = document;
} else {
    module.exports = require("./browser_stub").document;
}