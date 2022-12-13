var allowed_tokens = [
    //Comments
    ["COMMENT", /^\/\/[^\n]*/],
    ["MULTILINE_COMMENT", /^\/\*([^*]|\*(?!\/))*\*\//],

    //Symbols and operators
    ...`
			>>= <<= && || ^^ ++ -- += *= -= /= %= == <= >= != << >> <- :: ; ! = < > ( ) [ ] { } , . + - * / % ? :
			| & ^ \\$ # @ \\\\
		`.trim().split(/ |\n/g).map(i=>i.trim()).map(i => [i, new RegExp(`^(${i.replace(/\||\+|\*|\(|\)|\[|]|\.|\?|\^/g,"\\$&")})`)]),

    //Keywords
    ...[
        "const",

        "class", "func", "var",

        "break", "continue",
        "do", "while", "for",
        "if", "else",
        "switch", "test", "case", "default",

        "return",

        "goto",

        "public", "private", "protected",

        "static",

        "input",
        "output",

        "alloc",
        "dealloc",
    ].map(i=>[i.toUpperCase(), new RegExp(`^${i}\\b`)]),

    //Literals
    ["BOOL_CONST", /^(true|false)\b/],
    ["STRING_CONST", /^"([^\\"\n]|\\.|\\")*"/,s=>s.substring(1,s.length-1)],
    ["CHAR_CONST", /^'.'/,s=>s.substring(1,s.length-1)],
    //Identifiers
    ["IDENTIFIER", /^([a-zA-Z_][a-zA-Z0-9_]*)\b/],

    //Number literal
    ["NUMBER_CONST", /^(\d+\.\d*|\.\d+|[1-9]\d*|0)\b/],
    ["HEX_CONST", /^0x[0-9A-Fa-f]+\b/],
    ["OCTAL_CONST", /^0[0-7]+\b/],
    ["BINARY_CONST", /^0b[01]+\b/],
    ["UNKNOWN", /^./]
]

var tokenizer = new Tokenizer(
    allowed_tokens.map(i=>[i[0],{regex:i[1],func:i[2]||(s=>s)}]),
    ["COMMENT","MULTILINE_COMMENT"]
);

