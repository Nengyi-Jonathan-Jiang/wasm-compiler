class Lexer {
    static new([str]:[string]){
        const symbols: TokenType[] = [], ignoredSymbols: string[] = [];

        function sanitize(s:string){
            return s.replace(/[\\.,?{}[\]()^$+*|\/]/g, "\\$&");
        }

        str.split(/\s*\n\s*/g).filter(i => i !== "" && !i.startsWith("//")).map(i => {
            const regex1 = /^([0-9A-Za-z\-]+) := \/(([^\\\/]|\\.)*)\/$/;
            const regex2 = /^ignore (\S+)$/;
            const regex3 = /^basic (\S+)$/;
            if(i.match(regex1) !== null){
                const [, name, pattern] = i.match(regex1);
                symbols.push(TokenType.create(name, new RegExp(`^${pattern}`, "gs")));
            }
            else if(i.match(regex2) !== null){
                const [, name] = i.match(regex2);
                ignoredSymbols.push(name);
            }
            else if(i.match(regex3) !== null){
                const [, name] = i.match(regex3);
                symbols.push(TokenType.create(name, new RegExp(`^${sanitize(name)}`, "gs")));
            }
            else throw new Error("Error in Lexer specification");
        })

        return new Lexer(symbols, ignoredSymbols);
    }

    private readonly symbols : TokenType[];
    private readonly ignoredSymbols : Set<string>;

    constructor(symbols: TokenType[], ignoredSymbols: string[]=[]){
		this.symbols = symbols;
		this.ignoredSymbols = new Set(ignoredSymbols);
	}

    lex(input:string) {
        const tokens:Token[] = [];
        for (let i = 0; i < input.length;) {
            // If the character is a space, skip it
            if(input.charAt(i).match(/\s/)){
                i++;
                continue;
            }

            let token:Token = null;

            let rest = input.slice(i);
            // Find the next token that corresponds to the input
            for (const symbol of this.symbols) {
                const {pattern} = symbol;
                const [text] = rest.match(pattern) || [null];
                if (text !== null) {
                    token = new Token(symbol, text, i, i += text.length);
                    break;
                }
            }
            if(token === null) throw new Error("Error while lexing input: invalid token");

            // Add the token to the list
            if(!this.ignoredSymbols.has(token.symbol.name)) tokens.push(token);
        }

        tokens.push(new Token(TokenType.END, "", -1, -1));

        return tokens;
    }
}
