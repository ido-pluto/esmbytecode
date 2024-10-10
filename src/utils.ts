import fsExtra from 'fs-extra/esm';
import path from 'path';
import {v4 as uuid} from 'uuid';
import { BundleESMOptions } from './index.js';

function sanitizeVariableName(input: string): string {
    return '_' + input.replace(/[^a-zA-Z0-9_$]/g, '_');
  }

export type addVarsData = {[name: string]: {code: string} | string};

export function addVars(data: addVarsData) {
    const define: {[name: string]: string} = {};
    let startCode = "";

    for(const [name, code] of Object.entries(data)) {
        if(typeof code === "object") {
            const varName = sanitizeVariableName(name) + uuid().replaceAll("-", "");
            startCode += `var ${varName} = ${code.code};\n`;
            define[name] = varName;
        } else {
            define[name] = code;
        }
    }

    return {
        define,
        startCode
    }
}

const NODE_MODULES = "node_modules";
export async function findNodeModulesDir(options: BundleESMOptions): Promise<string | null> {
    let startLocation = path.dirname(options.entryPoint);

    while(startLocation.length > 1){
        const nodeModulesPath = path.join(startLocation, NODE_MODULES);
        if(await fsExtra.pathExists(nodeModulesPath)){
            return nodeModulesPath;
        }

        const originalLocation = startLocation;
        startLocation = path.dirname(startLocation);

        if(startLocation === originalLocation){
            break;
        }
    }
    
    return null;
}