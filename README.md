# json-transmute
Transmute (convert) javscript object data into common denominator formats defined via JSON data maps.  Includes support for JSONPath expressions, as well as 

## Transmute Example

```javascript
var transmute = include('json-transmute'),
    scope     = include('scope.json'),
    map       = include('map.json');
    
console.log(JSON.stringify(transmute(scope, map), null, 2));
```

### Scope Data

The following example depicts Scope (source) data returned from an the Amazon MWS GetMyPriceForASINResult API call.  As Amazon returns this data in XML format, it was first converted to JSON via [rapidx2j].

```json
{
  "@xmlns": "http://mws.amazonservices.com/schema/Products/2011-10-01",
  "GetMyPriceForASINResult": {
    "@ASIN": "AAAAAAAAAA",
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

### JSON Map

```json
{
  "GetMyPriceForSKU": {
    "@path": "$..GetMyPriceForSKUResult",
    "status": "_attr.status",
    "sku": "_attr.SellerSKU",
    "asin": "Product.Identifiers.MarketplaceASIN.ASIN",
    "market": "Product.Identifiers.MarketplaceASIN.MarketplaceId",
    "seller": "Product.Identifiers.SKUIdentifier.SellerId",
    "offers{$..Offer}": {
      "ItemCondition" : {
        "ItemSubCondition": {
          "Condition": "ItemCondition",
          "SubCondition": "ItemSubCondition",
          "ListingPrice": "BuyingPrice.ListingPrice",
          "Shipping": "BuyingPrice.Shipping",
          "IsFulfilledByAmazon": "FulfillmentChannel | replace('^MERCHANT$', 'false', 'true')"
        }
      }
    }
  }
}
```

JSON-Transmute generates a javascript data object modeled after the structure specified in a JSON Map (example below) and using Scope as the input data source.  Both Keys and Key Values in the JSON Map are first checked for inclusion within Scope.  If a match is found, the Key or Key Value is replaced with the lookup value from Scope.  If no match is found, the Key / Key Value is 
