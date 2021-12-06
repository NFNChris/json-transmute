var expect    = require('chai').expect,
    transmute = require('../index.js'),
    scope     = require('./scope.json');
    
var map, result;
    
beforeEach(function() {
  result = transmute(scope, map);
});

describe('Parser', function() {

  describe('Operator characters', function() {
    before(function() {
      map = {
        "filter1": { "key{with-brackets}": "'should work{}'" }
      }; 
    });
    
    it('should allow the use of single brackets in keys and values', function() {
      expect(result.filter1).to.deep.equal({ "key{with-brackets}": "should work{}" });
    });
  });
  
  describe('Ignore Key operator', function() {
    before(function() {
      map = {
        "filter1": { 
          "!'colors'": {
            "@path": "Product.variants",
            "color": "stock"
          }
        }
      };
    });
    
    it('should assign child key values directly to the parent', function() {
      expect(result.filter1).to.deep.equal({ 'blue': '3', 'green': '0', 'red': '5' });
    });
  });
});

describe('Scope Modifiers', function() {
  
  describe('@path Reserved Key', function() {
  
    before(function() {
      map = {
        "@path": "Product.shipping.options",
        "cheapestShippingCost": "economy.cost",
        "expeditedShippingOptions": { 
          "'nextDay'": "nextDay" 
        },
        "revert": {
          "@path": "@root",
          "'title'": "Product.title"
        },
        "siblingArr[^Product.carriers | filter(name | eq('FedEx'))]": {
          "@root": "@path",
          "@path": "services",
          "^name name": "days"
        }
      }; 
    });

    it('should update scope for sibling elements', function() {
      expect(result.cheapestShippingCost).to.equal('0.00');
    });

    it('should update scope for child elements', function() {
      expect(result.expeditedShippingOptions.nextDay.cost).to.equal('45.00');
    });

    it('should support reverting to root scope', function() {
      expect(result.revert.title).to.equal('ACME super soaker');
    });

    it('should iterate over siblings for each item in @path scope', function() {
      expect(result.siblingArr).to.deep.equal({ 
        "FedEx Next Day": "1",
        "FedEx Two Day": "2",
        "FedEx Three Day": "3"
      });
    });
  });
    
  describe('@root Reserved Key', function() {
    before(function() {
      map = {
        "@root": "Product.shipping.options",
        "cheapestShippingCost": "^economy.cost",
        "expeditedShippingCosts": { 
          "'nextDay'": "^nextDay.cost" 
        },
        "revert": {
          "@root": "@path",
          "@path": "Product",
          "'title'": "^Product.title"
        }
      }; 
    });

    it('should update root scope for sibling elements', function() {
      expect(result.cheapestShippingCost).to.equal('0.00');
    });

    it('should update root scope for child elements', function() {
      expect(result.expeditedShippingCosts.nextDay).to.equal('45.00');
    });

    it('should support reverting to path scope', function() {
      expect(result.revert.title).to.equal('ACME super soaker');
    });
  });
  
  describe('[] Bracket Scope Modifier', function() {
    before(function() {
      map = {
        "filter1": "[Product.variants.0]color",
        "filter2[Product.variants.0]": "color",
        "filter3": "[Product.variants.0]color [Product.variants.1]color",
        "filter4": { "Product.title[Product.variants.0]": "color" }
      };    
    });
    
    it('should process inline value scope changes preceding an expression', function() {
      expect(result.filter1).to.equal('red');
    });

    it('should process inline key scope changes for child values', function() {
      expect(result.filter2).to.equal('red');
    });

    it('should process multiple inline scope changes', function() {
      expect(result.filter3).to.equal('red blue');
    });

    it('should resolve scope lookups inline with scope changes', function() {
      expect(result.filter4).to.deep.equal({ "ACME super soaker": "red" });
    });
  });
  
  describe('{{}} Expression Escape Delimeter', function() {
    before(function() {
      map = {
        "filter1": "{{'red' | uppercase}}{{'blue' | lowercase}}",        
        "filter2": "{{{{{{'red'}} | uppercase}}{{'blue' | lowercase}}}}",
        "filter3": "{{[Product.variants.0]color | uppercase}}{{[Product.variants.1]color | lowercase}}",
        "filter4": {
          "@path": "Product.shipping.options",
          "tags": "{{^Product.tags}}"
        }
      };    
    });
    
    it('should allow multiple consecutive escaped expressions', function() {
      expect(result.filter1).to.equal('REDblue');
    });
    
    it('should allow nested expressions', function() {
      expect(result.filter2).to.equal('REDblue');
    });

    it('should allow bracketed scope changes within escaped expressions', function() {
      expect(result.filter3).to.equal('REDblue');
    });

    it('should allow ^ root scope changes within escaped expressions', function() {
      expect(result.filter4.tags).to.equal('Mens,Shirt,Casual');
    });
  });  
});

