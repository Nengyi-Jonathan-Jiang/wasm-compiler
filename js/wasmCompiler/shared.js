class Symbol{
    constructor(name, pattern) {
        this.name = name;
        this.pattern = pattern;
    }
}

class Token{
    constructor(symbol, value){
        this.symbol = symbol;
        this.value = value;
    }
}