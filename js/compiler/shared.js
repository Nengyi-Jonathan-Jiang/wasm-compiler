class TokenType{
    /** @param {String} name @param {RegExp} pattern */
    constructor(name, pattern) {
        this.name = name;
        this.pattern = pattern;
    }

    toString(){
        return this.name;
    }

    static START = new TokenType("__START__", /^(?!x)x$/);
    static END = new TokenType("__END__", /^(?!x)x$/);
}

class Token{
    /** @param {TokenType} symbol @param {String} value */
    constructor(symbol, value){
        this.symbol = symbol;
        this.value = value;
    }

    toString(){
        return `${this.symbol}<${this.value}>`
    }
}

class SymbolString{
    /** @param {...TokenType} symbols */
    constructor(...symbols){
        this.symbols = symbols;
        this.repr = symbols.map(i => i.toString()).join(" ");

        return new Proxy(this, {
            get: (_, key) =>  key in this ? this[key] : this.get(+key)
        });
    }

    get length(){return this.symbols.length}

    toString(){return this.repr}

    /** @param {number} i */
    get(i){
        if(i < 0) i += this.length;
        return this.symbols[i];
    }

    get [Symbol.iterator](){
        return this.symbols[Symbol.iterator];
    }

    /** @param {number} start */
    substr(start, end = -1){
        return new SymbolString(...this.symbols.slice(start, end));
    }

    /** @param {TokenType} symbol */
    concatSymbol(symbol){
        return new SymbolString(...this, symbol);
    }

    /** @param {SymbolString} symbols */
    concatSymbol(symbols){
        return new SymbolString(...this, ...symbols);
    }
}
