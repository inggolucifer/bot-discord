const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/unit/**/*.{test,spec}.{js,mjs,ts}']
    }
});
