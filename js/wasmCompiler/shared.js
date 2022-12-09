class TokenType{
    /** @param {String} name @param {RegExp} pattern */
    constructor(name, pattern) {
        this.name = name;
        this.pattern = pattern;
    }

    toString(){
        return this.name;
    }
}

class Token{
    /** @param {TokenType} symbol @param {String} value */
    constructor(symbol, value){
        this.symbol = symbol;
        this.value = value;
    }

    toString(){
        return `${this.symbol}<${this.value}>`
    }
}