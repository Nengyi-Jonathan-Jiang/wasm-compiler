class ParseRule{
    /** @param {TokenType} lhs @param {SymbolString} rhs */
    constructor(lhs, rhs){
        this.lhs = lhs;
        this.rhs = rhs;
    }

    get size(){ return this.size }
    get empty(){ return this.size == 0 }

    toString(){ return `${lhs} := ${rhs}` }
}

class SSet{
    constructor(){
        this.set = Object.create(null);
    }

    add(value){
        this.set[value] = value;
    }

    has(value){
        return value.toString() in this.set;
    }
}

class Grammer{
    /** @param {ParseRule[]} rules @param {TokenType} startSymbol */
    constructor(...rules, startSymbol){
        this.rules = rules;

        /** @type {Set<SymbolString>} */
        this.allSymbols = new Set();
    }
}