describe('Filters', function() {
  describe('#add()', function() {
    before(function() { 
      map = { "filter": "'25' | add('1')" }; 
    });
  
    it('should add one or more values to a piped value', function() {
      expect(result.filter).to.equal(26);
    });
  });

  describe('#and()', function() {
    before(function() { 
      map = { 
        "filter1": "'10' | and('true', 'yes')", 
        "filter2": "'0' | gt('0') | and('true')" 
      }; 
    });
  
    it('should return the boolean AND result of a piped value and one or more additional parameter values', function() {
      expect(result.filter1).to.equal(true);
      expect(result.filter2).to.equal(false);
    });
  });

  describe('#bool()', function() {
    before(function() { 
      map = { "filter": "'true' | bool" }; 
    });

    it('should boolean format a piped value', function() {
      expect(result.filter).to.equal(true);
    });
  });

  describe('#concat()', function() {
    before(function() { 
      map = { "filter": "'acme' | concat(' ','super',' ','soaker')" }; 
    });

    it('should return a string concatenation of a piped value combined with one or more additional parameter values', function() {
      expect(result.filter).to.equal('acme super soaker');
    });
  });

  describe('#count()', function() {
    before(function() { 
      map = { "filter": "'acme super soaker' | count" }; 
    });

    it('should count the number of keys, values, or characters in a piped object, array, or string', function() {
      expect(result.filter).to.equal(17);
    });
  });

  describe('#date()', function() {
    before(function() { 
      map = { 
        "filter1": "'04/11/2017' | date",
        "filter2": "'04/11/2017' | date('milliseconds')",
      }; 
    });

    it('should date format a piped value where x1 is one of: "unix", "javascript", "json"', function() {
      expect(result.filter1).to.equal('2017-04-11T00:00:00.000Z');
      expect(result.filter2).to.equal(1491868800000);
    });
  });

  describe('#decrement()', function() {
    before(function() { 
      map = { "filter": "'1' | decrement" }; 
    });

    it('should reduce piped value by 1', function() {
      expect(result.filter).to.equal(0);
    });
  });

  describe('#default()', function() {
    before(function() { 
      map = { "filter": "'false' | default('ok')" }; 
    });

    it('should return x1 if the piped value is falsey', function() {
      expect(result.filter).to.equal('ok');
    });
  });

  describe('#divide()', function() {
    before(function() { 
      map = { "filter": "'10' | divide('2', '5')" }; 
    });

    it('should divide a piped value by one or more additional parameter values', function() {
      expect(result.filter).to.equal(1);
    });
  });

  describe('#eq()', function() {
    before(function() { 
      map = { "filter": "'1' | eq('1')" }; 
    });

    it('should return true if piped value == x1', function() {
      expect(result.filter).to.equal(true);
    });
  });

  describe('#filter()', function() {
    before(function() { 
      map = { 
        "filter1": "Product.variants | filter('stock', '>', '0')",
        "filter2": "Product.variants | filter('stock', '>=', '0')",
        "filter3": "Product.variants | filter('stock', '=', '0')",
        "filter4": "Product.variants | filter('stock', '<', '3')",
        "filter5": "Product.variants | filter('stock', '<=', '3')",
        "filter6": "Product.variants | filter(color | count | lt(stock | int))",
        "filter7": "Product.variants | filter(stock | int | eq(^Product.tags | split | count))",
        "filter8": "Product.tags | split | filter(get() | count | gte('5'))"  
      }; 
    });

    it('should filter a piped array of objects to include only those elements having a key x1 value that is tested as x2 (">", ">=", "=", "<=", "!=") relative to x3', function() {
      expect(result.filter1).to.eql([ { color: 'red', stock: '5'}, { color: 'blue', stock: '3' } ]);
      expect(result.filter2).to.eql([ { color: 'red', stock: '5'}, { color: 'blue', stock: '3' }, { color: 'green', stock: '0' } ]);
      expect(result.filter3).to.eql([ { color: 'green', stock: '0' } ]);
      expect(result.filter4).to.eql([ { color: 'green', stock: '0' } ]);
      expect(result.filter5).to.eql([ { color: 'blue', stock: '3' }, { color: 'green', stock: '0' } ]);
      expect(result.filter6).to.eql([ { color: 'red', stock: '5'} ]);
      expect(result.filter7).to.eql([ { color: 'blue', stock: '3' } ]);
      expect(result.filter8).to.eql([ 'Shirt', 'Casual' ]);
    });
  });

  describe('#float()', function() {
    before(function() { 
      map = { "filter": "'1' | float" }; 
    });

    it('should float format a piped value with precision x1 (or 2 if x1 is not specified)', function() {
      expect(result.filter).to.equal(1.00);
    });
  });

  describe('#get()', function() {
    before(function() { 
      map = { 
        "filter1": "Product.variants | get('2')",
        "filter2": "Product.title | get('2')",
        "filter3": "Product | get('tags')",
        "filter4": "get() | get('Product.title')"
      }; 
    });

    it('should return element x1 from a piped array, object, or string', function() {
      expect(result.filter1).to.deep.equal({ "color": "green", "stock": "0" });
      expect(result.filter2).to.equal("M");
      expect(result.filter3).to.equal("Mens,Shirt,Casual");
      expect(result.filter4).to.equal("ACME super soaker");
    });
  });

  describe('#gt()', function() {
    before(function() { 
      map = { "filter": "'1' | gt('0')" }; 
    });

    it('should return true if piped value is greater than value x1', function() {
      expect(result.filter).to.equal(true);
    });
  });

  describe('#hash()', function() {
    before(function() { 
      map = { 
        "filter1": "Product.shipping.options | hash",
        "filter2": "Product.shipping.options | hash" 
      }; 
    });

    it('should return an consistent md5 hash string', function() {
      expect(result.filter1).to.equal(result.filter2);
    });
  });

  describe('#if()', function() {
    before(function() { 
      map = { "filter": "'yes' | if('win', 'lose')" }; 
    });

    it('should return x1 if piped value is true, otherwise returns x2', function() {
      expect(result.filter).to.equal('win');
    });
  });

  describe('#increment()', function() {
    before(function() { 
      map = { "filter": "'0' | increment" }; 
    });

    it('should increment piped value by 1', function() {
      expect(result.filter).to.equal(1);
    });
  });

  describe('#int()', function() {
    before(function() { 
      map = { "filter": "'010' | int" }; 
    });

    it('should integer format a piped value', function() {
      expect(result.filter).to.equal(10);
    });
  });

  describe('#join()', function() {
    before(function() { 
      map = { "filter": "Product.variants | pluck('color') | join" }; 
    });

    it('should join array elements from a piped value together into a string delimited by x1 (or `,` if x1 is not specified)', function() {
      expect(result.filter).to.equal('red,blue,green');
    });
  });

  describe('#json()', function() {
    before(function() { 
      map = { "filter": "EmbeddedJSON | json" }; 
    });

    it('should return a json object parsed from an embedded json string', function() {
      expect(result.filter.product).to.equal('test');
    });
  });

  describe('#keys()', function() {
    before(function() { 
      map = { "filter": "Product.shipping.options | keys" }; 
    });

    it('should return an array of keys from the piped object', function() {
      expect(result.filter).to.eql([ 'nextDay', 'secondDay', 'economy' ]);
    });
  });

  describe('#lt()', function() {
    before(function() { 
      map = { "filter": "'1' | lt('2')" }; 
    });

    it('should return true if piped value is less than value x1', function() {
      expect(result.filter).to.equal(true);
    });
  });

  describe('#lowercase()', function() {
    before(function() { 
      map = { "filter": "'ACME' | lowercase" }; 
    });

    it('should return `.toLowerCase()` of the piped string', function() {
      expect(result.filter).to.equal('acme');
    });
  });

  describe('#match()', function() {
    before(function() { 
      map = { 
        "filter": "Product.title | match('^acme') | pop",
      }; 
    });

    it('should return `.match(x1, x2)` of the piped string', function() {
      expect(result.filter).to.equal('ACME');
    });
  });



  describe('#multiply()', function() {
    before(function() { 
      map = { "filter": "'1' | multiply('2', '5')" }; 
    });

    it('should multiply a piped value with one or more additional parameter values', function() {
      expect(result.filter).to.equal(10);
    });
  });

  describe('#not()', function() {
    before(function() { 
      map = { "filter": "not('true')" }; 
    });

    it('should return the boolean opposite of x1', function() {
      expect(result.filter).to.equal(false);
    });
  });

  describe('#now()', function() {
    before(function() { 
      map = { "filter": "now('milliseconds')" }; 
    });

    it('should return the current date where x1 is one of: "unix", "javascript", "json"', function() {
      expect(parseInt(result.filter / 1000)).to.equal(parseInt(new Date().getTime() / 1000));
    });
  });

  describe('#or()', function() {
    before(function() { 
      map = { "filter": "'true' | or('false') | bool" }; 
    });

    it('should return the boolean OR result of a piped value and one or more additional parameter values', function() {
      expect(result.filter).to.equal(true);
    });
  });

  describe('#pluck()', function() {
    before(function() { 
      map = { "filter": "Product.variants | pluck('color')" }; 
    });

    it('should return an array of key values from a piped array of objects having x1 as a key', function() {
      expect(result.filter).to.eql([ 'red', 'blue', 'green' ]);
    });
  });

  describe('#pop()', function() {
    before(function() { 
      map = { "filter": "Product.variants | pop" }; 
    });

    it('should return the last element of an array', function() {
      expect(result.filter).to.eql({ "color": "green", "stock": "0" });
    });
  });

  describe('#prune()', function() {
    before(function() { 
      map = { "filter": "Product.shipping.options | prune('nextDay', 'secondDay')" }; 
    });

    it('should include only those key / value pairs specified as parameters', function() {
      expect(result.filter).to.not.have.any.keys('economy');
    });
  });

  describe('#push()', function() {
    before(function() { 
      map = { "filter": "'1' | array | push('2')" }; 
    });

    it('should add one or more additional elements to a piped array, and ensure piped value is in array format.', function() {
      expect(result.filter).to.eql([ '1', '2' ]);
    });
  });

  describe('#replace()', function() {
    before(function() { 
      map = { 
        "filter1": "'ACME super soakers are the worst' | replace('worst', 'best')",
        "filter2": "'ACME super soakers are the worst' | replace('best', 'worst')",
        "filter3": "Product.discount | replace('8', '0')",
        "filter4": "Product.special | replace('[\\.]+', '_', Product.special, 'g')"
      }; 
    });

    it('should return `.replace(x1, x2)` of the piped string', function() {
      expect(result.filter1).to.equal('ACME super soakers are the best');
      expect(result.filter2).to.equal('ACME super soakers are the worst');
      expect(result.filter3).to.equal('0.00');
      expect(result.filter4).to.equal('text_with_special_characters');
    });
  });

  describe('#reduce()', function() {
    before(function() { 
      map = { 
        "filter0": "Product.variants", 
        "filter1": "Product.variants | reduce('stock', 'largest')", 
        "filter2": "Product.variants | pluck('color') | reduce('longest')",  // deprecated
        "filter3": "Product.variants | pluck('color') | reduce('shortest')", // deprecated
        "filter4": "Product.variants | reduce('stock', 'smallest')" 
      }; 
    });

    it('should reduce array of piped values to a single element where element key x1 has the "largest", "longest", "shortest", "smallest" (specified by x2) value.  Elements must have a `.length` property for "longest" and "shortest" x2 values.  Omit parameter x1 for non-object array elements (e.g. strings)', function() {
      expect(result.filter1).to.eql({ color: 'red', stock: '5' });
      expect(result.filter2).to.equal('green'); // deprecated
      expect(result.filter3).to.equal('red');   // deprecated
      expect(result.filter4).to.eql({ color: 'green', stock: '0' });
    });
  });

  describe('#set()', function() {
    before(function() { 
      map = { 
        "filter1": "Product.variants | set('2', '2') | get('2')",
        "filter2": "Product.title | set('2', '2') | get('2')",
        "filter3": "Product | set('tags', '2') | get('tags')"
      }; 
    });

    it('should return element x1 from a piped array, object, or string', function() {
      expect(result.filter1).to.equal('2');
      expect(result.filter2).to.equal('2');
      expect(result.filter3).to.equal('2');
    });
  });

  describe('#slice()', function() {
    before(function() { 
      map = { 
        "filter1": "Product.variants | slice('2', '3')",
        "filter2": "Product.tags | slice('0', '4')"
      }; 
    });
  
    it('should return `.slice()` of the pipped array or string', function() {
      expect(result.filter1).to.deep.equal([ { "color": "green", "stock": "0" } ]);
      expect(result.filter2).to.equal("Mens");
    });
  });

  describe('#split()', function() {
    before(function() { 
      map = { "filter": "Product.tags | split" }; 
    });
  
    it('should return `.split()` of the pipped string', function() {
      expect(result.filter).to.deep.equal([ 'Mens', 'Shirt', 'Casual' ]);
    });
  });

  describe('#subtract()', function() {
    before(function() { 
      map = { "filter": "'25' | subtract('1')" }; 
    });
  
    it('should subtract one or more values from a piped value', function() {
      expect(result.filter).to.equal(24);
    });
  });

  describe('#trim()', function() {
    before(function() { 
      map = { "filter": "' hello ' | trim" }; 
    });
  
    it('should return `.trim()` of the piped string', function() {
      expect(result.filter).to.equal("hello");
    });
  });

  describe('#uppercase()', function() {
    before(function() { 
      map = { "filter": "'acme' | uppercase" }; 
    });

    it('should return `.toUpperCase()` of the piped string', function() {
      expect(result.filter).to.equal('ACME');
    });
  });

  describe('#values()', function() {
    before(function() { 
      map = { 
        "filter1": "Product.shipping.options | values | get('0')", 
        "filter2": "Product.shipping.options | values | get('0') | values('_key')" 
      }; 
    });

    it('should format piped value as an array. Objects are converted to an array of key values', function() {
      expect(result.filter1).to.eql({ "name": "Next Day Air", "cost": "45.00", "_key": "nextDay" });
      expect(result.filter2).to.eql([ "Next Day Air", "45.00" ]);
    });
  });
});

