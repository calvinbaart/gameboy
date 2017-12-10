/* eslint-disable no-var, strict, prefer-arrow-callback */
'use strict';

var path = require('path');


var babelOptions = {
    "presets": [
        [
            "es2015",
            {
                "modules": false
            }
        ],
        "es2016",
        "es2017"
    ]
};

module.exports = {
    cache: true,
    entry: {
        main: './src/main.ts',
        vendor: [
            'babel-polyfill'
        ]
    },
    output: {
        path: path.resolve(__dirname, './dist/scripts'),
        filename: '[name].js',
        chunkFilename: '[chunkhash].js'
    },
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [
                {
                    loader: 'babel-loader',
                    options: babelOptions
                },
                {
                    loader: 'ts-loader'
                }
            ]
        }, {
            test: /\.js$/,
            exclude: /node_modules/,
            use: [
                {
                    loader: 'babel-loader',
                    options: babelOptions
                }
            ]
        }]
    },
    plugins: [
    ],
    resolve: {
        extensions: ['.ts', '.js']
    },
};