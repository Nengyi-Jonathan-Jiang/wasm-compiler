class ParseRule {
    /**
     * @param {TokenType} lhs
     * @param {SymbolString} rhs
     */
    constructor(lhs, rhs) {
        this.lhs = lhs;
        this.rhs = rhs;
    }

    get length() { return this.rhs.length }
    get empty() { return this.length === 0 }

    toString() { return `${this.lhs} := ${this.rhs}` }
}

/** @template T */
class SSet {
    /** @param {...T} values */
    constructor(...values) {
        /** @type {SMap<T, T>} */
        this.map = new SMap();
        this.addAll(...values);
    }

    /** @param {T} value */
    add(value) {
        let res = this.map.has(value);
        this.map.add(value, value);
        return res;
    }

    /** @param {...T} values */
    addAll(...values) {
        return values.map(i => this.add(value)).some();
    }

    /**
     * @param {T} value
     * @return {boolean}
     */
    has(value) {
        return this.map.has(value);
    }

    get [Symbol.iterator]() {
        return Object.keys(this.map.obj).map(i => this.map.get(i))[Symbol.iterator];
    }
}

/** @template T, U */
class SMap {
    constructor() {
        this.obj = Object.create(null);
    }

    /**
     * @param {T} key
     * @param {U} value
     */
    add(key, value) {
        this.obj["_" + value] = value;
    }

    /**
     * @param {T} key
     * @return {boolean}
     */
    has(key) {
        return ("_" + key) in this.obj;
    }

    /**
     * @param {T} key
     * @return {U}
     */
    get(key) {
        return this.obj["_" + key];
    }

    /** @returns {[string, U][]} */
    get [Symbol.iterator]() {
        return Object.keys(this.obj).map(i => [i, this.get[i]]);
    }
}

class Grammar {
    /**
     * @param {TokenType} startSymbol
     * @param {...ParseRule} rules
     */
    constructor(startSymbol, ...rules) {
        this.rules = rules;

        this.startRule = new ParseRule(TokenType.START, new SymbolString(startSymbol));
        this.rules.push(this.startRule);

        /** @type {SSet<TokenType>} */
        this.allSymbols = new SSet();
        /** @type {SSet<TokenType>} */
        this.nonTerminals = new SSet();
        /** @type {SSet<TokenType>} */
        this.terminals = new SSet();
        /** @type {SSet<TokenType>} */
        this.nullableSymbols = new SSet();
        /** @type {SMap<TokenType, SSet<TokenType>>} */
        this.firstSets = new SMap();
        /** @type {SMap<TokenType, SSet<TokenType>>} */
        this.followSets = new SMap();
        /** @type {SMap<TokenType, SSet<ParseRule>>} */
        this.startsWith = new SMap();

        this.nonTerminals.add(TokenType.START);
        this.allSymbols.add(TokenType.START);
        this.allSymbols.add(TokenType.END);

        for (const rule of rules) {
            this.nonTerminals.add(rule.lhs);
            for (const symbol of rule.rhs) {
                this.allSymbols.add(symbol);
            }
        }

        [...this.allSymbols].filter(i => !this.nonTerminals.has(i)).forEach(i => this.terminals.add(i));

        for (const symbol of this.allSymbols) {
            this.startsWith.add(symbol, []);
        }
        for (const rule of rules) {
            this.startsWith.get(rule.lhs).add(rule);
        }


        for (const symbol of this.allSymbols) {
            this.firstSets.add(symbol, new SSet());
            this.followSets.add(symbol, new SSet());
            if (this.isTerminal(symbol)) {
                this.firstSets.get(symbol).add(symbol);
            }
        }

        this.followSets.get(TokenType.START).add(TokenType.END);

        // set calculations
        let updated = true;
        while (updated) {
            updated = false;
            for (const rule of this.rules) {
                const { lhs, rhs } = rule;

                // Update FIRST sets
                const firstSet = this.firstSets.get(lhs);
                let brk = false;
                for (const symbol of rhs) {
                    updated |= firstSet.addAll(...this.firstSets.get(symbol));
                    if (!this.nullableSymbols.has(symbol)) {
                        brk = true;
                        break;
                    }
                }
                if (!brk) {
                    updated |= this.nullableSymbols.add(lhs);
                }

                // Update FOLLOW sets
                let aux = this.followSets.get(lhs);
                for(let symbol of rhs.symbols.slice().reverse()){
                    if(this.isNonTerminal(symbol)){
                        updated |= this.followSets.get(symbol).addAll(aux);
                    }
                    if(this.nullableSymbols.has(symbol)){
                        aux = new SSet(...aux);
                        aux.addAll(this.firstSets.get(symbol));
                    }
                    else aux = this.firstSets.get(symbol);
                }
            }
        }
    }


    /** @param {TokenType} symbol */
    isNonTerminal(symbol) {
        return this.nonTerminals.has(symbol);
    }

    /** @param {TokenType} symbol */
    isTerminal(symbol) {
        return this.terminals.has(symbol);
    }

    /** @param {SymbolString} string @returns {SSet<TokenType>}*/
    getFirstSet(string) {
        if(string.length == 0) return new SSet(TokenType.EPSILON);
        const res = new SSet(...this.firstSets.get(string[0]));
        if(this.nullableSymbols.has(string[0])) res.addAll(this.getFirstSet(string.substr(1)));
        return res;
    }

    /** @param {TokenType} string @returns {SSet<TokenType>}*/
    getFollowSet(string) {
        if(string.length == 0) return new SSet(TokenType.EPSILON);
        const res = new SSet(...this.firstSets.get(string[-1]));
        if(this.nullableSymbols.has(string[-1])) res.addAll(this.getFirstSet(string.substr(0, -1)));
        return res;
    }

    /** @param {SymbolString} string @returns {boolean}*/
    isNullable(string){
        for(const symbol of string)
            if(!this.nullableSymbols.has(symbol))
                return false;
        return true;
    }

    toString(){
        return this.rules.join("\n");
    }
}
