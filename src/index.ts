import { Options as SWCOptions, transform } from "@swc/core";
import deepmerge from 'deepmerge';
import * as esbuild from 'esbuild';
import fs from 'fs/promises';
import { findNodeAddon } from "./patches/findNodeAddons.js";
import { parseTextStream, ReBuildCodeString } from "./reader/render.js";
import { addVars, addVarsData, findNodeModulesDir } from "./utils.js";
import { createRunFile } from "./createRunFile.js";
import path from "path";
import bytenode from 'bytenode';
import { codeWrapper } from "./codeWrapper.js";
import fsExtra from "fs-extra/esm";
import {v4 as uuid} from 'uuid';

export type BundleESMOptions = {
    entryPoint: string;
    outfile: string;
    define?: addVarsData;
    compress?: boolean;
    esbuildOptions?: esbuild.BuildOptions;
    swcOptions?: SWCOptions;
    alsoJSOutput?: boolean;
};

export type BundleESMState = BundleESMOptions & {
    nodeModules?: string | null;
    nodeAddons: Map<string, string>;
};

function nodeAddonReadPlugin(nodeAddons: Map<string, string>, nodePaths: string[] = []): esbuild.Plugin {
    return {
        name: 'node-file-plugin',
        setup(build) {
            build.onResolve({ filter: /.*/ }, async args => {
                if(path.isAbsolute(args.path) || args.path.startsWith('.')) {
                    return {};
                }

                for(const nodePath of nodePaths) {
                    const fullPath = path.join(nodePath, args.path);
                    if(await fsExtra.pathExists(fullPath)) {
                        return {};
                    }
                }

                return {
                    external: true
                }
            });
            build.onLoad({ filter: /.*/ }, async args => {
                if(!args.path.endsWith('.node') || !await fsExtra.pathExists(args.path)) {
                    return {};
                }

                const name = uuid() + path.basename(args.path);
                nodeAddons.set(name, args.path);

                return {
                    contents: `module.exports = "${name}";`,
                    loader: 'js'
                }
            });
        }
    };
};

async function esbuildCodeGenerationStep1({ entryPoint, outfile, define: addToDefine, compress, esbuildOptions, nodeModules, nodeAddons }: BundleESMState) {
    const { define, startCode } = addVars({
        "import.meta.dirname": "__dirname",
        "import.meta.filename": "__filename",
        "import.meta.url": {
            code: 'require("url").pathToFileURL(__filename).href'
        },
        "import.meta.resolve": {
            code: 'path => require("url").pathToFileURL(require.resolve(path)).href'
        },
        "import.meta.env": "process.env",
        ...addToDefine,
        BYTECODE_RUNTIME: "true",
        ESMBYTECODE: "true",
    });

    const fullESBuildOptions = deepmerge({
        entryPoints: [entryPoint],
        write: false,
        bundle: true,
        platform: "node",
        format: "esm",
        target: "esnext",
        legalComments: "none",
        define,
        minify: compress,
    }, esbuildOptions || {});

    if (nodeModules) {
        fullESBuildOptions.nodePaths = [...fullESBuildOptions?.nodePaths ?? [], nodeModules];
    }

    const bundleResult = await esbuild.build({
        ...fullESBuildOptions,
        plugins: [nodeAddonReadPlugin(nodeAddons, fullESBuildOptions.nodePaths), ...fullESBuildOptions.plugins ?? []],
    });

    if (bundleResult.errors.length) {
        throw new Error(bundleResult.errors.map(e => e.text).join("\n"));
    }

    const fileContent = bundleResult.outputFiles?.[0].text;
    const fullContent = startCode + fileContent;

    return fullContent;
}

async function swcCodeGenerationStep2(code: string, { swcOptions, compress }: BundleESMOptions) {
    const fullSWCOptions = deepmerge({
        module: {
            type: "commonjs",
            importInterop: "node"
        },
        minify: compress,
        jsc: {
            minify: {
                toplevel: compress,
                mangle: compress,
            }
        },
    } as SWCOptions, swcOptions || {});

    const cjsContent = await transform(code, fullSWCOptions);
    return cjsContent.code;

}

async function codePatchesStep3(code: string, state: BundleESMState) {
    const parseArray = parseTextStream(code);
    await findNodeAddon(parseArray, state);

    const patchesContainer = new ReBuildCodeString(parseArray);
    return patchesContainer.buildCode();
}

export async function ESMBytecodeBundle(options: BundleESMOptions) {
    await fsExtra.ensureDir(path.dirname(options.outfile));

    const nodeModules = await findNodeModulesDir(options);
    const state: BundleESMState = {
        ...options,
        nodeAddons: new Map(),
        nodeModules
    };
    const originalFile = state.outfile;
    const extensionSize = path.extname(state.outfile).length;
    const writeJS = originalFile.slice(0, -extensionSize) + ".cjs";
    state.outfile = originalFile.slice(0, -extensionSize) + ".jsc";

    const esbuildCode = await esbuildCodeGenerationStep1(state);
    const swcCode = await swcCodeGenerationStep2(esbuildCode, state);
    const patchedCode = await codePatchesStep3(swcCode, state);
    const finalCode = codeWrapper(patchedCode);

    await fs.writeFile(writeJS, finalCode);

    await bytenode.compileFile({
        filename: writeJS,
        compress: state.compress
    });

    if (!state.alsoJSOutput) {
        await fs.unlink(writeJS);
    }

    await createRunFile(state);
}