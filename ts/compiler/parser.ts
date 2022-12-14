class ParseRule {
    public readonly lhs: TokenType;
    public readonly rhs: SymbolString;
    private readonly str: string;
    public readonly process : (node: AST) => AST;

    constructor(lhs: TokenType, rhs: SymbolString, process:(node:AST) => AST = (x)=>x) {
        this.lhs = lhs;
        this.rhs = rhs;
        this.process = process;
        this.str = `${this.lhs} := ${this.rhs}`;
    }

    public get length() {
        return this.rhs.length
    }

    public toString() {
        return this.str;
    }
}

class Grammar {
    public readonly rules: ParseRule[];
    public readonly startRule: ParseRule;
    readonly allSymbols: SSet<TokenType>;
    readonly nonTerminals: SSet<TokenType>;
    private readonly terminals: SSet<TokenType>;
    private readonly nullableSymbols: SSet<TokenType>;

    private readonly firstSets: SMap<TokenType, SSet<TokenType>>;
    private readonly followSets: SMap<TokenType, SSet<TokenType>>;

    readonly startsWith: SMap<TokenType, ParseRule[]>;

    constructor(startSymbol: TokenType, ...rules: ParseRule[]) {
        this.rules = rules;

        this.startRule = new ParseRule(TokenType.START, new SymbolString(startSymbol));
        this.rules.push(this.startRule);

        this.allSymbols = new SSet<TokenType>();
        this.nonTerminals = new SSet<TokenType>();
        this.terminals = new SSet<TokenType>();
        this.nullableSymbols = new SSet();

        this.firstSets = new SMap<TokenType, SSet<TokenType>>();
        this.followSets = new SMap<TokenType, SSet<TokenType>>();
        this.startsWith = new SMap<TokenType, ParseRule[]>();

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
            this.firstSets.add(symbol, new SSet<TokenType>());
            this.followSets.add(symbol, new SSet<TokenType>());
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
                const {lhs, rhs} = rule;

                // Update FIRST sets
                const firstSet = this.firstSets.get(lhs);
                let brk = false;
                for (const symbol of rhs) {
                    updated ||= firstSet.addAll(...this.firstSets.get(symbol));
                    if (!this.nullableSymbols.has(symbol)) {
                        brk = true;
                        break;
                    }
                }
                if (!brk) {
                    updated ||= this.nullableSymbols.add(lhs);
                }

                // Update FOLLOW sets
                let aux = this.followSets.get(lhs);
                for (let symbol of rhs.symbols.slice().reverse()) {
                    if (this.isNonTerminal(symbol)) {
                        updated ||= this.followSets.get(symbol).addAll(...aux);
                    }
                    if (this.nullableSymbols.has(symbol)) {
                        aux = new SSet<TokenType>(...aux);
                        aux.addAll(...this.firstSets.get(symbol));
                    } else aux = this.firstSets.get(symbol);
                }
            }
        }
    }


    public isNonTerminal(symbol: TokenType) {
        return this.nonTerminals.has(symbol);
    }

    public isTerminal(symbol: TokenType) {
        return this.terminals.has(symbol);
    }

    private readonly memoization: SMap<SymbolString, SSet<TokenType>> = new SMap<SymbolString, SSet<TokenType>>();

    public getFirstSet(string: SymbolString): SSet<TokenType> {
        if (string.length === 0)
            return new SSet(TokenType.EPSILON);
        if (this.memoization.has(string))
            return this.memoization.get(string);
        const res = this.nullableSymbols.has(string.get(0))
            ? new SSet(...this.firstSets.get(string.get(0)), ...this.getFirstSet(string.substr(1)))
            : new SSet(...this.firstSets.get(string.get(0)))
        this.memoization.add(string, res);
        return res;
    }

    public toString() {
        return this.rules.join("\n");
    }
}

class TableEntry {
    public static Shift = class Shift extends TableEntry {
        public readonly nextState: number;

        constructor(nextState: number) {
            super();
            this.nextState = nextState;
        }
    }

    public static Reduce = class Reduce extends TableEntry {
        public readonly rule: ParseRule;

        constructor(reduceRule: ParseRule) {
            super();
            this.rule = reduceRule;
        }
    }

