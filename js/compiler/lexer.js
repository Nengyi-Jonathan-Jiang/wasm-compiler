class Lexer {
    /** @param {string} str @returns {Lexer} */
    static new([str]){
        const symbols = [], ignoredSymbols = [];

        function sanitize(s){
            return s.replace(/[\\.,?{}[\]()^$\+*|\/]/g, "\\$&");
        }

        str.split("\n").filter(i => i != "" && !i.startsWith("//")).map(i => i.trim()).map(i => {    
            const regex1 = /^([0-9A-Za-z\-]+) := \/(([^\\\/]|\\.)*)\/$/;
            const regex2 = /^ignore (([^:].|:[^=]).+|.{1,2})$/;
            const regex3 = /^basic (([^:].|:[^=]).+|.{1,2})$/;
            if(i.match(regex1) !== null){
                const [, name, pattern] = i.match(regex1);
                symbols.push(new TokenType(name, new RegExp(`^${pattern}`, "g")));
            }
            else if(i.match(regex2) !== null){
                const [, name] = i.match(regex2);
                ignoredSymbols.push(name);
            }
            else if(i.match(regex3) !== null){
                const [, name] = i.match(regex3);
                symbols.push(new TokenType(name, new RegExp(`^${sanitize(name)}`, "g")));
            }
            else throw new Error("Error in Lexer specification");
        })

        return new Lexer(symbols, ignoredSymbols);
    }

    /**
     * 
     * @param {TokenType[]} symbols 
     * @param {String[]} ignoredSymbols 
     */
    constructor(symbols, ignoredSymbols=[]){
		this.symbols = symbols;
		this.ignoredSymbols = new Set(ignoredSymbols);
	}

    /** @param {string} input @returns {Token[]} */
    tokenize(input) {
        /** @type {Token[]} */
        const tokens = [];
        for (let i = 0; i < input.length;) {
            // If the character is a space, skip it
            if(input.charAt(i).match(/\s/)){
                i++;
                continue;
            }

            /** @type {Token} */
            let token = null;

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
            tokens.push(token);
            console.log(token.toString());
        }

        return tokens.filter(({symbol: {name}}) => !this.ignoredSymbols.has(name));
    }
}