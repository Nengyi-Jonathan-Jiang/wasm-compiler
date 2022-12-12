function transformIterator<T, U>(iterator: Iterator<T>, func: (value: T) => U): Iterator<U> {
    return {
        next() {
            const {value, done} = iterator.next();
            return {value: done ? undefined : func(value), done};
        }
    }
}

class _map<T, U> {
    private readonly map = new Map<string, U>;

    public add(key: T, value: U) {
        let res = !this.has(key);
        this.map.set(key.toString(), value);
        return res;
    }

    public del(key: T) {
        let res = this.get(key);
        this.map.delete(key.toString());
        return res;
    }

    public has(key: T) {
        return this.map.has(key.toString());
    }

    public get(key: T): U {
        return this.map.get(key.toString());
    }

    public get size() {
        return this.map.size;
    }

    public [Symbol.iterator] = () : Iterator<[string, U]> => this.map.entries()
}

class SSet<T> {
    private readonly map: _map<T, T> = new _map<T, T>();

    constructor(...values: T[]) {
        this.addAll(...values);
    }

    public add(value: T){
        return this.map.add(value, value)
    }

    public addAll(...values: T[]) {
        return values.map(value => this.add(value)).some(i => i);
    }

    public del(value: T) {
        return this.map.del(value);
    }

    public has(value: T) {
        return this.map.has(value);
    }

    public [Symbol.iterator] = () => transformIterator(this.map[Symbol.iterator](), ([, value]) => value);

    public get size() {
        return this.map.size
    }

    public toString() {
        return `{${[...this].join(", ")}}`
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

    public del(key: T) {
        return this.map.del(key);
    }

    public has(key: T) {
        return this.map.has(key);
    }

    public get(key: T) {
        return this.map.get(key)?.[1];
    }

    public [Symbol.iterator] = () => transformIterator(this.map[Symbol.iterator](), ([, entry]) => entry)

    public get size() {
        return this.map.size
    }

    public toString() {
        return `{${[...this].map(([key, value]) => `${key} => ${value}`).join(", ")}}`
    }
}

class TokenType {
    public static compressName = false;

    private static id = 0;
    private static instances : SMap<string, TokenType> = new SMap<string, TokenType>();

    public readonly name: string;
    public readonly pattern: RegExp;
    private readonly id = ++TokenType.id;

    public static create(name: string, pattern: RegExp = null){
        return this.instances.get(name) || new TokenType(name, pattern);
    }


    private constructor(name: string, pattern: RegExp) {
        this.name = name;
        this.pattern = pattern;

        TokenType.instances.add(name, this);
    }

    public toString = () => TokenType.compressName ? String.fromCharCode(this.id) : this.name;

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

    public toString = () => `${this.symbol}<${this.value}>`
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

    public abstract get children() : AST[];
    public abstract get value() : Token;

    public [Symbol.iterator] = () => this.children[Symbol.iterator]()
    public get isLeaf(){
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

        public toString(){
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