describe('References', function() {
  describe('#Object', function() {
    before(function() { 
      map = { 
        "filter1": "Product.shipping",
        "filter2": "Product.shipping"
      }; 
    });

    it('should ensure objects are passed by value, not by reference', function() {
      result.filter1.options = 'No Options Available';
      expect(result.filter1).to.not.eql(result.filter2);
    });    
  });
  
  describe('#Array', function() {
    before(function() { 
      map = { 
        "filter1[Product.variants]": [ "color" ],
        "filter2[Product.variants]": [ { "'color'": "color" } ],
        "filter3[Product.variants]": [ [ "color" ] ],
        "filter4[Product.variants]": [ "color", { "'color'": "color" }, [ "color" ] ]
      }; 
    });

    it('should ensure child is in array format', function() {
      expect(result.filter1).to.deep.equal([ "red", "blue", "green" ]);
    });    

    it('should ensure child is in array format and support child objects', function() {
      expect(result.filter2).to.deep.equal([ 
        { "color": "red" }, 
        { "color": "blue" }, 
        { "color": "green" }
      ]);
    });

    it('should ensure child is in array format and support child arrays', function() {
      expect(result.filter3).to.deep.equal([ 
        [ "red" ], [ "blue" ], [ "green" ],
      ]);
    });

    it('should ensure child is in array format and support mixed types', function() {
      expect(result.filter4).to.deep.equal([ 
        "red", { "color": "red" }, [ "red" ],
        "blue", { "color": "blue" }, [ "blue" ],
        "green", { "color": "green" }, [ "green" ],
      ]);
    });
  });
    
  describe('#Undefined', function() {
    before(function() {
      map = {
        "filter": "does.not.exist | default('1') | int | add(also.does.not.exist | default('2') | int | divide(definitely.not.defined | default('2') | int))"
      };
    });

    it('should handle undefined references gracefully', function() {
      expect(result.filter).to.equal(2);
    });
  });

  describe('#Null', function() {
    before(function() {
      map = {
        "filter": "Product.weight.value | default('0') | float"
      };
    });

    it('should handle attempts to access child keys of null values gracefully', function() {
      expect(result.filter).to.equal(0.00);
    });
  });

});
