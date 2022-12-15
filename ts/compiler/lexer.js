class Lexer {
    static new([str]) {
        const symbols = [], ignoredSymbols = [];
        function sanitize(s) {
            return s.replace(/[\\.,?{}[\]()^$+*|\/]/g, "\\$&");
        }
        str.split(/\s*\n\s*/g).filter(i => i !== "" && !i.startsWith("//")).map(i => {
            const regex1 = /^([0-9A-Za-z\-]+) := \/(([^\\\/]|\\.)*)\/$/;
            const regex2 = /^ignore (\S+)$/;
            const regex3 = /^basic (\S+)$/;
            if (i.match(regex1) !== null) {
                const [, name, pattern] = i.match(regex1);
                symbols.push(TokenType.create(name, new RegExp(`^(${pattern})`, "gs")));
            }
            else if (i.match(regex2) !== null) {
                const [, name] = i.match(regex2);
                ignoredSymbols.push(name);
            }
            else if (i.match(regex3) !== null) {
                const [, name] = i.match(regex3);
                symbols.push(TokenType.create(name, new RegExp(`^(${sanitize(name)})`, "gs")));
            }
            else
                throw new Error("Error in Lexer specification");
        });
        return new Lexer(symbols, ignoredSymbols);
    }
    constructor(symbols, ignoredSymbols = []) {
        this.symbols = symbols;
        this.ignoredSymbols = new Set(ignoredSymbols);
    }
    lex(input) {
        const tokens = [];
        for (let i = 0; i < input.length;) {
            if (input.charAt(i).match(/\s/)) {
                i++;
                continue;
            }
            let token = null;
            let rest = input.slice(i);
            for (const symbol of this.symbols) {
                const { pattern } = symbol;
                const [text] = rest.match(pattern) || [null];
                if (text !== null) {
                    token = new Token(symbol, text, i, i += text.length);
                    break;
                }
            }
            if (token === null) {
                token = new Token(TokenType.UNKNOWN, input.charAt(i), i, ++i);
            }
            if (!this.ignoredSymbols.has(token.symbol.name))
                tokens.push(token);
        }
        tokens.push(new Token(TokenType.END, "", -1, -1));
        return tokens;
    }
}
//# sourceMappingURL=lexer.js.map