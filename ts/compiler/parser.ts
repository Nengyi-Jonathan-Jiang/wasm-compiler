class ParseRule {
    public readonly lhs: TokenType;
    public readonly rhs: SymbolString;

    constructor(lhs: TokenType, rhs: SymbolString) {
        this.lhs = lhs;
        this.rhs = rhs;
    }

    public get length() {
        return this.rhs.length
    }

    public get isEmpty() {
        return this.length === 0
    }

    public toString() {
        return `${this.lhs} := ${this.rhs}`
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

        [...this.allSymbols].filter(i => !this.nonTerminals.has(i)).forEach(i => this.terminals.add(i));

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

    public getFirstSet(string: SymbolString) {
        if (string.length === 0) return new SSet(TokenType.EPSILON);
        const res = new SSet(...this.firstSets.get(string.get(0)));
        if (this.nullableSymbols.has(string.get(0))) res.addAll(...this.getFirstSet(string.substr(1)));
        return res;
    }

    public getFollowSet(string: SymbolString) {
        if (string.length === 0) return new SSet(TokenType.EPSILON);
        const res = new SSet(...this.firstSets.get(string.get(-1)));
        if (this.nullableSymbols.has(string.get(-1))) res.addAll(...this.getFirstSet(string.substr(0, -1)));
        return res;
    }

    public isNullable(string: SymbolString) {
        for (const symbol of string)
            if (!this.nullableSymbols.has(symbol))
                return false;
        return true;
    }

    public toString() {
        return this.rules.join("\n");
    }

    public logSelf() {
        console.log(`Grammar\n====RULES=====\n${
            this.rules.join("\n")
        }\n===NULLABLE===\n${
            this.nullableSymbols
        }\n====FIRST=====\n${
            this.firstSets
        }\n====FOLLOW====\n${
            this.followSets
        }`)
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
    private readonly str: string;

    constructor(rule: ParseRule, pos: number, lookahead: SSet<TokenType>) {
        this.rule = rule;
        this.pos = pos;
        this.lookahead = lookahead;

        this.str = `${rule.lhs} := ${rule.rhs.symbols.map((s, i) => (i == pos ? " ● " : " ") + s).join("")}${pos == rule.length ? " ● " : " "} ?= ${[...lookahead].join(" / ")}`;
    }

    public get isFinished() {
        return this.pos >= this.rule.length;
    }

    toString() {
        return this.str
    }

    public get next() {
        return this.isFinished ? null : this.rule.rhs.get(this.pos);
    }

    public shift() {
        return new Item(this.rule, this.pos + 1, this.lookahead);
    }

    public static merge(s1: Item, s2: Item) {
        return new Item(s1.rule, s1.pos, new SSet<TokenType>(...s1.lookahead, ...s2.lookahead));
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
        if(this.dirty) this.updateRepr();
        return this.str;
    }

    private stringify(item: Item){
        return item.rule + "@" + item.pos;
    }

    public add(value: Item) {
        if (this.has(value)){
            const s1 = this.get(value), s2 = value;
            if(s1.toString() == s2.toString()) return false;
            this.map.set(this.stringify(s1), Item.merge(s1, s2));
            return true;
        }
        this.map.set(this.stringify(value), value);
        this.dirty = true;
        return true;
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

    public [Symbol.iterator] = (): Iterator<Item> => transformIterator(this.map.entries(), ([, value]) => value)
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

        console.log(this.configuratingSets.toString());

        this.table = new ParsingTable(this.configuratingSets.size);
        this.generateParsingTable();
    }

    private generateConfiguratingSets() {
        console.log("Generating configurating sets...");

        const initialState: ItemSet = this.itemClosure(this.startItem);
        console.log("Initial state: " + initialState);
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
                        console.log("Successor of " + configuratingSet + " on " + symbol + " is " + successor);
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

        console.log("Computing closure of: " + item);

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
                            console.log("    added item: " + newItem + "\n        from " + itm);
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
            this.generateGotoSetEntries(state, itemSet);

            console.log(`Generated parsing table entries for ${++i} states (currently on state ${state})`);
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

    private generateGotoSetEntries(state: number, itemSet: ItemSet) {
        for (const symbol of this.grammar.nonTerminals) {
            const nextState = this.successors.get(state).get(symbol);
            if (nextState === undefined) continue;
            this.table.setGoto(state, symbol, nextState);
        }
    }
}

class Parser {
    private readonly table: ParsingTable;
    public readonly Parse: { new(): { accept(token: Token): void; readonly result: AST; readonly isFinished: boolean } };

    constructor(table: ParsingTable) {
        this.table = table;
        const _this = this;
        this.Parse = class {
            private readonly stateStack = [0];
            private readonly nodeStack: AST[] = [];
            private readonly parsingTable: ParsingTable;
            private finished = false;

            public accept(token: Token) {
                const state = this.stateStack[this.stateStack.length - 1];
                const entry = _this.table.getAction(state, token.symbol);

                if (entry === undefined) throw new Error("Parse error: Unknown error");

                if (entry instanceof TableEntry.Shift) {
                    console.log("shift on " + token);
                    this.stateStack.push(entry.nextState);
                    this.nodeStack.push(new AST.Leaf(token.symbol, token));
                } else if (entry instanceof TableEntry.Accept) {
                    console.log("accept on " + token);
                    this.finished = true;
                } else if (entry instanceof TableEntry.Reduce) {
                    const {rule, rule: {lhs, length}} = entry;

                    console.log(`reduce by ${rule} on ${token}`);

                    for (let j = 0; j < length; j++) this.stateStack.pop();
                    this.stateStack.push(table.getGoto(this.stateStack[this.stateStack.length - 1], lhs));

                    if (length != 1) {
                        const children: AST[] = new Array(length);
                        for (let j = length; j-- > 0;) children[j] = this.nodeStack.pop();
                        this.nodeStack.push(new AST.Node(lhs, ...children));
                    }

                    this.accept(token);
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

    public parse(tokens: Token[]) {
        const parse = new this.Parse();
        tokens.forEach(token => parse.accept(token));
        return parse.result;
    }

    public static new([str]: [string]) {
        const rules: ParseRule[] = [];
        let startSymbol: TokenType;

        str.split(/\s*\n\s*/g).filter(i => i !== "" && !i.startsWith("//")).map(i => {
            const regex1 = /^(\S+) := (\S+( \S+)*)/;
            const regex2 = /^start (\S+)$/;
            const regex3 = /^nullable (\S+)$/;
            if (i.match(regex1) !== null) {
                const [, _lhs, _rhs] = i.match(regex1);
                const lhs = TokenType.create(_lhs), rhs = _rhs.split(" ").map(j => TokenType.create(j));
                rules.push(new ParseRule(lhs, new SymbolString(...rhs)))
            } else if (i.match(regex2) !== null) {
                const [, lhs] = i.match(regex2);
                startSymbol = TokenType.create(lhs);
            } else if (i.match(regex3) !== null) {
                const [, _lhs] = i.match(regex3);
                const lhs = TokenType.create(_lhs);
                rules.push(new ParseRule(lhs, new SymbolString()));
            } else throw new Error("Error in Parser specification");
        })

        const grammar = new Grammar(startSymbol, ...rules);
        grammar.logSelf();
        const table = new ParseTableBuilder(grammar).table;
        return new Parser(table);
    }
}