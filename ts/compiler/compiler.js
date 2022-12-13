const lexer = Lexer.new`
    //Comments
    comment := /\\/\\/[^\\n]*/
    multi-line-comment := /^\\/\\*.*\\*\\//

    //literals
    char-literal := /'[^\\\\]|\\\\.'/
    string-literal := /"([^\\\\]|\\\\.)*"/
    number-literal := /([1-9]\\d*|0)\\.\\d*|\\.\\d+/
    integer-literal := /[1-9]\\d*|0/

    //declaration keywords
    basic decl
    basic var
    basic param
    basic func
    basic operator
    basic class
    basic const
    basic module
    basic import

    //control keywords
    basic while
    basic for
    basic if
    basic else
    basic test
    basic break
    basic continue

    //access modifiers
    basic public
    basic private
    basic protected
    basic static

    //memory keywords
    basic ptr
    basic ref
    basic deref
    basic alloc

    //misc keywords
    basic print
    basic setpixel
    basic new
    basic this

    //comparison operators
    basic ==
    basic >=
    basic <=
    basic <
    basic >
    basic !=

    //assignment operators
    basic =
    basic +=
    basic ++
    basic -=
    basic --
    basic *=
    basic /=
    basic %=
    basic &=
    basic |=
    basic ^=
    basic >>=
    basic <<=
    basic <<<
    basic >>>


    //boolean and bitwise operators
    basic !&
    basic !|
    basic !^
    basic !
    basic &
    basic |
    basic ^
    basic <<
    basic >>

    //arithmetic operators
    basic +
    basic -
    basic *
    basic /
    basic %

    //memory operators
    basic @
    basic #

    //grouping symbols
    basic (
    basic )
    basic [
    basic ]
    basic {
    basic }


    //punctuation
    basic .
    basic ,
    basic ;
    basic ->
    basic ::
    basic :

    symbol := /[$A-Za-z_][$0-9A-Za-z_]*/

    //ignored tokens
    ignore comment
    ignore multi-line-comment
`

const parser = Parser.new`
    start declarations

    nullable declarations
    declarations := declaration declarations

    declaration := method-declaration
    declaration := variable-declaration
    declaration := ;

    method-declaration := decl func symbol { statements }
    variable-declaration := type var symbol ;

    type := symbol

    nullable statements
    statements := statement statements

    statement := print-statement
    print-statement := print expression ;

    expression := primary-expression
    expression := primary-expression + expression
    expression := primary-expression - expression

    primary-expression := value
    primary-expression := ( expression )

    value := number-literal
    value := integer-literal
    value := string-literal
    value := char-literal
`;

function compile(code){
    const tkns = lexer.lex(code);
    const ast = parser.parse(tkns);
    // const wasm = new Emitter().convert({});
    // return WebAssembly.instantiate(wasm);
    console.log(ast.toString());
    return ast;
}