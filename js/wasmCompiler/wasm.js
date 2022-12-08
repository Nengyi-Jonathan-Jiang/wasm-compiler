/**
 * @param {string} code
 */
async function compileToModule(code){
    const wasm = new Emitter().convert({});
    return await WebAssembly.instantiate(wasm);
}
