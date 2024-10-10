import fs from "fs/promises";
import { glob } from "glob";
import path from "path";
import { BundleESMState } from "../index.js";
import { SplitText } from "../reader/render.js";



export async function findNodeAddon(parseArray: SplitText[], options: BundleESMState) {
    const nodeAddonToSearch: string[] = [];
    const result = new Map<string, string>();

    for (const item of parseArray) {
        if (item.is_skip && item.type_name === "" && item.text.slice(0, -1).endsWith(".node")) {
            const filePath = item.text.slice(1, -1);
            const newPath = path.basename(filePath);
            nodeAddonToSearch.push(newPath);

            item.text = item.text[0] + "./" + newPath + item.text.at(-1);
        }
    }

    const noeModulesDirectories = [options.nodeModules].concat(options.esbuildOptions?.nodePaths ?? []).filter(Boolean) as string[];

    for (const nodeModules of noeModulesDirectories) {
        const findAddons = await glob.glob(nodeAddonToSearch.map(i => `**/${i}`), {
            cwd: nodeModules
        });

        for (const [index, item] of nodeAddonToSearch.entries()) {
            result.set(item, path.join(nodeModules, findAddons[index]));
        }

        if(result.size === nodeAddonToSearch.length){
            break;
        }
    }

    const directoryToCopyTo = path.dirname(options.outfile);
    for(const [name, filePath] of result){
        const newFilePath = path.join(directoryToCopyTo, name);
        await fs.copyFile(filePath, newFilePath);
    }
}