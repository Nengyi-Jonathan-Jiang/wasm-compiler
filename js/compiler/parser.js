class ParseRule{
    /**
     * @param {TokenType} lhs
     * @param {SymbolString} rhs
     */
    constructor(lhs, rhs){
        this.lhs = lhs;
        this.rhs = rhs;
    }

    get length(){ return this.rhs.length }
    get empty(){ return this.length === 0 }

    toString(){ return `${this.lhs} := ${this.rhs}` }
}

/** @template T */
class SSet{
    constructor(){
      /** @type {SMap<T, T>} */
      this.map = new SMap();
    }

    /** @param {T} value */
    add(value){
        this.map.add(value, value)
    }

    /**
     * @param {T} value
     * @return {boolean}
     */
    has(value){
        return this.map.has(value);
    }
}

/** @template T, U */
class SMap{
  constructor(){
    this.set = Object.create(null);
  }

  /**
   * @param {T} key
   * @param {U} value
   */
  add(key, value){
    this.set["_" + value] = value;
  }

  /**
   * @param {T} key
   * @return {boolean}
   */
  has(key){
    return ("_" + key) in this.set;
  }

  /**
   * @param {T} key
   * @return {U}
   */
  get(key){
    return this.set["_" + key];
  }
}

class Grammar{
    /**
     * @param {TokenType} startSymbol
     * @param {ParseRule} rules
     */
    constructor(startSymbol, ...rules){
        this.rules = rules;

        /** @type {SSet<TokenType>} */
        this.allSymbols = new SSet();
        /** @type {SSet<TokenType>} */
        this.nonTerminals = new SSet();
        /** @type {SSet<TokenType>} */
        this.terminals = new SSet();
        /** @type {SSet<TokenType>} */
        this.nullable = new SSet();
        /** @type {SMap<TokenType, SSet<String>>} */
        this.firstSets = new SMap();
        /** @type {SMap<TokenType, SSet<String>>} */
        this.followSets = new SMap();

        this.allSymbols.add(TokenType.END);
        this.nonTerminals.add(TokenType.END);

        for(const rule of rules){
          
        }
    }
}
