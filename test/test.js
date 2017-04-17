var expect    = require('chai').expect,
    transmute = require('../index.js'),
    scope     = require('./scope.json');
    
var map, result;
    
beforeEach(function() {
  result = transmute(scope, map);
});

describe('Scope Modifiers', function() {
  
  describe('@path Reserved Key', function() {
  
    before(function() {
      map = {
        "@path": "Product.shipping.options",
        "cheapestShippingCost": "economy.cost",
        "expeditedShippingOptions": { 
          "'nextDay'": "nextDay" 
        }
      }; 
    });
    
    it('should update scope for sibling elements', function() {
      expect(result.cheapestShippingCost).to.equal('0.00');
    });

    it('should update scope for child elements', function() {
      expect(result.expeditedShippingOptions.nextDay.cost).to.equal('45.00');
    });
  });
  
  describe('@root Reserved Key', function() {
    before(function() {
      map = {
        "@root": "Product.shipping.options",
        "cheapestShippingCost": "^economy.cost",
        "expeditedShippingCosts": { 
          "'nextDay'": "^nextDay.cost" 
        }
      }; 
    });

    it('should update root scope for sibling elements', function() {
      expect(result.cheapestShippingCost).to.equal('0.00');
    });

    it('should update root scope for child elements', function() {
      expect(result.expeditedShippingCosts.nextDay).to.equal('45.00');
    });
  });
  
  describe('[] Bracket Reserved Key Pattern', function() {
    before(function() {
      map = {
        "variantColors[Product.variants]": {
          "'color'": "color"
        }
      };    
    });
    
    it('should update child scope', function() {
      expect(result.variantColors[0].color).to.equal('red');
    });
    
    it('should define result value as array', function() {
      expect(result.variantColors).to.be.an('array');
    });
  });
  
  describe('{} Braces Reserved Key Pattern', function() {
    before(function() {
      map = {
        "variantColors{Product.variants}": {
          "'color'": "color"
        }
      };    
    });
    
    it('should update child scope', function() {
      expect(result.variantColors.color).to.equal('green');
    });
    
    it('should define result value as object', function() {
      expect(result.variantColors).to.be.an('object');
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
      map = { "filter": "'10' | and('true', 'yes')" }; 
    });
  
    it('should return the boolean AND result of a piped value and one or more additional parameter values', function() {
      expect(result.filter).to.equal(true);
    });
  });

  describe('#array()', function() {
    before(function() { 
      map = { "filter": "'45.00' | array('30.00')" }; 
    });
  
    it('should return an array containing the piped value and one or more additional parameter values', function() {
      expect(result.filter).to.eql([ '45.00', '30.00' ]);
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

    it('should return a string catenation of a piped value combined with one or more additional parameter values', function() {
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
      map = { "filter": "'04/11/2017' | date" }; 
    });

    it('should date format a piped value where x1 is one of: "unix", "javascript", "json"', function() {
      expect(result.filter).to.equal('2017-04-11T00:00:00.000Z');
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
        "filter6": "Product.variants | filter('stock', '<=', '3')"
      }; 
    });

    it('should filter a piped array of objects to include only those elements having a key x1 value that is tested as x2 (">", ">=", "=", "<=", "!=") relative to x3', function() {
      expect(result.filter1).to.eql([ { color: 'red', stock: '5'}, { color: 'blue', stock: '3' } ]);
      expect(result.filter2).to.eql([ { color: 'red', stock: '5'}, { color: 'blue', stock: '3' }, { color: 'green', stock: '0' } ]);
      expect(result.filter3).to.eql([ { color: 'green', stock: '0' } ]);
      expect(result.filter4).to.eql([ { color: 'green', stock: '0' } ]);
      expect(result.filter6).to.eql([ { color: 'blue', stock: '3' }, { color: 'green', stock: '0' } ]);
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

  describe('#gt()', function() {
    before(function() { 
      map = { "filter": "'1' | gt('0')" }; 
    });

    it('should return true if piped value is greater than value x1', function() {
      expect(result.filter).to.equal(true);
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
      map = { "filter": "'ACME super soakers are the worst' | replace('worst', 'best')" }; 
    });

    it('should return `.replace(x1, x2)` of the piped string', function() {
      expect(result.filter).to.equal('ACME super soakers are the best');
    });
  });

  describe('#reduce()', function() {
    before(function() { 
      map = { 
        "filter0": "Product.variants", 
        "filter1": "Product.variants | reduce('stock', 'largest')", 
        "filter2": "Product.variants | pluck('color') | reduce('longest')",
        "filter3": "Product.variants | pluck('color') | reduce('shortest')", 
        "filter4": "Product.variants | reduce('stock', 'smallest')" 
      }; 
    });

    it('should reduce array of piped values to a single element where element key x1 has the "largest", "longest", "shortest", "smallest" (specified by x2) value.  Elements must have a `.length` property for "longest" and "shortest" x2 values.  Omit parameter x1 for non-object array elements (e.g. strings)', function() {
      console.log(JSON.stringify(result, null, 2));
      expect(result.filter1).to.eql({ color: 'red', stock: '5' });
      expect(result.filter2).to.equal('green');
      expect(result.filter3).to.equal('red');
      expect(result.filter4).to.eql({ color: 'green', stock: '0' });
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
      map = { "filter": "Product.shipping.options | values" }; 
    });

    it('should format piped value as an array. Objects are converted to an array of key values', function() {
      expect(result.filter).to.eql([ { "name": "Next Day Air", "cost": "45.00" }, { "name": "Second Day Air", "cost": "30.00" }, { "name": "Free Economy Shipping", "cost": "0.00" } ]);
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
});
