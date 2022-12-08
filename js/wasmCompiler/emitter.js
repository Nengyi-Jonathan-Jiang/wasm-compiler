class Emitter{
    static get magicModuleHeader(){ return [0x00, 0x61, 0x73, 0x6d]}
    static get moduleVersion(){ return [0x01, 0x00, 0x00, 0x00]}

    constructor(){

    }

    /**
     * @param ast
     * @returns {Uint8Array}
     */
    convert(ast){
        return Uint8Array.from([
            ...Emitter.magicModuleHeader,
            ...Emitter.moduleVersion
        ]);
    }
}
