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
  "productArr[Product.variants]": {
    "title": "^Product.title",
    "price": "^Product.price",
    "'color'": "color",
    "inStock": "stock | bool"
  }
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

Expressions enable us to extract data from our Scope object (source data) and transform / restructure it into our target data structure via JSON mappings.  Expressions may be used within both map keys and values similarly, with the exception that expressions within keys support additional Scope Modifiers (more on that in the next section).

### Operators

Operator|Example       | Expression Handling
--------|--------------|------------
'|'expr' | Not evaluated
^|^expr | Evaluated against Scope at the root / top level
.|expr1.expr2 | Chainable direct child element selector
&#124;|expr1 &#124; expr2 | Chainable filter processing
[]|expr1[expr2] | __**Value Only**__ Array element (expr2) selector
[]|expr1[expr2] | __**Key Only**__ Scope modifier (expr2) for child array
{}|expr1{expr2} | __**Key Only**__ Scope modifier (expr2) for child object
{{}}|{{expr1}}{{expr2}} | Expression delimiter
__space__ | expr1 expr2 | Expression delimieter

### Filter Functions

Filter function static parameters (even numerics) must be enclosed in single quotes `'` to avoid the parser attempting to resolve them as key values and ultimately returning `undefined`.

```javascript
var map = {
  "stockout": "Product.variants | filter('stock', '=', '0')"
};

// { "color": "green", "stock": "0" }
```

Function                        | Description
--------------------------------|------------
add(x1,x2,..xn) | Add one or more values to a piped value
and(x1,x2,..xn) | Boolean AND result of a piped value and one or more additional parameter values
array(x1,x2,..xn) | Return an array containing the piped value and one or more additional parameter values
bool | Boolean format a piped value
concat(x1,x2,..xn) | Return a string catenation of a piped value combined with one or more additional parameter values
count | Count the number of keys, values, or characters in a piped object, array, or string
date(x1) | Date format a piped value where x1 is one of: 'unix', 'javascript', 'json' (default)
decrement | Reduces piped value by 1
default(x1) | Returns x1 if the piped value is falsey
divide(x1,x2,..xn) | Divide one or more values from a piped value
eq(x1) | Returns true if piped value == x1
filter(x1,x2,x3) | Filter a piped array of objects to include only those elements having a key x1 value that tests x2: ">", ">=", "=", "<=", or "!=" relative to x3
float(x1) | Float format a piped value with precision x1 (or 2 if x1 is not specified)
gt(x1) | Returns true if piped value is greater than value x1
if(x1,x2) | Returns x1 if piped value is true, otherwise returns x2
increment | Increases piped value by 1
int | Integer format a piped value
join(x1) | Joins array elements from a piped value together into a string delimited by x1 (or `,` if x1 is not specified)
lt(x1) | Returns true if piped value is less than value x1
lowercase | Returns `.toLowerCase()` of the piped string
multiply(x1,x2,..xn) | Multiply one or more values with a piped value
not(x1) | Returns the boolean opposite of x1
or(x1,x2,..xn) | Boolean OR result of a piped value and one or more additional parameter values
pluck(x1) | Returns an array of key values from a piped array of objects having x1 as a key
pop | Returns the last element in an array
push(x1,x2,..xn) | Add one or more additional elements to a piped array.  Ensures piped value is in array format.
reduce(x1,x2) | Reduce array of piped values to a single element where element key x1 has the "largest", "longest", "shortest", or "smallest" (specified by x2) value.  Elements must have a `.length` subtract(x1,x2,..xn) | Subtract one or more values from a piped value
replace(x1,x2) | Returns `.replace(x1, x2)` of the piped string
uppercase | Returns `.toUpperCase()` of the piped string
values | Formats piped value as an array. Objects are converted to an array of key values

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

A `@root` key expression modifies the default Root Scope for all siblings and child elements.  Subsequent (sibling and child element) use of the `^` operator will resolve expressions against the new root scope.

```javascript
var map = {
  "@root": "Product",
  "'title'": "^title"
};

// { "title": "ACME super soaker" }
```

Alternatively you may use Curly Brace or Bracket Notation which result in the generation of a child object or array respectively.  The expression included within braces or brackets modifies Scope for all child elements.

### [] Bracket Reserved Key Pattern Notation

```javascript
map = { 
  "variantColors[Product.variants]": {
    "'color'": "color"
  }
};

// {
//   "variantColors": [
//     { "color": "red" },
//     { "color": "blue" },
//     { "color": "green" }
//   ]
// }
```

### {} Brace Reserved Key Pattern Notation

```javascript
map = { 
  "variantColor{Product.variants}": {
    "'color'": "color"
  }
};

// {
//   "variantColor": { 
//     "color": "green"
//   }
// }
```

## License

[MIT](LICENSE)