    public static Accept = class Accept extends TableEntry {
    }
}

class ParsingTable {
    public readonly numStates: number;
    private readonly actionTable: SMap<TokenType, TableEntry>[];
    private readonly gotoTable: SMap<TokenType, number>[];

    constructor(numStates: number) {
        this.numStates = numStates;

        this.actionTable = new Array(numStates).fill(null).map(_ => new SMap<TokenType, TableEntry>());
        this.gotoTable = new Array(numStates).fill(null).map(_ => new SMap<TokenType, number>());
    }

    public getAction(state: number, symbol: TokenType) {
        return this.actionTable[state].get(symbol);
    }

    public getGoto(state: number, symbol: TokenType) {
        return this.gotoTable[state].get(symbol);
    }

    public setActionReduce(state: number, symbol: TokenType, rule: ParseRule) {
        this.actionTable[state].add(symbol, new TableEntry.Reduce(rule));
    }

    public setActionShift(state: number, symbol: TokenType, nextState: number) {
        this.actionTable[state].add(symbol, new TableEntry.Shift(nextState));
    }

    public setActionAccept(state: number, symbol: TokenType) {
        this.actionTable[state].add(symbol, new TableEntry.Accept());
    }

    public setGoto(state: number, symbol: TokenType, n: number) {
        this.gotoTable[state].add(symbol, n);
    }
}

class Item {
    public readonly rule: ParseRule;
    public readonly pos: number;
    public readonly lookahead: SSet<TokenType>;
    private str: string;

    constructor(rule: ParseRule, pos: number, lookahead: SSet<TokenType>) {
        this.rule = rule;
        this.pos = pos;
        this.lookahead = lookahead;
    }

    public get isFinished() {
        return this.pos >= this.rule.length;
    }

    toString() {
        if (this.str === undefined) this.str = `${this.rule.lhs} := ${this.rule.rhs} pos=${this.pos} ?= ${this.lookahead}`;
        return this.str
    }

    public get next() {
        return this.isFinished ? null : this.rule.rhs.get(this.pos);
    }

    public shift() {
        return new Item(this.rule, this.pos + 1, this.lookahead);
    }

    public static merge(s1: Item, s2: Item) {
        const lookahead = this.mergeLookahead(s1.lookahead, s2.lookahead);
        return new Item(s1.rule, s1.pos, lookahead);
    }

    public static mergeLookahead(a: SSet<TokenType>, b: SSet<TokenType>){
        //return new SSet<TokenType>(...a, ...b);
        return SSet.from<TokenType>(a, b);
    }
}


class ItemSet {
    private map: Map<string, Item> = new Map<string, Item>();
    private str: string;
    private dirty: boolean = false;

    constructor(...items: Item[]) {
        this.addAll(...items);
    }

    private updateRepr() {
        this.str = `{\n\t${[...this].join("\n\t")}\n}`;
    }

    public toString() {
        if (this.dirty) this.updateRepr();
        return this.str;
    }

    private stringify(item: Item) {
        return item.rule + "@" + item.pos;
    }

    public add(value: Item) {
        if (this.has(value)) {
            const prev = this.get(value);
            const merged = Item.merge(prev, value)
            if (prev.lookahead.size == merged.lookahead.size) return false;

            this._add(merged);

            return this.dirty = true;
        }
        this._add(value);
        return this.dirty = true;
    }

    private _add(value: Item) {
        this.map.set(this.stringify(value), value);
    }

    public addAll(...values: Item[]) {
        return values.map(value => this.add(value)).some(i => i);
    }


    public del(key: Item) {
        let res = this.get(key);
        this.map.delete(this.stringify(key));
        if (res !== undefined) this.dirty = true;
        return res;
    }

    public has(key: Item) {
        return this.map.has(this.stringify(key));
    }

    public get(key: Item): Item {
        return this.map.get(this.stringify(key));
    }

    public get size() {
        return this.map.size;
    }

    public [Symbol.iterator] = (): Iterator<Item> => this.map.values()
}

class ParseTableBuilder {
    private readonly grammar: Grammar;
    public readonly table: ParsingTable;
    private readonly configuratingSets: SMap<ItemSet, number>;
    private readonly successors: SMap<number, SMap<TokenType, number>>;
    private readonly startItem: Item;

