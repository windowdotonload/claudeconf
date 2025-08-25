import { defineConfig } from 'rolldown';

export default defineConfig({
  input: 'bin/claudeconf.js',
  output: {
    file: 'lib/index.js',
    format: "umd",
    banner: '#!/usr/bin/env node'
  },
});
