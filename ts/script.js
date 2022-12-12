// window.lexer = Lexer.new`
// //Comments
// comment := /\\/\\/[^\\n]*/
// multi-line-comment := /^\\/\\*.*\\*\\//
//
// //declaration keywords
// basic var
// basic param
// basic func
// basic operator
// basic class
// basic const
// basic module
// basic import
//
// //control keywords
// basic while
// basic for
// basic if
// basic else
// basic test
// basic break
// basic continue
//
// //access modifiers
// basic public
// basic private
// basic protected
// basic static
//
// //memory keywords
// basic ptr
// basic ref
// basic deref
// basic alloc
//
// //misc keywords
// basic print
// basic setpixel
// basic new
// basic this
//
// //comparison operators
// basic ==
// basic >=
// basic <=
// basic <
// basic >
// basic !=
//
// //assignment operators
// basic =
// basic +=
// basic ++
// basic -=
// basic --
// basic *=
// basic /=
// basic %=
// basic &=
// basic |=
// basic ^=
// basic >>=
// basic <<=
// basic <<<
// basic >>>
//
//
// //boolean and bitwise operators
// basic !&
// basic !|
// basic !^
// basic !
// basic &
// basic |
// basic ^
// basic <<
// basic >>
//
// //arithmetic operators
// basic +
// basic -
// basic *
// basic /
// basic %
//
// //memory operators
// basic @
// basic #
//
// //grouping symbols
// basic (
// basic )
// basic [
// basic ]
// basic {
// basic }
//
//
// //punctuation
// basic .
// basic ,
// basic ;
// basic ->
// basic ::
// basic :
//
// symbol := /[$A-Za-z_][$0-9A-Za-z_]*/
//
// //literals
// char-literal := /'[^\\\\]|\\\\.'/
// string-literal := /"([^\\\\]|\\\\.)*"/
// number-literal := /[1-9]\\d*\\.\\d*|0?\\.\\d*/
// integer-literal := /[1-9]\\d*|0/
//
// //ignored tokens
// ignore comment
// ignore multi-line-comment
// `
// function start() {
//     window.parser = Parser.new`
//         start statements
//
//         nullable statements
//         statements := statement statements
//
//         statement := ;
//     `;
// }

window.lexer = Lexer.new`
basic a
basic b
`
function start() {
    window.parser = Parser.new`
        // start S
        // S := X X
        // X := a X
        // X := b

        start ss
        nullable ss
        ss := s ss
        s := a
    `;
}