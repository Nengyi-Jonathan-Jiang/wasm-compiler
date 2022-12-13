const container = document.getElementById('code-editor');
/** @type {HTMLTextAreaElement} */
const input = document.getElementById('input');
/** @type {HTMLDivElement} */
const output = document.getElementById('highlighted');

input.onscroll = _ => {
    output.scrollTop = input.scrollTop;
    output.scrollLeft = input.scrollLeft;
}

input.value=`
decl func main {
	print "Hello world";
}
`.trim().replaceAll("\t","    ");

input.oninput = input.onchange = _=>{
    let tokens = lexer.lex(input.value);
    try{
        let ast = parser.parse(tokens);
        container.style.setProperty("--status-color", "limegreen");
        highlight(ast, input.value, output);
    }
    catch(e){
        container.style.setProperty("--status-color", "red");
        output.innerHTML = input.value;
        highlightBasic(tokens, input.value, output);
        console.error(e);
    }
}

input.oninput(null);

input.onkeydown = e => {
    if(e.key === "Enter" && e.ctrlKey){
        let tokens = lexer.lex(input.value);
        let ast = parser.parse(tokens);

        console.log(ast.toString());

        e.preventDefault();
    }
    if(e.key === "/" && e.ctrlKey){
        let {value, selectionStart, selectionEnd, selectionDirection} = input;
        value = "\n" + value + "\n";
        selectionStart++;selectionEnd++;
        let prevNewLinePos = value.substring(0, selectionStart).lastIndexOf("\n");
        if(prevNewLinePos === -1) prevNewLinePos = 0;
        let nextNewLinePos = value.substring(selectionEnd).indexOf("\n") + selectionEnd;
        if(nextNewLinePos === -1) nextNewLinePos = value.length;
        let changes;
        let lines = value.substring(prevNewLinePos, nextNewLinePos).split("\n").slice(1);

        if(lines.map(i=>i.length===0||i.match(/^\s*\/\//)&&true).reduce((a,b)=>a&&b,true)){
            selectionStart -= lines[0].length !== 0 ? lines[0].match(/(?<=^\s*)\/\/ ?/)[0].length : 0;
            selectionEnd -= lines.map(i=>i.length?i.match(/(?<=^\s*)\/\/ ?/)[0].length:0).reduce((a,b) => a + b);
            changes = `\n${lines.map(i => i.replace(/^(\s*)\/\/ ?/, "$1")).join("\n")}`;
        }
        else {
            selectionStart += lines[0].length ? 3 : 0;
            selectionEnd += lines.map(i=>i.length?3:0).reduce((a,b)=>a+b);
            changes = "\n" + lines.map(i=>i.replace(/^(( {4})*)(.)/, "$1// $3")).join("\n");
        }
        value = `${value.substring(0, prevNewLinePos)}${changes}${value.substring(nextNewLinePos)}`;
        input.value = value.substring(1, value.length - 1);
        e.preventDefault();

        input.selectionStart = selectionStart - 1;
        input.selectionEnd = selectionEnd - 1;
        input.selectionDirection = selectionDirection;

        input.oninput(null);
    }

    if(e.code === "Tab"){
        let {value, selectionStart, selectionEnd, selectionDirection} = input;
        let prevNewLinePos = value.substring(0, selectionStart).lastIndexOf("\n");
        if(prevNewLinePos === -1) prevNewLinePos = 0;
        let nextNewLinePos = value.substring(selectionEnd).indexOf("\n") + selectionEnd;
        if(nextNewLinePos === -1) nextNewLinePos = value.length;
        let changes;
        if(selectionStart === selectionEnd){
            let before = value.substring(prevNewLinePos, selectionEnd);
            let after = value.substring(selectionEnd, nextNewLinePos);
            if(e.shiftKey === false){
                let padding_length = 4 - ((before.length + 3) % 4);
                changes = before + " ".repeat(padding_length) + after;
                selectionEnd += padding_length;
                selectionStart += padding_length;
            }
            else{
                let un_pad_length = (before.match(/^\n {0,4}/)[0] || "\n").length - 1;
                changes = before.replace(/^\n {0,4}/, "\n") + after;
                selectionEnd -= un_pad_length;
                selectionStart -= un_pad_length;
            }
        }
        else{
            let lines = value.substring(prevNewLinePos, nextNewLinePos).split("\n").slice(1);
            if(e.shiftKey === false){
                changes = "\n" + lines.map(i=>"    " + i).join("\n");
                selectionStart += 4;
                selectionEnd += lines.length * 4;
            }
            else{
                selectionEnd -= lines.map(line => (line.match(/^ {0,4}/)[0] || []).length).reduce((a,b) => a + b);
                selectionStart -= (lines[0].match(/^ {0,4}/)[0] || []).length;
                changes = `\n${lines.map(line => line.replace(/^ {0,4}/, "")).join("\n")}`;
            }
        }

        input.value = value.substring(0, prevNewLinePos) + changes + value.substring(nextNewLinePos);
        e.preventDefault();

        input.selectionStart = selectionStart;
        input.selectionEnd = selectionEnd;
        input.selectionDirection = selectionDirection;

        input.oninput(null);
    }
}