    constructor(grammar: Grammar) {
        this.grammar = grammar;

        this.startItem = new Item(grammar.startRule, 0, new SSet(TokenType.END));

        this.configuratingSets = new SMap<ItemSet, number>();
        this.successors = new SMap<number, SMap<TokenType, number>>();
        this.generateConfiguratingSets();

        this.table = new ParsingTable(this.configuratingSets.size);
        this.generateParsingTable();
    }

    private generateConfiguratingSets() {
        console.log("Generating configurating sets...");

        const initialState: ItemSet = this.itemClosure(this.startItem);
        this.configuratingSets.add(initialState, 0);
        this.successors.add(0, new SMap<TokenType, number>());

        let edge: SSet<ItemSet> = new SSet(initialState);

        let updated = true;
        while (updated) {
            updated = false;

            const newEdge: SSet<ItemSet> = new SSet<ItemSet>();
            for (const configuratingSet of edge) {
                const state = this.configuratingSets.get(configuratingSet);
                for (const symbol of this.grammar.allSymbols) {
                    const successor = this.successor(configuratingSet, symbol);
                    if (successor.size == 0) continue;

                    if (this.addConfiguratingState(state, symbol, successor)) {
                        updated = true;
                        newEdge.add(successor);
                    }
                }
            }

            edge = newEdge;
        }
    }

    private addConfiguratingState(state: number, symbol: TokenType, successor: ItemSet): boolean {
        if (!this.configuratingSets.has(successor)) {
            const newState = this.configuratingSets.size;
            this.successors.add(newState, new SMap<TokenType, number>());
            this.configuratingSets.add(successor, newState);
            this.successors.get(state).add(symbol, newState);
            console.log(`Found ${this.configuratingSets.size}th configurating set (${successor.size} items)`);
            return true;
        }
        this.successors.get(state).add(symbol, this.configuratingSets.get(successor));
        return false;
    }


    private memoization: SMap<Item, ItemSet> = new SMap<Item, ItemSet>();

