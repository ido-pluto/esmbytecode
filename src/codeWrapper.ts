export function codeWrapper(code: string): string {
    return `(async()=>{${code}})();`;
}