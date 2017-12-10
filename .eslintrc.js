module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "parserOptions": {
        "ecmaVersion": 8,
        "sourceType": "module"
    },
    "extends": "eslint:recommended",
    "rules": {
        "no-console": 0,
        "indent": [
            "error",
            4,
            { SwitchCase: 1 }
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
};