var grammar_s = `
__START__ := statements

statements := ε
statements := statement_list

statement_list := statement
statement_list := statement_list statement

statement := ;
statement := expression ;
statement := block_statements
statement := variable_decls
statement := function_decl
statement := output_statement
statement := input_statement
statement := while_loop
statement := do_while_loop
statement := for_loop
statement := if_statement
statement := else_statement
statement := test_statement
statement := switch_statement
statement := jump_statement
statement := dealloc_statement

primary_expression := ( expression )

primary_expression := NUMBER_CONST
primary_expression := HEX_CONST
primary_expression := BOOL_CONST

primary_expression := CHAR_CONST
primary_expression := STRING_CONST

primary_expression := IDENTIFIER

postfix_expression := primary_expression
postfix_expression := postfix_expression [ expression ]
postfix_expression := function_call
postfix_expression := postfix_expression . IDENTIFIER
postfix_expression := postfix_expression -> IDENTIFIER
postfix_expression := postfix_expression ++
postfix_expression := postfix_expression --

unary_expression := postfix_expression
unary_expression := unary_operator unary_expression

unary_operator := -
unary_operator := !
unary_operator := ~
unary_operator := *
unary_operator := &
unary_operator := ++
unary_operator := --

multiplicative_expression := unary_expression
multiplicative_expression := multiplicative_expression * unary_expression
multiplicative_expression := multiplicative_expression / unary_expression
multiplicative_expression := multiplicative_expression % unary_expression

additive_expression := multiplicative_expression
additive_expression := additive_expression + multiplicative_expression
additive_expression := additive_expression - multiplicative_expression

shift_expression := additive_expression
shift_expression := shift_expression << additive_expression
shift_expression := shift_expression >> additive_expression

relational_expression := shift_expression
relational_expression := relational_expression < shift_expression
relational_expression := relational_expression > shift_expression
relational_expression := relational_expression <= shift_expression
relational_expression := relational_expression >= shift_expression

equality_expression := relational_expression
equality_expression := equality_expression == relational_expression
equality_expression := equality_expression != relational_expression

binary_and_expression := equality_expression
binary_and_expression := binary_and_expression & equality_expression

binary_xor_expression := binary_and_expression
binary_xor_expression := binary_xor_expression ^ binary_and_expression
binary_or_expression := binary_xor_expression
binary_or_expression := binary_or_expression | binary_xor_expression

logical_and_expression := binary_or_expression
logical_and_expression := logical_and_expression && binary_or_expression

logical_xor_expression := logical_and_expression
logical_xor_expression := logical_xor_expression ^^ logical_and_expression

logical_or_expression := logical_xor_expression
logical_or_expression := logical_or_expression || logical_xor_expression

conditional_expression := logical_or_expression
conditional_expression := logical_or_expression ? expression : assignment_expression

assignment_expression := conditional_expression
assignment_expression := unary_expression assignment_operator assignment_expression

assignment_operator := <-
assignment_operator := *=
assignment_operator := /=
assignment_operator := %=
assignment_operator := +=
assignment_operator := -=
assignment_operator := <<=
assignment_operator := >>=
assignment_operator := &=
assignment_operator := ^=
assignment_operator := |=

expression_no_commas := assignment_expression
expression_no_commas := alloc_expr

expression := expression_no_commas
expression := expression , expression_no_commas

type := IDENTIFIER
type := IDENTIFIER :: type
type := type *
type := type &
type := type < template_params >

template_param := expression
template_param := type

template_params := template_param
template_params := template_params , template_param

variable_decls := type VAR variable_inits ;

variable_inits := variable_name_and_assign
variable_inits := variable_inits , variable_name_and_assign

variable_name_and_assign := IDENTIFIER
variable_name_and_assign := IDENTIFIER = expression

function_decl := type FUNC IDENTIFIER ( ) block_statements
function_decl := type FUNC IDENTIFIER ( func_args ) block_statements

single_variable_decl := type VAR IDENTIFIER

func_args := single_variable_decl
func_args := func_args , single_variable_decl

func_params := expression_no_commas
func_params := func_params , expression_no_commas

function_call_with_args := IDENTIFIER ( func_params )
function_call_no_args := IDENTIFIER ( )

function_call := function_call_with_args
function_call := function_call_no_args

do_while_loop := DO block_statements WHILE ( expression ) ;
while_loop := WHILE ( expression ) statement
for_loop := FOR ( for_loop_first for_loop_second ; for_loop_third ) statement

enhanced_for_loop := FOR ( type VAR IDENTIFIER : expression ) statement

for_loop_first := ;
for_loop_first := variable_decls
for_loop_second := ε
for_loop_second := expression
for_loop_third := ε
for_loop_third := expression

if_statement := IF ( expression ) statement
else_statement := ELSE statement

test_case_statement := CASE ( expression ) statement
test_case_statement := DEFAULT statement
test_case_statements := ε
test_case_statements := test_case_statements test_case_statement

test_statement := TEST ( expression ) { test_case_statements }

switch_case_statement := CASE expression : statements
switch_case_statements := ε
switch_case_statements := switch_case_statements switch_case_statement

switch_statement := SWITCH ( expression ) { switch_case_statements }

block_statements := { statements }

output_statement := OUTPUT io_thingy ;
input_statement := INPUT io_thingy ;
io_thingy := expression_no_commas
io_thingy := io_thingy , expression_no_commas

jump_statement := CONTINUE ;
jump_statement := BREAK ;
jump_statement := RETURN ;
jump_statement := RETURN expression ;
jump_statement := GOTO IDENTIFIER ;

class_statement := class { class_inner }
class_inner := ε
class_inner := class_inner class_inner_statement
class_inner_statement := variable_decls
class_inner_statement := function_decl

alloc_expr := ALLOC type [ expression ]
dealloc_statement := DEALLOC identifier
`;


