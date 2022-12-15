var _a, _b, _c;
class _map {
    constructor() {
        this.map = new Map;
    }
    add(key, value) {
        let res = !this.has(key);
        this.map.set(key.toString(), value);
        return res;
    }
    has(key) {
        return this.map.has(key.toString());
    }
    get(key) {
        return this.map.get(key.toString());
    }
    get size() {
        return this.map.size;
    }
    [Symbol.iterator]() {
        return this.map.values();
    }
}
class SSet {
    constructor(...values) {
        this.map = new Map();
        values.forEach(val => this.map.set(val.toString(), val));
        this.dirty = true;
    }
    add(value) {
        const str = value.toString();
        const res = !this.map.has(str);
        this.map.set(str, value);
        this.dirty || (this.dirty = res);
        return res;
    }
    addAll(...values) {
        let res = false;
        for (const val of values) {
            const str = val.toString();
            res || (res = !this.map.has(str));
            this.map.set(str, val);
        }
        this.dirty || (this.dirty = res);
        return res;
    }
    has(value) {
        return this.map.has(value.toString());
    }
    [Symbol.iterator]() {
        return this.map.values();
    }
    forEach(func) {
        for (let value of this.map.values()) {
            func(value);
        }
    }
    get size() {
        return this.map.size;
    }
    toString() {
        if (this.dirty) {
            this.str = `${[...this].sort().join("\0")}`;
            this.dirty = false;
        }
        return this.str;
    }
}
class SMap {
    constructor(...entries) {
        this.map = new _map();
        this[_a] = () => this.map[Symbol.iterator]();
        this.addAll(...entries);
    }
    add(key, value) {
        return this.map.add(key, [key, value]);
    }
    addAll(...entries) {
        return entries.map(([key, value]) => this.add(key, value)).some(i => i);
    }
    has(key) {
        return this.map.has(key);
    }
    get(key) {
        var _d;
        return (_d = this.map.get(key)) === null || _d === void 0 ? void 0 : _d[1];
    }
    get size() {
        return this.map.size;
    }
    toString() {
        return `{${[...this].map(([key, value]) => `${key} => ${value}`).join(", ")}}`;
    }
}
_a = Symbol.iterator;
class TokenType {
    static create(name, pattern = null) {
        return this.instances.get(name) || new TokenType(name, pattern);
    }
    constructor(name, pattern) {
        this.toString = () => this.name;
        this.name = name;
        this.pattern = pattern;
        TokenType.instances.add(name, this);
    }
}
TokenType.compressName = false;
TokenType.instances = new SMap();
TokenType.START = new TokenType("__START__", /^(?!x)x$/);
TokenType.END = new TokenType("__END__", /^(?!x)x$/);
TokenType.EPSILON = new TokenType("ε", /^(?!x)x$/);
TokenType.UNKNOWN = new TokenType("__ERROR__", /^(?!x)x$/);
class Token {
    constructor(symbol, value, start, end) {
        this.toString = () => this.symbol.toString() == this.value
            ? `"${this.symbol}"`
            : `${this.symbol}<${this.value}>`;
        this.symbol = symbol;
        this.value = value;
        this.start = start;
        this.end = end;
    }
}
class SymbolString {
    constructor(...symbols) {
        this.toString = () => this.str;
        this.get = (i) => this.symbols[i < 0 ? i + this.length : i];
        this[_b] = () => this.symbols[Symbol.iterator]();
        this.concatSymbol = (symbol) => new SymbolString(...this, symbol);
        this.concat = (symbols) => new SymbolString(...this, ...symbols);
        this.symbols = symbols;
        this.str = symbols.map(i => i.toString()).join(" ");
    }
    get length() {
        return this.symbols.length;
    }
    substr(start = 0, end = -1) {
        return new SymbolString(...this.symbols.slice(start, end + (end < 0 ? this.length + 1 : 0)));
    }
}
_b = Symbol.iterator;
class AST {
    constructor(description, value, ...children) {
        this[_c] = () => this.children[Symbol.iterator]();
        this.description = description;
        this._children = children;
        this._value = value;
    }
    get isLeaf() {
        return this._value !== null;
    }
}
_c = Symbol.iterator;
AST.Node = class Node extends AST {
    constructor(description, ...children) {
        super(description, null, ...children);
    }
    get children() {
        return this._children;
    }
    get value() {
        throw new Error("Cannot access value of non-leaf node");
    }
    toString() {
        return `${this.description} {${this.children.length == 0 ? "" : `\n    ${this.children.map(i => i.toString()).join("\n").replaceAll(/\n/g, "\n    ")}`}\n}`;
    }
};
AST.Leaf = class Leaf extends AST {
    constructor(description, value) {
        super(description, value);
        this.toString = () => this.value;
    }
    get children() {
        throw new Error("Cannot access children of leaf node");
    }
    get value() {
        return this._value;
    }
};
//# sourceMappingURL=shared.js.map