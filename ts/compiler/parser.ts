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
    private readonly allSymbols: SSet<TokenType>;
    private readonly nonTerminals: SSet<TokenType>;
    private readonly terminals: SSet<TokenType>;
    private readonly nullableSymbols: SSet<TokenType>;

    private readonly firstSets: SMap<TokenType, SSet<TokenType>>;
    private readonly followSets: SMap<TokenType, SSet<TokenType>>;

    private readonly startsWith: SMap<TokenType, ParseRule[]>;

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
                        updated ||= this.followSets.get(symbol).addAll(aux);
                    }
                    if (this.nullableSymbols.has(symbol)) {
                        aux = new SSet<TokenType>(...aux);
                        aux.addAll(this.firstSets.get(symbol));
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
        if (this.nullableSymbols.has(string.get(0))) res.addAll(this.getFirstSet(string.substr(1)));
        return res;
    }

    public getFollowSet(string: SymbolString) {
        if (string.length === 0) return new SSet(TokenType.EPSILON);
        const res = new SSet(...this.firstSets.get(string.get(-1)));
        if (this.nullableSymbols.has(string.get(-1))) res.addAll(this.getFirstSet(string.substr(0, -1)));
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
        public readonly reduceRule: ParseRule;

        constructor(reduceRule: ParseRule) {
            super();
            this.reduceRule = reduceRule;
        }
    }

    public static Accept = class Accept extends TableEntry {}
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

class Item{
    public readonly rule : ParseRule;
    public readonly pos: number;
    public readonly lookahead: SSet<TokenType>;
    private readonly str:string;

    constructor(rule: ParseRule, pos:number, lookahead: SSet<TokenType>){
        this.rule = rule;
        this.pos = pos;
        this.lookahead = lookahead;

        this.str = `${rule.lhs} := ${rule.rhs.symbols.map((s, i) => (i == pos ? " ● " : " ") + s)}${pos == rule.length ? " ● " : " "}\t\t${[...lookahead].join(" / ")}`;
    }

    public get isFinished(){
        return this.pos >= this.rule.length;
    }

    public get next(){
        return this.isFinished ? null : this.rule.rhs.get(this.pos);
    }

    public shift(){
        return new Item(this.rule, this.pos + 1, this.lookahead);
    }
}


class ItemSet extends SSet<Item> {
    private readonly str: string;
    constructor(...items:Item[]){
        super(...items);
        this.str = `{\n\t${items.join("\n\t")}\n}`
    }

    public toString(){
        return this.str;
    }
}

class ParseTableBuilder{
    private readonly grammar: Grammar;
    private table: ParsingTable;
    private configuratingSets: SMap<ItemSet, number>;
    private successors: SMap<number, SMap<Symbol, number>>;

    constructor(grammar: Grammar) {
        this.grammar = grammar;

        this.generateConfiguratingSets();
        this.generateParsingTable();
    }

    private generateConfiguratingSets(){

    }

    private generateParsingTable(){
        this.table = new ParsingTable(this.configuratingSets.size);
        let i = 0;
        for(const [itemSet, state] of this.configuratingSets){

        }
    }
}

class Parser {
    private readonly table: ParsingTable;

    constructor(table:ParsingTable) {
        this.table = table;
    }


}