export function codeWrapper(code: string): string {
    return `module.exports = (async()=>{var module={exports:{}},exports=module.exports;${code};return module;})();`;
}