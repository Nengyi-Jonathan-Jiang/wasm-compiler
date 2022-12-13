/** @param {AST} ast*/
function getTokens(ast){
    return ast instanceof AST.Node ? [].concat(...ast.children.map(getTokens)) : [ast.value];
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
        switch(node.description){
            default:
                if(node instanceof AST.Node)
                    node.children.forEach(traverse);
        }
    })(ast);

    let res = originalText;

    for(let tk of [...tokens].reverse()){
        if(tk.symbol === TokenType.END) continue;
        let {start, end} = tk;
        //console.log(start, end, tk);
        res = `${res.substring(0, start)}${"\0"}span class="${m.get(tk) || "unknown"}"${"\1"}${res.substring(start, end)}${"\0"}/span${"\1"}${res.substring(end)}`;
    }

    targetDiv.innerHTML = res
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
            case "number-literal":
            case "integer-literal":
                m.set(token, "number-literal");
                break;

            case "string-literal":
            case "char-literal":
                m.set(token, "string-literal");
                break;

            case "if": case "else":
            case "test": case "switch": case "case": case "default":
            case "do": case "while": case "for":
                m.set(token, "control-keyword");
                break;
            case "print":
            case "decl": case "var": case "func": case "class":
            case "return":
            case "break": case "continue":
            case "goto":
                m.set(token, "keyword");
                break;
            case ">>=": case "<<=": case "+=":
            case "*=":  case "-=":  case "/=":
            case "%=":  case "==":  case "&&":
            case "||":  case "^^":  case "++":
            case "--":  case "<=":  case ">=":
            case "!=":  case "<<":  case ">>":
            case "<-":  case "!":   case "=":
            case "<":   case ">":   case "+":
            case "-":   case "*":   case "/":
            case "%":   case "?":   case ":":
            case "|":   case "&":   case "^":
                m.set(token, "operator");
                break;
            default:
                m.set(token, "unknown");
        }
    }
    return m;
}

/**
 * @param {Token[]} tokens
 * @param {string} originalText
 * @param {HTMLDivElement} targetDiv
 */
function highlightBasic(tokens, originalText, targetDiv){
    let m = basicMap(tokens);
    let res = originalText;

    for(let tk of [...tokens].reverse()){
        if(tk.symbol === TokenType.END) continue;
        let {start, end} = tk;
        res = `${res.substring(0, start)}${"\0"}span class="${m.get(tk) || "unknown"}"${"\1"}${res.substring(start, end)}${"\0"}span${"\1"}${res.substring(end)}`;
    }

    targetDiv.innerHTML = res
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replaceAll("\0","<")
        .replaceAll("\1",">")
    ;
}