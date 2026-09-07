import { defineConfig } from 'orval';

export default defineConfig({
  manhaj: {
    output: {
      target: './src/index.ts',
      schemas: './src/model',
      mode: 'tags-split',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: './src/mutator.ts',
          name: 'customAxios',
        },
      },
    },
    input: '../api-spec/openapi.json',
    hooks: {
      afterIndexFile: (file) => {
        file.addDefaultExport('api');
      },
    },
  },
});
