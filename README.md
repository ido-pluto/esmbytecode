# Compile ESM into one bytecode

Compile the ESM project into one bytecode file (including your dependencies).

Useful when you want to hide your source code, or when you want to distribute your project as a few files.

- Compile
- Compression
- Bundle
- Support some .node addons (node-gyp-imports are not supported)
- TypeScript support

## Compile

```bash
sage: esmbytecode [options] <input> <output>

Compile and bundle your ESM project into a single file

Arguments:
  input          File to start the bundling process from
  output         Output file

Options:
  -c --compress  Compress the output file
  -V, --version  output the version number
  -h, --help     display help for command
```

## Important Notes
- It will work only with the specific node version it was compiled with (works with node.js only!).
- It will not work with node-gyp imports.
- It will not work with dynamic imports that are not statically analyzable.


### Compile your project with node API

```js
import { compileToJSC } from 'esmbytecode';

await compileToJSC({
    input: "./src/index.ts",
    output: "./dist/lib.jsc",
    compress: true
})
```

### Import compiled module in your project

```js
import { importJSC } from 'esmbytecode';
const { default: lib, something } = await importJSC("./lib.jsc");
```

### Credit
Credit to [bytenode](https://www.npmjs.com/package/bytenode) for the idea and the implementation of the bytecode usage.