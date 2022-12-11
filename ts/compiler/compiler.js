/**
 * @param {string} code
 * @returns {Promise<WebAssembly.Instance>}
 */
function compile(code){
    const tkns = lexer.lex(code);
    const wasm = new Emitter().convert({});
    return WebAssembly.instantiate(wasm);
}
