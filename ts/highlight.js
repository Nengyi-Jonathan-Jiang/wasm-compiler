/**
 * @param {AST} ast
 * @returns {Token[]}
 */
function getTokens(ast){
    return ast instanceof AST.Node ? [].concat(...ast.children.map(t => getTokens(t))) : [ast.token];
}

/**
 * @param {AST} ast
 * @param {string} originalText
 * @param {HTMLDivElement} targetDiv
 */
function highlight(ast, originalText, targetDiv){
    let tokens = getTokens(ast);
    /** @type {Map<Token,string>} */
    let m = basicMap(tokens);

    (/** @param {AST} node */function traverse(node){
        switch(node.description.name){
            case "function-call":
                m.set(node.children[0].token, "function");
                break;
            case "void-func-prototype":
                m.set(node.children[1].token, "function");
                break;
            case "func-prototype":
                m.set(node.children[0].token, "class");
                m.set(node.children[2].token, "function");
                break;
            case "param-declaration":
                m.set(node.children[2].token, "param");
            case "variable-declaration":
                m.set(node.children[0].token, "class");
                break;
        }

        if(node instanceof AST.Node) node.children.forEach(traverse);
    })(ast);

    hl(tokens, m, originalText, targetDiv);
}

/**
 * @param {Token[]} tokens
 * @param {string} originalText
 * @param {HTMLDivElement} targetDiv
 */
function highlightBasic(tokens, originalText, targetDiv){
    hl(tokens, basicMap(tokens), originalText, targetDiv);
}

/**
 * @param {Token[]} tkns
 * @param {Map<Token, string>} m
 * @param {string} text
 * @param {HTMLDivElement} target
 */
function hl(tkns, m, text, target){
    let res = text;

    for(let tk of [...tkns].reverse()){
        if(tk.symbol === TokenType.END) continue;
        let {start, end} = tk;
        res = `${res.substring(0, start)}${"\0"}span class="${m.get(tk) || "unknown"}"${"\1"}${res.substring(start, end)}${"\0"}/span${"\1"}${res.substring(end)}`;
    }

    target.innerHTML = res
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replaceAll("\0","<")
        .replaceAll("\1",">")
    ;
}

/** @param {Token[]} tokens */
function basicMap(tokens){
    /** @type {Map<Token,string>} */
    let m = new Map();
    for(let token of tokens){
        switch(token.symbol.name){
            case "__ERROR__":
                m.set(token, "lex-error");
                break;
            case "number-literal":
            case "integer-literal":
                m.set(token, "number-literal");
                break;

            case "string-literal":
            case "char-literal":
                m.set(token, "string-literal");
                break;

            case "symbol":
                m.set(token, "symbol");
                break;

            case "import": case "export":
            case "if": case "else":
            case "test": case "switch": case "case": case "default":
            case "do": case "while": case "for":
                m.set(token, "control-keyword");
                break;
            case "print":
            case "decl": case "var": case "func": case "class": case "param":
            case "return":
            case "break": case "continue":
            case "goto":
                m.set(token, "keyword");
                break;
            case ">>=": case "<<=": case "+=":
            case "*=":  case "-=":  case "/=":
            case "%=":  case "==":  case "!&":
            case "!|":  case "!^":  case "++":
            case "--":  case "<=":  case ">=":
            case "!=":  case "<<":  case ">>":
            case "<-":  case "!":   case "=":
            case "<":   case ">":   case "+":
            case "-":   case "*":   case "/":
            case "%":   case "?":   case ":":
            case "|":   case "&":   case "^":
            case "#":   case "@":
                m.set(token, "operator");
                break;
            default:
                m.set(token, "unknown");
        }
    }
    return m;
}