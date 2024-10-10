# Compile ESM into one bytecode

Compile the ESM project into one bytecode file (including your dependencies).

- Compile
- Compression
- Bundle

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