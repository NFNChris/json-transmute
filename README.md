# json-transmute
Transmute (convert) javscript object data into common denominator formats defined via JSON data maps.  Includes support for [JSONPath](https://github.com/s3u/JSONPath) expressions.

## Transmute Example

```javascript
var transmute = require('json-transmute'),
    scope     = require('scope.json'),
    map       = require('map.json');
    
console.log(JSON.stringify(transmute(scope, map), null, 2));
```

### Scope.json

The following example depicts Scope (source) data returned from an the Amazon MWS GetMyPriceForASINResult API call.  As Amazon returns this data in XML format, it was first converted to JSON via [rapidx2j](https://github.com/damirn/rapidx2j).  In this example, XML attributes were prefixed with '@' during the JSON conversion process.

```json
{
  "@xmlns": "http://mws.amazonservices.com/schema/Products/2011-10-01",
  "GetMyPriceForSKUResult": {
    "@SellerSKU": "00-0000-0000", 
    "@status": "Success",
    "Product": {
      "@xmlns": "http://mws.amazonservices.com/schema/Products/2011-10-01",
      "@xmlns:ns2": "http://mws.amazonservices.com/schema/Products/2011-10-01/default.xsd",
      "Identifiers": {
        "MarketplaceASIN": {
          "MarketplaceId": "MMMMMMMMMMMMM",
          "ASIN": "AAAAAAAAAA"
        }
      },
      "Offers": {
        "Offer": {
          "BuyingPrice": {
            "LandedPrice": {
              "CurrencyCode": "USD",
              "Amount": 100.00
            },
            "ListingPrice": {
              "CurrencyCode": "USD",
              "Amount": 100.00
            },
            "Shipping": {
              "CurrencyCode": "USD",
              "Amount": 0
            }
          },
          "RegularPrice": {
            "CurrencyCode": "USD",
            "Amount": 200.00
          },
          "FulfillmentChannel": "MERCHANT",
          "ItemCondition": "New",
          "ItemSubCondition": "New", 
          "SellerId": "SSSSSSSSSSSSSS",
          "SellerSKU": "00-0000-0000"
        }
      }
    }
  },
  "ResponseMetadata": {
    "RequestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

### Map.json

JSON-Transmute generates a javascript object modeled after the structure outlined in a JSON Map (as in the example below).  Both Map Keys and Map Key Values are first checked for inclusion within Scope (source data).  If a matching Key is found within Scope, the Map Key or Key Value is replaced with the lookup value from Scope.  If no match is found, the Map Key / Key Value is copied to the target object verbatim.  You may enclose key or key values in single quotes (') to avoid key / value replacement.  Deep references may be achieved via dot '.' notation, array '[]' reference, as well as JSONPath expression.

Scope lookups occur at search-level (by default the top-level) and are not recursive.  The search-level of the Scope data object may be altered / traversed in one of two ways: (1) via the reserved '@path' key, where the key value specifies an expression for identifying the new search-level of scope for all sibling and child elements, or (2) via curly braces or bracket ({} or []) notation in the Map Key, where the contents of the braces or brackets specify an expression for identifying the new root-level of scope for all child elements.  Curly braces and brackets indicate that the child element should be formatted as an object or an array respectively.

Both Map Keys and Key Values may also include expressions which are resolved by json-transmute prior to building the target object.  Expressions may include multiple Scope data key references as well as mutator functions and JSONPath expressions.

```json
{
  "GetMyPriceForSKU": {
    "@path": "$..GetMyPriceForSKUResult",
    "sku": "_attr.SellerSKU",
    "asin": "Product.Identifiers.MarketplaceASIN.ASIN",
    "offers{$..Offer}": {
      "ItemCondition" : {
        "ItemSubCondition": {
          "ListingPrice": "BuyingPrice.ListingPrice",
          "Shipping": "BuyingPrice.Shipping",
          "IsFulfilledByAmazon": "FulfillmentChannel | replace('^MERCHANT$', 'false', 'true')"
        }
      }
    }
  }
}
```

#### Breaking It Down

The first line of our Map simply defines key under which our object will be built.

```json
  "GetMyPriceForSKU": {
```

The next line updates the default search-level for Scope.  This is added as a convenience to avoid writing out verbose deep references.  The dollar sign '$' at the beginning of the expression indicates that this is a JSONPath expression.  The new Scope search-level will apply to all sibling and child elements unless additional Scope search-level modifiers are specified.

```json
    "@path": "$..GetMyPriceForSKUResult",
```

The following two lines are scope data references using deep reference dot notation.  Note that Scope lookups are case sensitive.  The 'sku' and 'asin' keys are not present in Scope and will be copied verbatim to the target object.

```json
    "sku": "_attr.SellerSKU",
    "asin": "Product.Identifiers.MarketplaceASIN.ASIN",
```

The final section utilizes curly brace notation to further modify Scope search-level.  The curly braces specify that the child element should be an object, and the JSONPath expression '$..Offer' contained within the brackets changes Scope search-level for all child elements.  Note that 'ItemCondition' as well as 'ItemSubCondition' are present within Scope and will therefor be replaced with the corresponding Scope key value.

In this section we also implement a mutator function in determining the value for the 'IsFulfilledByAmazon' key.  Mutator functions are invoked by placing a pipe '|' delimeter after a Scope data reference and then further followed by a mutator function call.  Mutator functions may be 'piped' to additional mutator functions in the same way any number of times.  Mutator function parameters may be passed as Scope data references, or as static values if enclosed in single quotes (').

```json
    "offers{$..Offer}": {
      "ItemCondition" : {
        "ItemSubCondition": {
          "ListingPrice": "BuyingPrice.ListingPrice",
          "Shipping": "BuyingPrice.Shipping",
          "IsFulfilledByAmazon": "FulfillmentChannel | replace('^MERCHANT$', 'false', 'true')"
        }
      }
    }
```

### Target Object (Final Output)

```json
{
  "GetMyPriceForSKU": {
    "asin": "AAAAAAAAAA",
    "offers": {
      "New": {
        "New": {
          "ListingPrice": 100,
          "Shipping": 0,
          "IsFulfilledByAmazon": "false"
        }
      }
    }
  }
}
```





