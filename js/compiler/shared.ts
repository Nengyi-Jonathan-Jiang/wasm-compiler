class TokenType{
    public name: string;
    public pattern: RegExp;
    constructor(name, pattern) {
        this.name = name;
        this.pattern = pattern;
    }

    toString(){
        return this.name;
    }

    static START = new TokenType("__START__", /^(?!x)x$/);
    static END = new TokenType("__END__", /^(?!x)x$/);
    static EPSILON = new TokenType("ε", /^(?!x)x$/);
}

class Token{
    public symbol: TokenType;
    public value: string;

    constructor(symbol, value){
        this.symbol = symbol;
        this.value = value;
    }

    toString(){
        return `${this.symbol}<${this.value}>`
    }
}

class SymbolString extends Array {
    public symbols: TokenType[];
    private readonly repr: string;
    constructor(...symbols:TokenType[]){
        super();

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

    substr(start = 0, end = -1){
        return new SymbolString(...this.symbols.slice(start, end + (end < 0 ? this.length + 1 : 0)));
    }

    concatSymbol(symbol){
        return new SymbolString(...this, symbol);
    }

    /** @param {SymbolString} symbols */
    concatSymbols(symbols){
        return new SymbolString(...this, ...symbols);
    }
}