var grammar = new Grammar(...grammar_s
    .trim()
    .split(/\n+/g)
    .filter(i=>i.length && !i.match(/^\/\//))
    .map(i=>i.split(':='))
    .map(
        i=>new ParseRule(
            i[0].trim(),
            ...(j=>j[0] == 'ε' ? [] : j)(i[1].trim().split(/ +/g))
        )
    )
)

var parser = new Parser(grammar);

{	//Testing
    /**@type {HTMLInputElement}*/
    let input = document.getElementById("input");
    let output = document.getElementById("highlighted");

    input.onscroll = /**@param e*/ e=>{
        output.scrollTop = input.scrollTop;
        output.scrollLeft = input.scrollLeft;
    }

    input.value=`
/*********************************
 * example YAPL (Yet Another Programming Language) program
 * Author: John Doe
 ********************************/

int func fibonacci(int var N){
	output "Running Fibonacci:\\n================\\n";
	int var a = 0, b = 1, c;
	for(int var i = 0; i < N; i++){
		c <- a + b;
		a <- b;
		b <- c;
		output "The " , i + 1 , " th Fibonacci number is " , c , "\\n";
	}
	output "================\\n";
	return c;
}

bool func fizzBuzz(int var N){
	output "Running FizzBuzz:\\n================\\n";
	for(int var i = 1; i <= N; i++){
		output i , ": " , i % 3 == 0 || i % 5 == 0 ? "Fizz" : "Buzz" , "\\n";
	}
	output "================\\n";
	return N % 3 == 0 || N % 5 == 0;
}

void func main(){
	string var command = "init";
	while(command != "quit"){
		output "Enter a command: \\"fizzBuzz\\" or \\"Fibonacci\\"\\n";
		input command;
		switch(command){
			case "fizzBuzz":
			case "FizzBuzz":
			case "fizzbuzz":
				int var N;
				input N;
				bool var result = fizzBuzz(N);
				output "Result: " , result , "\\n\\n";
				break;

			case "fibonacci":
			case "Fibonacci":
				int var N;
				input N;
				int var result = fibonacci(N);
				output "Result: " , result , "\\n\\n";
				break;

			case "multiply":
				int var N, M;
				input N , M;
				int var result = N * M;
				output "Result: " , result , "\\n\\n";
				break;
		}
	}
	output "You exited the program.";
}
	`.trim().replaceAll("\t","    ");
    input.oninput = input.onchange = _=>{
        let tokens = tokenizer.tokenize(input.value);
        try{
            let ast = parser.toAST(tokens);
            document.body.style.setProperty("background-color", "limegreen");
            highlight(ast, input.value, output);
        }
        catch{
            document.body.style.setProperty("background-color", "red");
            output.innerHTML = input.value;
            highlightBasic(tokens, input.value, output);
        }
    }
    input.oninput();
    //input.onkeypress =
    input.onkeydown = e => {
        if(e.code == "Backquote"){
            let tokens = tokenizer.tokenize(input.value);
            let ast = parser.toAST(tokens);

            console.log(ast.toString());

            evalAST(ast);

            e.preventDefault();
        }
        if(e.key == "/" && e.ctrlKey){

            let {value, selectionStart, selectionEnd, selectionDirection} = input;
            value = "\n" + value + "\n";
            selectionStart++;selectionEnd++;
            let prevNewLinePos = value.substring(0, selectionStart).lastIndexOf("\n");
            if(prevNewLinePos == -1) prevNewLinePos = 0;
            let nextNewLinePos = value.substring(selectionEnd).indexOf("\n") + selectionEnd;
            if(nextNewLinePos == -1) nextNewLinePos = value.length;
            let changes = "";
            let lines = value.substring(prevNewLinePos, nextNewLinePos).split("\n").slice(1);

            if(lines.map(i=>i.length==0||i.match(/^\s*\/\//)&&true).reduce((a,b)=>a&&b,true)){
                selectionStart -= lines[0].length ? lines[0].match(/(?<=^\s*)\/\/ ?/)[0].length : 0;
                selectionEnd -= lines.map(i=>i.length?i.match(/(?<=^\s*)\/\/ ?/)[0].length:0).reduce((a,b)=>a+b);
                changes = "\n" + lines.map(i=>i.replace(/^(\s*)\/\/ ?/, "$1")).join("\n");
            }
            else
            {
                selectionStart += lines[0].length ? 3 : 0;
                selectionEnd += lines.map(i=>i.length?3:0).reduce((a,b)=>a+b);
                changes = "\n" + lines.map(i=>i.replace(/^((    )*)(.)/, "$1// $3")).join("\n");
            }
            value = value.substring(0, prevNewLinePos) + changes + value.substring(nextNewLinePos);
            input.value = value.substring(1, value.length - 1);
            e.preventDefault();

            input.selectionStart = selectionStart - 1;
            input.selectionEnd = selectionEnd - 1;
            input.selectionDirection = selectionDirection;

            input.oninput();
        }
        if(e.code == "Tab"){
            let {value, selectionStart, selectionEnd, selectionDirection} = input;
            let prevNewLinePos = value.substring(0, selectionStart).lastIndexOf("\n");
            if(prevNewLinePos == -1) prevNewLinePos = 0;
            let nextNewLinePos = value.substring(selectionEnd).indexOf("\n") + selectionEnd;
            if(nextNewLinePos == -1) nextNewLinePos = value.length;
            let changes = "";
            if(selectionStart == selectionEnd){
                let before = value.substring(prevNewLinePos, selectionEnd);
                let after = value.substring(selectionEnd, nextNewLinePos);
                if(e.shiftKey == false){
                    let padding_length = 4 - ((before.length + 3) % 4);
                    changes = before + " ".repeat(padding_length) + after;
                    selectionEnd += padding_length;
                    selectionStart += padding_length;
                }
                else{
                    let unpad_length = (before.match(/^\n {0,4}/)[0] || "\n").length - 1;
                    changes = before.replace(/^\n {0,4}/, "\n") + after;
                    selectionEnd -= unpad_length;
                    selectionStart -= unpad_length;
                }
            }
            else{
                let lines = value.substring(prevNewLinePos, nextNewLinePos).split("\n").slice(1);
                if(e.shiftKey == false){
                    changes = "\n" + lines.map(i=>"    " + i).join("\n");
                    selectionStart += 4;
                    selectionEnd += lines.length * 4;
                }
                else{
                    selectionEnd -= lines.map(i=>(i.match(/^ {0,4}/)[0] || []).length).reduce((a,b)=>a+b);
                    selectionStart -= (lines[0].match(/^ {0,4}/)[0] || []).length;
                    changes = "\n" + lines.map(i=>i.replace(/^ {0,4}/,"")).join("\n");
                }
            }
            input.value = value.substring(0, prevNewLinePos) + changes + value.substring(nextNewLinePos);
            e.preventDefault();

            input.selectionStart = selectionStart;
            input.selectionEnd = selectionEnd;
            input.selectionDirection = selectionDirection;

            input.oninput();
        }
    }
}