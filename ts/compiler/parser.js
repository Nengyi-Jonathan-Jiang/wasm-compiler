var _a;
class ParseRule {
    constructor(lhs, rhs) {
        this.lhs = lhs;
        this.rhs = rhs;
        this.str = `${this.lhs} := ${this.rhs}`;
    }
    get length() {
        return this.rhs.length;
    }
    toString() {
        return this.str;
    }
}
class Grammar {
    constructor(startSymbol, ...rules) {
        this.memoization = new SMap();
        this.rules = rules;
        this.startRule = new ParseRule(TokenType.START, new SymbolString(startSymbol));
        this.rules.push(this.startRule);
        this.allSymbols = new SSet();
        this.nonTerminals = new SSet();
        this.terminals = new SSet();
        this.nullableSymbols = new SSet();
        this.firstSets = new SMap();
        this.followSets = new SMap();
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
        this.terminals.addAll(...[...this.allSymbols].filter(i => !this.nonTerminals.has(i)));
        for (const symbol of this.allSymbols) {
            this.startsWith.add(symbol, []);
        }
        for (const rule of rules) {
            this.startsWith.get(rule.lhs).push(rule);
        }
        for (const symbol of this.allSymbols) {
            this.firstSets.add(symbol, new SSet());
            this.followSets.add(symbol, new SSet());
            if (this.isTerminal(symbol)) {
                this.firstSets.get(symbol).add(symbol);
            }
        }
        this.followSets.get(TokenType.START).add(TokenType.END);
        let updated = true;
        while (updated) {
            updated = false;
            for (const rule of this.rules) {
                const { lhs, rhs } = rule;
                const firstSet = this.firstSets.get(lhs);
                let brk = false;
                for (const symbol of rhs) {
                    updated || (updated = firstSet.addAll(...this.firstSets.get(symbol)));
                    if (!this.nullableSymbols.has(symbol)) {
                        brk = true;
                        break;
                    }
                }
                if (!brk) {
                    updated || (updated = this.nullableSymbols.add(lhs));
                }
                let aux = this.followSets.get(lhs);
                for (let symbol of rhs.symbols.slice().reverse()) {
                    if (this.isNonTerminal(symbol)) {
                        updated || (updated = this.followSets.get(symbol).addAll(...aux));
                    }
                    if (this.nullableSymbols.has(symbol)) {
                        aux = new SSet(...aux);
                        aux.addAll(...this.firstSets.get(symbol));
                    }
                    else
                        aux = this.firstSets.get(symbol);
                }
            }
        }
    }
    isNonTerminal(symbol) {
        return this.nonTerminals.has(symbol);
    }
    isTerminal(symbol) {
        return this.terminals.has(symbol);
    }
    getFirstSet(string) {
        if (string.length === 0)
            return new SSet(TokenType.EPSILON);
        if (this.memoization.has(string))
            return this.memoization.get(string);
        const res = this.nullableSymbols.has(string.get(0))
            ? new SSet(...this.firstSets.get(string.get(0)), ...this.getFirstSet(string.substr(1)))
            : new SSet(...this.firstSets.get(string.get(0)));
        this.memoization.add(string, res);
        return res;
    }
    toString() {
        return this.rules.join("\n");
    }
}
class TableEntry {
}
TableEntry.Shift = class Shift extends TableEntry {
    constructor(nextState) {
        super();
        this.nextState = nextState;
    }
};
TableEntry.Reduce = class Reduce extends TableEntry {
    constructor(reduceRule) {
        super();
        this.rule = reduceRule;
    }
};
TableEntry.Accept = class Accept extends TableEntry {
};
class ParsingTable {
    constructor(numStates) {
        this.numStates = numStates;
        this.actionTable = new Array(numStates).fill(null).map(_ => new SMap());
        this.gotoTable = new Array(numStates).fill(null).map(_ => new SMap());
    }
    getAction(state, symbol) {
        return this.actionTable[state].get(symbol);
    }
    getGoto(state, symbol) {
        return this.gotoTable[state].get(symbol);
    }
    setActionReduce(state, symbol, rule) {
        this.actionTable[state].add(symbol, new TableEntry.Reduce(rule));
    }
    setActionShift(state, symbol, nextState) {
        this.actionTable[state].add(symbol, new TableEntry.Shift(nextState));
    }
    setActionAccept(state, symbol) {
        this.actionTable[state].add(symbol, new TableEntry.Accept());
    }
    setGoto(state, symbol, n) {
        this.gotoTable[state].add(symbol, n);
    }
}
class Item {
    constructor(rule, pos, lookahead) {
        this.rule = rule;
        this.pos = pos;
        this.lookahead = lookahead;
    }
    get isFinished() {
        return this.pos >= this.rule.length;
    }
    toString() {
        if (this.str === undefined)
            this.str = `${this.rule.lhs} := ${this.rule.rhs} pos=${this.pos} ?= ${this.lookahead}`;
        return this.str;
    }
    get next() {
        return this.isFinished ? null : this.rule.rhs.get(this.pos);
    }
    shift() {
        return new Item(this.rule, this.pos + 1, this.lookahead);
    }
    static merge(s1, s2) {
        const lookahead = this.mergeLookahead(s1.lookahead, s2.lookahead);
        return new Item(s1.rule, s1.pos, lookahead);
    }
    static mergeLookahead(a, b) {
        return SSet.from(a, b);
    }
}
class ItemSet {
    constructor(...items) {
        this.map = new Map();
        this.dirty = false;
        this[_a] = () => this.map.values();
        this.addAll(...items);
    }
    updateRepr() {
        this.str = `{\n\t${[...this].join("\n\t")}\n}`;
    }
    toString() {
        if (this.dirty)
            this.updateRepr();
        return this.str;
    }
    stringify(item) {
        return item.rule + "@" + item.pos;
    }
    add(value) {
        if (this.has(value)) {
            const prev = this.get(value);
            const merged = Item.merge(prev, value);
            if (prev.lookahead.size == merged.lookahead.size)
                return false;
            this._add(merged);
            return this.dirty = true;
        }
        this._add(value);
        return this.dirty = true;
    }
    _add(value) {
        this.map.set(this.stringify(value), value);
    }
    addAll(...values) {
        return values.map(value => this.add(value)).some(i => i);
    }
    del(key) {
        let res = this.get(key);
        this.map.delete(this.stringify(key));
        if (res !== undefined)
            this.dirty = true;
        return res;
    }
    has(key) {
        return this.map.has(this.stringify(key));
    }
    get(key) {
        return this.map.get(this.stringify(key));
    }
    get size() {
        return this.map.size;
    }
}
_a = Symbol.iterator;
class ParseTableBuilder {
    constructor(grammar) {
        this.memoization = new SMap();
        this.grammar = grammar;
        this.startItem = new Item(grammar.startRule, 0, new SSet(TokenType.END));
        this.configuratingSets = new SMap();
        this.successors = new SMap();
        this.generateConfiguratingSets();
        this.table = new ParsingTable(this.configuratingSets.size);
        this.generateParsingTable();
    }
    generateConfiguratingSets() {
        console.log("Generating configurating sets...");
        const initialState = this.itemClosure(this.startItem);
        this.configuratingSets.add(initialState, 0);
        this.successors.add(0, new SMap());
        let edge = new SSet(initialState);
        let updated = true;
        while (updated) {
            updated = false;
            const newEdge = new SSet();
            for (const configuratingSet of edge) {
                const state = this.configuratingSets.get(configuratingSet);
                for (const symbol of this.grammar.allSymbols) {
                    const successor = this.successor(configuratingSet, symbol);
                    if (successor.size == 0)
                        continue;
                    if (this.addConfiguratingState(state, symbol, successor)) {
                        updated = true;
                        newEdge.add(successor);
                    }
                }
            }
            edge = newEdge;
        }
    }
    addConfiguratingState(state, symbol, successor) {
        if (!this.configuratingSets.has(successor)) {
            const newState = this.configuratingSets.size;
            this.successors.add(newState, new SMap());
            this.configuratingSets.add(successor, newState);
            this.successors.get(state).add(symbol, newState);
            console.log(`Found ${this.configuratingSets.size}th configurating set (${successor.size} items)`);
            return true;
        }
        this.successors.get(state).add(symbol, this.configuratingSets.get(successor));
        return false;
    }
    itemClosure(item) {
        if (this.memoization.has(item))
            return this.memoization.get(item);
        const res = new ItemSet(item);
        if (item.isFinished)
            return res;
        let edge = new ItemSet(...res);
        let updated = true;
        while (updated) {
            updated = false;
            let newEdge = new ItemSet();
            for (const itm of edge) {
                if (itm.isFinished || !this.grammar.isNonTerminal(itm.next))
                    continue;
                const rest = itm.rule.rhs.substr(itm.pos + 1);
                for (const r of this.grammar.startsWith.get(itm.next)) {
                    for (const lookahead of itm.lookahead) {
                        const newItem = new Item(r, 0, new SSet(...this.grammar.getFirstSet(rest.concatSymbol(lookahead))));
                        const isNew = res.add(newItem);
                        if (isNew) {
                            updated = true;
                            newEdge.add(newItem);
                        }
                    }
                }
            }
            edge = newEdge;
        }
        this.memoization.add(item, res);
        return res;
    }
    itemSetClosure(itemSet) {
        const res = new ItemSet(...itemSet);
        [...itemSet].forEach(item => res.addAll(...this.itemClosure(item)));
        return res;
    }
    successor(itemSet, symbol) {
        const res = new ItemSet();
        for (const item of itemSet) {
            if (!item.isFinished && item.next == symbol) {
                res.add(item.shift());
            }
        }
        return this.itemSetClosure(res);
    }
    generateParsingTable() {
        console.log("Generating parsing table entries...");
        let i = 0;
        for (const [itemSet, state] of this.configuratingSets) {
            this.generateActionSetEntries(state, itemSet);
            this.generateGotoSetEntries(state);
        }
    }
    generateActionSetEntries(state, itemSet) {
        for (const item of itemSet) {
            if (item.isFinished && item.rule == this.grammar.startRule) {
                this.table.setActionAccept(state, TokenType.END);
            }
            else if (item.isFinished) {
                this.generateReductions(state, item);
            }
            else {
                this.generateShifts(state, item);
            }
        }
    }
    generateReductions(state, item) {
        for (const symbol of item.lookahead) {
            this.table.setActionReduce(state, symbol, item.rule);
        }
    }
    generateShifts(state, item) {
        const nextState = this.successors.get(state).get(item.next);
        if (nextState === undefined)
            return;
        this.table.setActionShift(state, item.next, nextState);
    }
    generateGotoSetEntries(state) {
        for (const symbol of this.grammar.nonTerminals) {
            const nextState = this.successors.get(state).get(symbol);
            if (nextState === undefined)
                continue;
            this.table.setGoto(state, symbol, nextState);
        }
    }
}
class Parser {
    constructor(table) {
        this.table = table;
        const _this = this;
        this.Parse = class {
            constructor() {
                this.stateStack = [0];
                this.nodeStack = [];
                this.finished = false;
            }
            accept(token, log = false) {
                const state = this.stateStack[this.stateStack.length - 1];
                const entry = _this.table.getAction(state, token.symbol);
                if (entry === undefined)
                    throw new Error("Could not find entry for state " + state + " on symbol " + token);
                if (entry instanceof TableEntry.Shift) {
                    this.stateStack.push(entry.nextState);
                    this.nodeStack.push(new AST.Leaf(token.symbol, token));
                    if (log)
                        console.log(`Shift on ${token}`);
                }
                else if (entry instanceof TableEntry.Accept) {
                    this.finished = true;
                    if (log)
                        console.log(`Accept on ${token}`);
                }
                else if (entry instanceof TableEntry.Reduce) {
                    const { rule: { lhs, length } } = entry;
                    for (let j = 0; j < length; j++)
                        this.stateStack.pop();
                    this.stateStack.push(table.getGoto(this.stateStack[this.stateStack.length - 1], lhs));
                    if (length != 1) {
                        const children = new Array(length);
                        for (let j = length; j-- > 0;)
                            children[j] = this.nodeStack.pop();
                        this.nodeStack.push(new AST.Node(lhs, ...children));
                    }
                    if (log)
                        console.log(`Reduce ${entry.rule} on ${token}`);
                    this.accept(token);
                }
            }
            get isFinished() {
                return this.finished;
            }
            get result() {
                if (!this.isFinished)
                    throw new Error("Cannot access result before finished parsing");
                return this.nodeStack[0];
            }
        };
    }
    parse(tokens, log = false) {
        const parse = new this.Parse();
        tokens.forEach(token => parse.accept(token, log));
        return parse.result;
    }
    static new([str]) {
        const rules = [];
        let startSymbol;
        str.split(/\s*\n\s*/g).filter(i => i !== "" && !i.startsWith("//")).map(i => {
            const regex1 = /^(\S+) := (\S+( \S+)*)/;
            const regex2 = /^start (\S+)$/;
            const regex3 = /^nullable (\S+)$/;
            if (i.match(regex1) !== null) {
                const [, _lhs, _rhs] = i.match(regex1);
                const lhs = TokenType.create(_lhs), rhs = _rhs.split(" ").map(j => TokenType.create(j));
                rules.push(new ParseRule(lhs, new SymbolString(...rhs)));
            }
            else if (i.match(regex2) !== null) {
                const [, lhs] = i.match(regex2);
                startSymbol = TokenType.create(lhs);
            }
            else if (i.match(regex3) !== null) {
                const [, _lhs] = i.match(regex3);
                const lhs = TokenType.create(_lhs);
                rules.push(new ParseRule(lhs, new SymbolString()));
            }
            else
                throw new Error("Error in Parser specification");
        });
        const grammar = new Grammar(startSymbol, ...rules);
        const table = new ParseTableBuilder(grammar).table;
        return new Parser(table);
    }
}
//# sourceMappingURL=parser.js.map