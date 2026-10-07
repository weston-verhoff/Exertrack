// Execute the same TypeScript compiler as the lazy-loaded sandbox, using our existing TS dependency.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const source = path.resolve(__dirname, '../src') + path.sep;
require.extensions['.ts'] = (module, filename) => {
  if (!filename.startsWith(source)) throw new Error('Theme loader only supports project source');
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  module._compile(output.outputText, filename);
};
