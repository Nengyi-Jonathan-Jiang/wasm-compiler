class _map<T, U> {
    readonly map = new Map<string, U>;

    public add(key: T, value: U) {
        let res = !this.has(key);
        this.map.set(key.toString(), value);
        return res;
    }

    public has(key: T) {
        return this.map.has(key.toString());
    }

    public get(key: T): U {
        return this.map.get(key.toString());
    }

    public get size() {
        return this.map.size
    }

    public [Symbol.iterator](){
        return this.map.values();
    }
}

class SSet<T> {
    private readonly map : Map<string, T>;
    private str : string;
    private dirty: boolean;

    constructor(...values: T[]) {
        this.map = new Map<string, T>();
        values.forEach(val => this.map.set(val.toString(), val));
        this.dirty = true;
    }

    public add(value: T) {
        const str = value.toString();
        const res = !this.map.has(str);
        this.map.set(str, value);
        this.dirty ||= res;
        return res;
    }

    public addAll(...values: T[]) {
        let res = false;
        for (const val of values) {
            const str = val.toString();
            res ||= !this.map.has(str);
            this.map.set(str, val);
        }
        this.dirty ||= res;
        return res;
    }

    public has(value: T) {
        return this.map.has(value.toString());
    }

    public [Symbol.iterator](){
        return this.map.values()
    }

    public forEach(func : (value: T) => any){
        for(let value of this.map.values()){
            func(value);
        }
    }

    public get size() {
        return this.map.size
    }

    public toString() {
        if(this.dirty) this.str = `{${[...this].join("\0")}}`, this.dirty = false;
        return this.str;
    }
}

class SMap<T, U> {

    private readonly map: _map<T, [T, U]> = new _map<T, [T, U]>();

    constructor(...entries: [T, U][]) {
        this.addAll(...entries);
    }

    public add(key: T, value: U) {
        return this.map.add(key, [key, value]);
    }

    public addAll(...entries: [T, U][]) {
        return entries.map(([key, value]) => this.add(key, value)).some(i => i);
    }

    public has(key: T) {
        return this.map.has(key);
    }

    public get(key: T) {
        return this.map.get(key)?.[1];
    }

    public [Symbol.iterator] = () => this.map[Symbol.iterator]()

    public get size() {
        return this.map.size
    }

    public toString() {
        return `{${[...this].map(([key, value]) => `${key} => ${value}`).join(", ")}}`
    }
}

class TokenType {
    public static compressName = false;
    private static instances: SMap<string, TokenType> = new SMap<string, TokenType>();
    public readonly name: string;
    public readonly pattern: RegExp;

    public static create(name: string, pattern: RegExp = null) {
        return this.instances.get(name) || new TokenType(name, pattern);
    }
    private constructor(name: string, pattern: RegExp) {
        this.name = name;
        this.pattern = pattern;

        TokenType.instances.add(name, this);
    }

    public toString = () => this.name;

    public static readonly START = new TokenType("__START__", /^(?!x)x$/);
    public static readonly END = new TokenType("__END__", /^(?!x)x$/);
    public static readonly EPSILON = new TokenType("ε", /^(?!x)x$/);
    public static readonly UNKNOWN = new TokenType("__ERROR__", /^(?!x)x$/);
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

    public toString = () => this.symbol.toString() == this.value
        ? `"${this.symbol}"`
        : `${this.symbol}<${this.value}>`
}

class SymbolString {
    public readonly symbols: TokenType[];
    private readonly str: string;

    constructor(...symbols: TokenType[]) {
        this.symbols = symbols;
        this.str = symbols.map(i => i.toString()).join(" ");
    }

    public get length() {
        return this.symbols.length
    }

    public toString = () => this.str

    public get = (i: number) => this.symbols[i < 0 ? i + this.length : i]

    public [Symbol.iterator] = () => this.symbols[Symbol.iterator]();

    public substr(start: number = 0, end: number = -1) {
        return new SymbolString(...this.symbols.slice(start, end + (end < 0 ? this.length + 1 : 0)));
    }

    public concatSymbol = (symbol: TokenType) => new SymbolString(...this, symbol);
    public concat = (symbols: SymbolString) => new SymbolString(...this, ...symbols);
}

abstract class AST {
    public readonly description: TokenType;
    protected readonly _children: AST[];
    protected readonly _value: Token;

    protected constructor(description: TokenType, value: Token, ...children: AST[]) {
        this.description = description;
        this._children = children;
        this._value = value;
    }

    public abstract get children(): AST[];

    public abstract get value(): Token;

    public [Symbol.iterator] = () => this.children[Symbol.iterator]()

    public get isLeaf() {
        return this._value !== null;
    }

    public static Node = class Node extends AST {
        constructor(description: TokenType, ...children: AST[]) {
            super(description, null, ...children);
        }

        get children(): AST[] {
            return this._children;
        }

        get value(): Token {
            throw new Error("Cannot access value of non-leaf node");
        }

        public toString() {
            return `${
                this.description
            } {${
                this.children.length == 0 ? "" : `\n    ${
                    this.children.map(i => i.toString()).join("\n").replaceAll(/\n/g, "\n    ")
                }`
            }\n}`;
        }
    }

    public static Leaf = class Leaf extends AST {
        constructor(description: TokenType, value: Token) {
            super(description, value);
        }

        get children(): AST[] {
            throw new Error("Cannot access children of leaf node");
        }

        get value(): Token {
            return this._value;
        }

        public toString = () => this.value
    }
}