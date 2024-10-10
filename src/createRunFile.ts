import path from "path";
import { BundleESMState } from "./index.js";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import {minify} from "@swc/core";

export async function createRunFile(state: BundleESMState) {
    const mainFile = fileURLToPath(import.meta.resolve("bytenode"));
    let byteNodeContent = await fs.readFile(mainFile, "utf-8");

    if(state.compress){
        byteNodeContent = (await minify(byteNodeContent, {mangle: true, toplevel: true})).code;
    }

    byteNodeContent += `require("./${path.basename(state.outfile)}");`;
    const filePath = path.join(path.dirname(state.outfile), "run.cjs");
    await fs.writeFile(filePath, byteNodeContent);
}