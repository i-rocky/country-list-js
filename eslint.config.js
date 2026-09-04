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
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {...globals.browser, ...globals.node},
        },
    },
    {
        files: ['test/**/*.js'],
        languageOptions: {globals: {...globals.mocha}},
    },
    {
        files: ['**/*.mjs'],
        languageOptions: {sourceType: 'module', globals: {...globals.node}},
    },
    {
        // build outputs, not source
        ignores: ['dist/**', 'build/**', 'node_modules/**', 'index.js',
                  'index.d.ts', 'src/generated.ts'],
    },
];
