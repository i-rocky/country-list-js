'use strict';

// Flat config.  ESLint 9 no longer reads .eslintrc.json, so `npm test` had
// been failing before it ever reached mocha.

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2018,
            sourceType: 'commonjs',
            globals: {...globals.browser, ...globals.node},
        },
    },
    {
        files: ['t/**/*.js'],
        languageOptions: {globals: {...globals.mocha}},
    },
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
];
