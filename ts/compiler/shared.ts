class TokenType {
    public readonly name: string;
    public readonly pattern: RegExp;

    constructor(name: string, pattern: RegExp) {
        this.name = name;
        this.pattern = pattern;
    }

    public toString() {
        return this.name;
    }

    public static readonly START = new TokenType("__START__", /^(?!x)x$/);
    public static readonly END = new TokenType("__END__", /^(?!x)x$/);
    public static readonly EPSILON = new TokenType("ε", /^(?!x)x$/);
}

class Token {
    public readonly symbol: TokenType;
    public readonly value: string;
    public readonly start: number;
    public readonly end: number;

    constructor(symbol: TokenType, value: string, start: number, end: number) {
        this.symbol = symbol;
        this.value = value;
        this.start = start;
        this.end = end;
    }

    public toString() {
        return `${this.symbol}<${this.value}>`
    }
}

class SymbolString {
    public readonly symbols: TokenType[];
    private readonly str: string;

    constructor(...symbols: TokenType[]) {
        this.symbols = symbols;
        this.str = symbols.map(i => i.toString()).join(" ");
    }

    public get length() {
        return this.symbols.length;
    }

    public toString() {
        return this.str
    }

    public get(i: number) {
        if (i < 0) i += this.length;
        return this.symbols[i];
    }

    public get [Symbol.iterator]() {
        return this.symbols[Symbol.iterator];
    }

    public substr(start = 0, end = -1) {
        return new SymbolString(...this.symbols.slice(start, end + (end < 0 ? this.length + 1 : 0)));
    }

    public concatSymbol(symbol: TokenType) {
        return new SymbolString(...this, symbol);
    }

    public concatSymbols(symbols: SymbolString) {
        return new SymbolString(...this, ...symbols);
    }
}



class SSet<T> {
    private readonly map: SMap<T, T>;

    /** @param {...T} values */
    constructor(...values: T[]) {
        this.map = new SMap<T, T>();
        this.addAll(...values);
    }

    public add(value: T) {
        let res = this.map.has(value);
        this.map.add(value, value);
        return res;
    }

    public addAll(...values: T[]) {
        return values.map(value => this.add(value)).some(i => i);
    }

    public has(value: T) {
        return this.map.has(value);
    }

    public get [Symbol.iterator]() : Iterator<T> {
        return Object.keys(this.map.obj).map(i => this.map.obj[i])[Symbol.iterator]();
    }

    public get size(){
        return this.map.size;
    }
}

class SMap<T, U> {
    public readonly obj: any;

    constructor() {
        this.obj = Object.create(null);
    }

    public add(key: T, value: U) {
        this.obj["_" + value] = value;
    }

    public has(key: T) {
        return ("_" + key) in this.obj;
    }

    public get(key: T) {
        return this.obj["_" + key];
    }

    public get [Symbol.iterator]() : Iterator<[string, U]> {
        return Object.keys(this.obj).map(i => [i, this.obj["_" + i]] as [string, U])[Symbol.iterator]();
    }

    public get size(){
        return Object.keys(this.obj).length;
    }
}