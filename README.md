# Json-Transmute - Simplify Your Data

Data returned by the multitude of services we consume is often needlessly complex for our own individual needs - particularly when it is first converted from XML.  Simplify your data by defining JSON data maps that return only the data you need in common denominator formats.  Includes support for [JSONPath](https://github.com/s3u/JSONPath) expressions.

## Example

```javascript
var transmute = require('../index.js');

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

## Scope

Only the root level of the Scope object is checked for map references by default.  Modify the scope by specifying the reserved '@path' key -- '@path' key values are expressions that modify Scope for all siblings and child elements.

```javascript
var map = {
  "@path": "Product",
  "'title'": "title"
};

// { "title": "ACME super soaker" }
```

Alternatively you may use Curly Brace or Bracket Notation which result in the generation of a child object or array respectively.  The expression included within braces or brackets modifies Scope for all child elements.

### Bracket Notation

```javascript
map = { 
  "shipping[Product.shipping.options]": "$..name" 
};

// {
//   "shipOptions": [
//     "Next Day Air",
//     "Second Day Air",
//     "Free Economy Shipping"
//   ]
// }
```

### Brace Notation

```javascript
map = { 
  "freeshipping{Product.shipping.options}": "economy" 
};

// {
//   "economy": {
//     "name": "Free Economy Shipping",
//     "cost": "0.00"
//   }
// }
```

## Filter Functions

Function              | Description
----------------------|------------
add(x1, x2, ..xn)     | Add two or more values
and(x1, x2, ..xn)     | Boolean AND result of two or more values
array(x1, x2, ..xn)   | Array format two or more values
bool(x1)              | Boolean format a piped value
concat(x1, x2, ..xn)  | Concatenate two or more values
count(x1)             | Count the number of keys, values, or characters in an object, array, or string
decrement(x1)         | Reduce an integer value by 1
default(x1)           | Provide a default alternative value
filter(x1, x2, x3)    | Filter an array of objects where element x1 is tested against value x2, and operator x3 is one of: 'EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE'
float(x1)             | Float format a piped value with precision x1

