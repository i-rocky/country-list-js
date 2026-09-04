'use strict';

// Flat config.  @eslint/js and globals are direct devDependencies: ESLint 10
// stopped hoisting them, and relying on that was a phantom dependency.

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