    private itemClosure(item: Item): ItemSet {
        if (this.memoization.has(item)) return this.memoization.get(item);

        const res = new ItemSet(item);

        if (item.isFinished) return res;

        let edge = new ItemSet(...res);

        let updated = true;
        while (updated) {
            updated = false;

            let newEdge = new ItemSet();

            for (const itm of edge) {

                if (itm.isFinished || !this.grammar.isNonTerminal(itm.next)) continue;

                const rest = itm.rule.rhs.substr(itm.pos + 1);

                for (const r of this.grammar.startsWith.get(itm.next)) {

                    for (const lookahead of itm.lookahead) {
                        const newItem = new Item(r, 0, new SSet<TokenType>(...this.grammar.getFirstSet(rest.concatSymbol(lookahead))));

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

    private itemSetClosure(itemSet: ItemSet): ItemSet {
        const res: ItemSet = new ItemSet(...itemSet);
        [...itemSet].forEach(item => res.addAll(...this.itemClosure(item)));
        return res;
    }

    private successor(itemSet: ItemSet, symbol: TokenType): ItemSet {
        const res: ItemSet = new ItemSet();

        for (const item of itemSet) {
            if (!item.isFinished && item.next == symbol) {
                res.add(item.shift());
            }
        }
        return this.itemSetClosure(res);
    }

    private generateParsingTable() {
        console.log("Generating parsing table entries...");

        let i = 0;
        for (const [itemSet, state] of this.configuratingSets) {
            this.generateActionSetEntries(state, itemSet);
            this.generateGotoSetEntries(state);
        }
    }

    private generateActionSetEntries(state: number, itemSet: ItemSet) {
        for (const item of itemSet) {
            if (item.isFinished && item.rule == this.grammar.startRule) {
                this.table.setActionAccept(state, TokenType.END);
            } else if (item.isFinished) {
                this.generateReductions(state, item);
            } else {
                this.generateShifts(state, item);
            }
        }
    }

    private generateReductions(state: number, item: Item) {
        for (const symbol of item.lookahead) {
            this.table.setActionReduce(state, symbol, item.rule);
        }
    }

    private generateShifts(state: number, item: Item) {
        const nextState = this.successors.get(state).get(item.next);
        if (nextState === undefined) return;
        this.table.setActionShift(state, item.next, nextState);
    }

    private generateGotoSetEntries(state: number) {
        for (const symbol of this.grammar.nonTerminals) {
            const nextState = this.successors.get(state).get(symbol);
            if (nextState === undefined) continue;
            this.table.setGoto(state, symbol, nextState);
        }
    }
}

class Parser {
    private readonly table: ParsingTable;
    public readonly Parse: { new(): { accept(token: Token, log?: boolean): void; readonly result: AST; readonly isFinished: boolean } };

    constructor(table: ParsingTable) {
        this.table = table;
        const _this = this;
        this.Parse = class {
            private readonly stateStack = [0];
            private readonly nodeStack: AST[] = [];
            private readonly parsingTable: ParsingTable;
            private finished = false;

            public accept(token: Token, log: boolean = false) {
                const state = this.stateStack[this.stateStack.length - 1];
                const entry = _this.table.getAction(state, token.symbol);

                if (entry === undefined) throw new Error("Could not find entry for state " + state + " on symbol " + token);

                if (entry instanceof TableEntry.Shift) {
                    this.stateStack.push(entry.nextState);
                    this.nodeStack.push(new AST.Leaf(token.symbol, token));
                    if (log) console.log(`Shift on ${token}`);
                } else if (entry instanceof TableEntry.Accept) {
                    this.finished = true;
                    if (log) console.log(`Accept on ${token}`);
                } else if (entry instanceof TableEntry.Reduce) {
                    const {rule, rule: {lhs, length}} = entry;

                    for (let j = 0; j < length; j++) this.stateStack.pop();
                    this.stateStack.push(table.getGoto(this.stateStack[this.stateStack.length - 1], lhs));

                    if (length != 1) {
                        const children: AST[] = new Array(length);
                        for (let j = length; j-- > 0;) children[j] = this.nodeStack.pop();
                        this.nodeStack.push(rule.process(new AST.Node(lhs, ...children)));

                        if (log) console.log(`Reduce ${lhs} := ${children.map(i => i.description).join(" ")} on ${token}`);
                    }

                    this.accept(token, log);
                }
            }

            public get isFinished() {
                return this.finished;
            }

            public get result() {
                if (!this.isFinished) throw new Error("Cannot access result before finished parsing");
                return this.nodeStack[0];
            }
        }
    }

    public parse(tokens: Token[], log: boolean = false) {
        const parse = new this.Parse();
        tokens.forEach(token => parse.accept(token, log));
        return parse.result;
    }

    public static new([str]: [string]) {
        const rules: ParseRule[] = [];
        let startSymbol: TokenType;

        str.split(/\s*\n\s*/g).filter(i => i !== "" && !i.startsWith("//")).map(i => {
            const regex1 = /^(\S+) := (\S+( \S+)*)/;
            const regex2 = /^start (\S+)$/;
            const regex3 = /^nullable (\S+)$/;
            const regex4 = /^flatten (\d+) (\d+) rule (\S+)$/;
            if (i.match(regex1) !== null) {
                const [, _lhs, _rhs] = i.match(regex1);
                const lhs = TokenType.get(_lhs), rhs = _rhs.split(" ").map(j => TokenType.get(j));
                rules.push(new ParseRule(lhs, new SymbolString(...rhs)))
            } else if (i.match(regex2) !== null) {
                const [, lhs] = i.match(regex2);
                startSymbol = TokenType.get(lhs);
            } else if (i.match(regex3) !== null) {
                const [, _lhs] = i.match(regex3);
                const lhs = TokenType.get(_lhs);
                rules.push(new ParseRule(lhs, new SymbolString()));
            } else if (i.match(regex4) !== null) {
                const [, i1, i2, _lhs] = i.match(regex4);
                const lhs = TokenType.get(_lhs);
                rules.push(new ParseRule(lhs, new SymbolString(), (n:AST)=>{
                    return new AST.Node(lhs, n.children[+i1], ...n.children[+i2].children);
                }));
            } else throw new Error("Error in Parser specification");
        })

        const grammar = new Grammar(startSymbol, ...rules);
        const table = new ParseTableBuilder(grammar).table;
        return new Parser(table);
    }
}