function flatten<T>(arr: T[][]) : T[] { return [].concat(...arr) }

/**
 * @description converts an AST outputted by the parser into something idk
 */
class Emitter{
    static get magicModuleHeader(){ return [0x00, 0x61, 0x73, 0x6d]}
    static get moduleVersion(){ return [0x01, 0x00, 0x00, 0x00]}

    private readonly code : number[] = [];

    private constructor(){}

    public static process(ast: AST){
        const e = new Emitter();
        e.consume(ast);
        return e.result;
    }

    private consume(ast: AST){
        switch(ast.description.name){
            case "declarations":
                this.consume(ast.children[0]);
                this.consume(ast.children[1]);
                break;
            case "method-declaration":
                const methodName = ast.children[2];
                const methodParams = ast.children[3];
                const methodBody = ast.children[4];
                if(methodName.token.value === "main")
                    this.consume(methodBody);


                break;

            case "block-statement":

        }
    }

    private encodeVec(data: number[][]){
        return [...Encoder.unsignedLEB128(data.length), ...flatten(data)];
    }

    private encodeLocal(count: number, type: number){

    }

    public get result(){
        return Uint8Array.from([
            ...Emitter.magicModuleHeader,
            ...Emitter.moduleVersion,
            ...this.code,
        ]);
    }
}





const OPCODES = Object.freeze({
    block: 0x02,
    loop: 0x03,
    br: 0x0c,
    br_if: 0x0d,
    end: 0x0b,
    call: 0x10,
    get_local: 0x20,
    set_local: 0x21,
    i32_store_8: 0x3a,
    i32_const: 0x41,
    f32_const: 0x43,
    i32_eqz: 0x45,
    i32_eq: 0x46,
    f32_eq: 0x5b,
    f32_lt: 0x5d,
    f32_gt: 0x5e,
    i32_and: 0x71,
    f32_add: 0x92,
    f32_sub: 0x93,
    f32_mul: 0x94,
    f32_div: 0x95,
    i32_trunc_f32_s: 0xa8
});

const Section = Object.freeze({
    custom : 0,
    type : 1,
    Import : 2,
    func : 3,
    table : 4,
    memory : 5,
    global : 6,
    Export : 7,
    start : 8,
    element : 9,
    code : 10,
    data : 11
});
const Valtype = Object.freeze({ i32 : 0x7f, f32 : 0x7d });
const Blocktype = Object.freeze({ void : 0x40 });

const binaryOpcode = {
    "+": OPCODES.f32_add,
    "-": OPCODES.f32_sub,
    "*": OPCODES.f32_mul,
    "/": OPCODES.f32_div,
    "==": OPCODES.f32_eq,
    ">": OPCODES.f32_gt,
    "<": OPCODES.f32_lt,
    "&&": OPCODES.i32_and
};

enum ExportType  {
    func = 0x00,
    table = 0x01,
    mem = 0x02,
    global = 0x03
}