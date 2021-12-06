# Json-Transmute - Simplify Your Code

Simplify your code (and your data) by defining JSON data maps that return only the data you need in common denominator formats.

[![npm package](https://nodei.co/npm/json-transmute.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/json-transmute/)

[![Build status](https://img.shields.io/travis/NFNChris/json-transmute/master.svg?style=flat-square)](https://travis-ci.org/NFNChris/json-transmute)
[![Coverage Status](https://coveralls.io/repos/github/NFNChris/json-transmute/badge.svg?branch=master)](https://coveralls.io/github/NFNChris/json-transmute?branch=master)
[![Dependency Status](https://david-dm.org/NFNChris/json-transmute.svg)](https://david-dm.org/NFNChris/json-transmute.svg)
[![Known Vulnerabilities](https://snyk.io/test/github/nfnchris/json-transmute/badge.svg)](https://snyk.io/test/github/nfnchris/json-transmute)

## Install

Install from npm:
```bash
$ npm install json-transmute
```

## Example

```javascript
var transmute = require('json-transmute');

var scope = {
  "Product": {
    "title": "ACME super soaker",
    "price": "25.00",
    "variants": [
      { "color": "red", "stock": "5" },
      { "color": "blue", "stock": "3" },
      { "color": "green", "stock": "0" }
    ],
    "shipping": {
      "methods": {
        "nextDay": { "name": "Next Day Air", "cost": "45.00" },
        "secondDay": { "name": "Second Day Air", "cost": "30.00" },
        "economy": { "name": "Free Economy Shipping", "cost": "0.00" }
      }
    }
  }
};


var map = {
  "productArr[Product.variants]": [
    {
      "title": "^Product.title",
      "price": "^Product.price",
      "'color'": "color",
      "inStock": "stock | bool"
    }
  ]
};

var simpleData = transmute(scope, map);

// {
//   "productArr": [
//     {
//       "title": "ACME super soaker",
//       "price": "25.00",
//       "color": "red",
//       "inStock": true
//     },
//     {
//       "title": "ACME super soaker",
//       "price": "25.00",
//       "color": "blue",
//       "inStock": true
//     },
//     {
//       "title": "ACME super soaker",
//       "price": "25.00",
//       "color": "green",
//       "inStock": false
//     }
//   ]
// }
```
## Expressions

Expressions enable us to extract data from our Scope object (source data) and transform / restructure it into our target data structure via JSON mappings.  Expressions may be used within both map keys and values similarly, with some caveats with respect to expressions in keys that are discussed in more depth below.

### Operators

Operator|Example       | Expression Handling
--------|--------------|------------
!|!expr | Ignore key.  Child object key value pairs will be assigned directly to the parent, and not under the prefixed key.
'|'expr' | Not evaluated
^|^expr | Evaluated against Scope at the root / top level
.|expr1.expr2 | Chainable direct child element selector. May be used to directly access array elements (e.g. `expr.0` or `expr.5`)
&#124;|expr1 &#124; expr2 | Chainable filter processing
[]|[expr1]expr2 | Modifies scope to expr1 for following (or preceding) expr2. Can be used within escaped `{{}}` expressions.
{{}}|{{expr1}}{{expr2}} | Expression escape delimiter. May be nested.
__space__ | expr1 expr2 | Expression delimiter. Can be used in conjunction with leading or trailing `[]` scope modifier

### Filter Functions

Filter function static parameters (even numerics) must be enclosed in single quotes `'` to avoid the parser attempting to resolve them as key values and ultimately returning `undefined`.  Filter functions are case sensitive and must be written in all lower case.

```javascript
var map = {
  "stockout": "Product.variants | filter(stock | eq('0'))"
};

// { "color": "green", "stock": "0" }
```

Function                        | Description
--------------------------------|------------
add(x1,x2,..xn) | Add one or more values to a piped value
and(x1,x2,..xn) | Boolean AND result of a piped value and one or more additional parameter values
bool | Boolean format a piped value
concat(x1,x2,..xn) | Return a string catenation of a piped value combined with one or more additional parameter values.  Call without parameters for toString() functionality.
count | Count the number of keys, values, or characters in a piped object, array, or string
date(x1) | Date format a piped value where x1 is one of: 'milliseconds' or 'json' (default)
decrement | Reduces piped value by 1
default(x1) | Returns x1 if the piped value is falsey
divide(x1,x2,..xn) | Divide one or more values from a piped value
eq(x1) | Returns true if piped value == x1
filter(x1) | Filter a piped array of objects or values to include only those x1 expression evaluates as true.  By default, x1 is evaluated against the local scope of each array item.  If the piped value is an array of objects, the expression will be evaluated against each object in the array.  If the piped value is an array of singletons, you may use get() to refer to the singleton value in your expressions.  The root `^` operator is also supported for access to non-local scope.
float(x1) | Float format a piped value with precision x1 (or 2 if x1 is not specified)
get(x1) | Returns element x1 from a piped object, array, or string. May also be used without a piped value to reference field values in scope - useful when field names included spaces etc. Supports child dot `.` notation.  Returns current scope when no parameters are passed as in `get()`.
gt(x1) | Returns true if piped value is greater than value x1
gte(x1) | Returns true if piped value is greater than or equal to value x1
hash | Returns a md5 hash string based upon the piped value
if(x1,x2) | Returns x1 if piped value is true, otherwise returns x2
increment | Increases piped value by 1
int | Integer format a piped value
join(x1) | Joins array elements from a piped value together into a string delimited by x1 (or `,` if x1 is not specified)
json | Returns JSON.parse() on a piped value for embedded JSON
keys | Returns an array of keys for the piped object
lt(x1) | Returns true if piped value is less than value x1
lte(x1) | Returns true if piped value is less than or equal to value x1
lowercase | Returns `.toLowerCase()` of the piped string
match(x1, x2) | Returns `.match(x1[, x2])` of the piped string (in array format).  Default value for x2 if not provided is 'i'.
multiply(x1,x2,..xn) | Multiply one or more values with a piped value
not(x1) | Returns the boolean opposite of x1
now(x1) | Returns the current date (`new Date()`) where x1 is one of: 'milliseconds', 'json' (default)
or(x1,x2,..xn) | Boolean OR result of a piped value and one or more additional parameter values
pluck(x1) | Returns an array of key values from a piped array of objects having x1 as a key
pop | Returns the last element in an array
prune(x1,x2,..xn) | Removes all key values from the piped object not specified as a parameter 
push(x1,x2,..xn) | Add one or more additional elements to a piped array.  Ensures piped value is in array format.
reduce(x1,x2) | Reduce array of piped values to a single element where element key x1 has the "largest", or "smallest" (specified by x2) value.  In the absence of key x1, element values will be compared directly
replace(x1,x2[,x3, x4]) | Returns `.replace(x1, x2)` of the piped string.  Defaults to x3 (if specified) or the original piped value if no expression match for x1. Use x4 to specify regular expression flags
set(x1, x2) | Sets element x1 from a piped object, array, or string equal to x2 
slice(x1,x2) | Returns `.slice(x1, x2)` of the piped array or string
split(x1) | Returns `.split(x1)` of the piped string.  Default split character is `,`
subtract(x1,x2,..xn) | Subtract one or more values from a piped value
trim | Removes leading and trailing whitespace from the piped string
uppercase | Returns `.toUpperCase()` of the piped string
values(x1) | Formats piped value as an array. Objects are converted to an array of key values, and any values for keys specified in x1 (comma delimited string) are excluded.  If the key values are themselves objects, the `_key` key is appended and references the parent key.

## Scope Modifiers

Only the root level of the Scope object is checked for map references by default.  Modify the scope by specifying the reserved `@path` or `@root` key.

### @path

A `@path` key expression modifies Scope for all siblings and child elements.

```javascript
var map = {
  "@path": "Product",
  "'title'": "title"
};

// { "title": "ACME super soaker" }
```

### @root

A `@root` key expression modifies the default Root Scope for all siblings and child elements.  Subsequent (sibling and child element) use of the `^` operator will resolve expressions against the new root scope.  To set the Root Scope equal to the Local Scope, assign the `@path` value to the `@root` key.  Conversely, to set the Local Scope equal to the Root Scope, assign the `@root` value to the `@path` key.

```javascript
var map = {
  "@root": "Product",
  "'title'": "^title"
};

// { "title": "ACME super soaker" }
```

Alternatively you may use Bracket Notation `[]` which may be used inline in both key and key values.  When used within keys, the scope change is inherited by child elements.

### [] Bracket Inline Scope Modification

```javascript
map = { 
  "variantColors[Product.variants]": [
    { "'color'": "color" }
  ]
};

// {
//   "variantColors": [
//     { "color": "red" },
//     { "color": "blue" },
//     { "color": "green" }
//   ]
// }
```

## License

[MIT](LICENSE)

