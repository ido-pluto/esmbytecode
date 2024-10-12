import fs from "fs/promises";
import { glob } from "glob";
import path from "path";
import { BundleESMState } from "../index.js";
import { SplitText } from "../reader/render.js";

export async function findNodeAddon(parseArray: SplitText[], options: BundleESMState) {
    const nodeAddonToSearch: string[] = [];
    const result = new Map<string, string>();

    for (let i = 0; i < parseArray.length; i++) {
        const item = parseArray[i];
        const textWithoutQuotes = item.text.slice(1, -1);

        if (item.is_skip && item.type_name === "" && textWithoutQuotes.endsWith(".node")) {
            const isRequired = parseArray[i - 1];

            if (!isRequired.is_skip && isRequired.text.match(/\s[A-z0-9_]+\s*\(\s*$/)) {
                const newPath = path.basename(textWithoutQuotes);
                nodeAddonToSearch.push(newPath);

                item.text = item.text[0] + "./" + newPath + item.text.at(-1);
            } else if (options.nodeAddons.has(textWithoutQuotes)) {
                const filePath = options.nodeAddons.get(textWithoutQuotes)!;

                const name = path.basename(filePath);
                item.text = `require("./${name}")`;
                result.set(name, filePath);
            }
        }
    }

    const noeModulesDirectories = [options.nodeModules].concat(options.esbuildOptions?.nodePaths ?? []).filter(Boolean) as string[];

    for (const nodeModules of noeModulesDirectories) {
        const findAddons = await glob.glob(nodeAddonToSearch.map(i => `**/${i}`), {
            cwd: nodeModules
        });

        for (const item of nodeAddonToSearch.values()) {
            const findModule = findAddons.find(addonAbs => path.basename(addonAbs) === item);
            if (findModule) {
                result.set(item, path.join(nodeModules, findModule));
            }
        }

        if (result.size === nodeAddonToSearch.length) {
            break;
        }
    }

    const directoryToCopyTo = path.dirname(options.outfile);
    for (const [name, filePath] of result) {
        const newFilePath = path.join(directoryToCopyTo, name);
        await fs.copyFile(filePath, newFilePath);
    }
}