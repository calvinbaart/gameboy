/* eslint-disable no-var, strict, prefer-arrow-callback */
"use strict";

var path = require("path");
const webpack = require("webpack");

var babelOptions = {
    "presets": [
        [
            "env",
            {
                "targets": {
                    "browsers": ["last 2 versions"]
                }
            }
        ]
    ]
};

module.exports = {
    cache: true,
    entry: {
        main: "./src/main.ts"
    },
    output: {
        path: path.resolve(__dirname, "./dist/scripts"),
        filename: "[name].js",
        chunkFilename: "[chunkhash].js"
    },
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [
                {
                    loader: "babel-loader",
                    options: babelOptions
                },
                {
                    loader: "ts-loader"
                }
            ]
        }, {
            test: /\.js$/,
            exclude: /node_modules/,
            use: [
                {
                    loader: "babel-loader",
                    options: babelOptions
                }
            ]
        }]
    },
    plugins: [
        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: JSON.stringify("production"),
                APP_ENV: JSON.stringify("browser")
            }
        })
    ],
    resolve: {
        extensions: [".ts", ".js"]
    },
};