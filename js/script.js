console.log("bruh");


const lexer = Lexer.new`
#declaration keywords
basic var
basic param
basic func
basic operator
basic class
basic const
basic module
basic import

#control keywords
basic while
basic for
basic if
basic else
basic test
basic break
basic continue

#access modifiers
basic public
basic private
basic protected
basic static

#memory keywords
basic ptr
basic ref
basic deref

#misc keywords
basic print
basic setpixel
basic new
basic this

#arithmetic operators
basic +
basic -
basic *
basic /
basic %

#comparison operators
basic ==
basic >=
basic <=
basic !=

#assignment operators
basic =
basic +=
basic -=
basic *=
basic /=
basic %=
basic &=
basic |=
basic ^=

#boolean operators: all seven basic logic gates are represented
basic !&
basic !|
basic !^
basic !
basic &
basic |
basic ^

#grouping symbols
basic (
basic )
basic [
basic ]
basic {
basic }


#punctuation
basic .
basic ,
basic ->
basic ::
basic :

symbol := /[$A-Za-z_][$0-9A-Za-z_]*/

#literals
string-literal := /"([^\\]|\\.)*"/
`