/**
 * @param {string} code
 * @returns {Promise<WebAssembly.Instance>}
 */
function compile(code){
    const wasm = new Emitter().convert({});
    return WebAssembly.instantiate(wasm);
}
