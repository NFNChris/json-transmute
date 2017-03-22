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
      "options": {
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
}
    
console.log(JSON.stringify(transmute(scope, map), null, 2));

// Scope change via '@path' reserved key

console.log('== Scope Change via \'@path\' Reserved Key ==\n');

map = {
  "@path": "Product",
  "'title'": "title"
};

console.log(JSON.stringify(transmute(scope, map), null, 2));

// Scope change via Bracket Notation

console.log('== Scope Change via Bracket Notation ==\n');

map = { "shipping[Product.shipping.options]": "$..name" };

console.log(JSON.stringify(transmute(scope, map), null, 2));

// Scope change via Brace Notation

console.log('== Scope Change via Brace Notation ==\n');

map = { "economy{Product.shipping.options}": "economy" };

console.log(JSON.stringify(transmute(scope, map), null, 2));

// Pluck

//map = { "colors": "Product.variants | pluck('color')" };

