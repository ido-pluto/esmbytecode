#!/usr/bin/env node
import { Command } from "commander";
import { compileToJSC } from "./index.js";
import { fileURLToPath } from "url";
import fsExtra from "fs-extra/esm";
import path from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const packageJson = await fsExtra.readJSON(path.join(__dirname, "..", "package.json"));

const CompileCommand = new Command();
CompileCommand
    .description("Compile and bundle your ESM project into a single file")
    .argument("input", "File to start the bundling process from")
    .argument("output", "Output file")
    .option("-c --compress", "Compress the output file")
    .action(async (input: string, output: string, { compress }: { compress: boolean; }) => {
        input = path.resolve(input);
        output = path.resolve(output);

        await compileToJSC({
            entryPoint: input,
            outfile: output,
            createRunFile: false,
            compress
        });
        console.log("Done!");
    })
    .version(packageJson.version);
CompileCommand.parse();
