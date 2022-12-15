const lexer = Lexer.new`
    //Comments
    comment := /\\/\\/[^\\n]*/
    multi-line-comment := /^\\/\\*.*\\*\\//

    //literals
    char-literal := /'[^\\\\]|\\\\.'/
    string-literal := /"([^\\\\"]|\\\\.)*"/
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
        // value = ptr@field, value = @ptr
        basic @
        // ptr = #value
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
    declarations := declarations declaration

    declaration := method-declaration
    declaration := variable-declaration
    declaration := ;

    method-declaration := decl func symbol { statements }
    variable-declaration := type var symbol ;

    type := symbol

    nullable statements
    statements := statement statements

    statement := print-statement
    statement := expression ;
    statement := ;
    print-statement := print expression ;

    expression := assignment-expression

    assignment-expression := boolean-expression
    assignment-expression := boolean-expression = assignment-expression
    assignment-expression := boolean-expression += assignment-expression
    assignment-expression := boolean-expression -= assignment-expression
    assignment-expression := boolean-expression *= assignment-expression
    assignment-expression := boolean-expression /= assignment-expression
    assignment-expression := boolean-expression %= assignment-expression
    assignment-expression := boolean-expression &= assignment-expression
    assignment-expression := boolean-expression |= assignment-expression
    assignment-expression := boolean-expression ^= assignment-expression
    assignment-expression := boolean-expression >>= assignment-expression
    assignment-expression := boolean-expression <<= assignment-expression

    boolean-expression := equality-expression
    boolean-expression := boolean-expression & equality-expression
    boolean-expression := boolean-expression ^ equality-expression
    boolean-expression := boolean-expression | equality-expression
    boolean-expression := boolean-expression !& equality-expression
    boolean-expression := boolean-expression !^ equality-expression
    boolean-expression := boolean-expression !| equality-expression

    equality-operator := ==
    equality-operator := !=

    equality-expression := relational-expression
    equality-expression := relational-expression equality-operator relational-expression

    relational-operator := >
    relational-operator := <
    relational-operator := >=
    relational-operator := <=

    relational-expression := shift-expression
    relational-expression := shift-expression relational-operator shift-expression

    shift-operator := <<
    shift-operator := >>

    shift-expression := additive-expression
    shift-expression := shift-expression shift-operator additive-expression

    additive-operator := +
    additive-operator := -

    additive-expression := multiplicative-expression
    additive-expression := additive-expression additive-operator multiplicative-expression

    multiplicative-operator := *
    multiplicative-operator := /
    multiplicative-operator := %

    multiplicative-expression := prefix-expression
    multiplicative-expression := multiplicative-expression multiplicative-operator prefix-expression

    prefix-operator := ++
    prefix-operator := --
    prefix-operator := >>>
    prefix-operator := <<<
    prefix-operator := !
    prefix-operator := alloc
    prefix-operator := dealloc
    prefix-operator := #
    prefix-operator := @

    prefix-expression := postfix-expression
    prefix-expression := prefix-operator prefix-expression

    postfix-operator := ++
    postfix-operator := --
    postfix-operator := >>>
    postfix-operator := <<<

    postfix-expression := primary-expression
    postfix-expression := postfix-expression postfix-operator
    postfix-expression := function-call
    postfix-expression := subscript-call
    postfix-expression := member-access

    function-call := postfix-expression ( argument-list )
    subscript-call := postfix-expression [ argument-list ]

    member-access-operator := .
    member-access-operator := @

    member-access := postfix-expression member-access-operator symbol

    nullable argument-list

    primary-expression := value
    primary-expression := symbol
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
