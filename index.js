var crypto = require('crypto');

module.exports = function(scope, map) {
  return transmute(scope, map);
}

function transmute(scope, map, target, rootScope, skipKeys) {
  target    = target    || {};
  rootScope = rootScope || scope;
  
  /** Ensure array format for scope */
  var scopeItems = Array.isArray(scope) ? scope : [ scope ];
  
  /** Iterate over each element in scope */
  scopeItems.forEach(function(scopeItem, idx) {
    var mapIsArr = Array.isArray(map) ? true : false,
        mapItems = mapIsArr ? map : Object.keys(map || {}),
        pathIsArr = false,
        ignoreKey = false,
        child = {};
        
    // Iterate over each map value (array element or object key)    
    mapItems.forEach(function(mapKey) {
    
      // Check if the ignore key '!' operator was specified at the beginning
      // of the key.  If specified, data is mapped directly to the parent and
      // not under the specified key.  Ignored when the map value is an array.
      if (mapKey[0] === '!') ignoreKey = !mapIsArr;
    
      var mapVal = mapIsArr ? mapKey : map[mapKey],
          keyOpts = mapIsArr ? {} : resolve(mapKey, scopeItem, rootScope, true),
          childVal = Array.isArray(mapVal) ? [] : {},
          childScope = mapIsArr ? scopeItem : keyOpts.scope;
          
      // If the current key was specified in skipKeys do nothing
      if (skipKeys && mapKey in skipKeys) return; 
      
      // If a path modifier has been invoked that points to an array, then 
      // we handle mapping recursively and do nothing more here.
      if (pathIsArr) return;
          
      // Remove / skip reserved keys
      if (keyOpts && keyOpts.val && keyOpts.val[0] === '@') {
        if (mapKey === '@root') {
          if (map['@root'] === '@path') {
            rootScope = scopeItem;
          } else {
            rootScope = resolve(map['@root'], rootScope, rootScope).val;
          }
        }

        if (mapKey === '@path') {
          if (map['@path'] === '@root') {
            scopeItem = rootScope;
          } else {          
            scopeItem = resolve(map['@path'], scopeItem, rootScope).val;
            
            if (Array.isArray(scopeItem)) {
              pathIsArr = true;            
              scopeItem.forEach(function(scopeItemChild) {
                transmute(scopeItemChild, map, target, rootScope, { 
                  '@path': true,
                  '@root': true
                })
              });
            }
          }
        }
  
        return;      
      };
          
      // Recursively process object key values
      if (mapVal && typeof mapVal === 'object') {
        transmute(childScope, mapVal, childVal, rootScope);
      } else {
        childVal = resolve(mapVal, childScope, rootScope).val;
      }
      
      // Assign transmuted value to target object
      if (mapIsArr) {
        target.push(childVal);
      } else if (ignoreKey 
        && typeof target === 'object' && !Array.isArray(target) 
        && typeof childVal === 'object' && Object.keys(childVal).length) {
          Object.keys(childVal).forEach(function(childValKey) {
            target[childValKey] = childVal[childValKey];
          });
      } else {
        assign(Array.isArray(target) ? child : target, childVal, keyOpts);
      }
    });

    if (!mapIsArr && Array.isArray(target) 
      && !((Array.isArray(child) && !child.length) 
      || (child && typeof child === 'object' && !Object.keys(child).length))) {
        target.push(child);
    }
  });
  
  return target;
}

// Ensure object tree exists as dictated by the key
function assign(parent, val, keyOpts) {
  var target   = parent,
      keyParts = keyOpts.val.toString().split('.');
   
  keyParts.forEach(function(keyPart, idx) {
    if (keyParts.length === idx + 1) {
      if (val !== undefined) {
        if (Array.isArray(val) && Array.isArray(target[keyPart])) {
          val = target[keyPart].concat(val);
        }
        
        if (!((Array.isArray(val) && !val.length) 
          || (typeof val === 'object' && !Object.keys(val || {}).length))) {        
            target[keyPart] = val;        
        }
      }
    } else if (!(keyPart in target)) {      
      target[keyPart] = {};
    }    
  });  
}

function resolve(expr, scope, rootScope, isKey) {
  var tokens = parse(expr),
      resolved = expr,
      childScope = scope,
      type = 'object';
      
  /** Iterate over each expression token returned by parse() */
  tokens.forEach(function(token) {
    var root;
    
    /** Process token by token type */
    switch (token.type) {
      case 'scope':
        childScope = 
          resolve(token.val, token.root ? rootScope : scope, rootScope).val;
        result = '';
      break;
      case 'lookup':
        result = token.root ? rootScope : childScope;
        token.val.split('.').some(function(key) {
          if (typeof result === 'object' && result !== null && key in result) {
            result = result[key];
          } else {
            result = isKey ? token.val : undefined;
            return true;
          }
        });
        
        // If result is an object, make a copy to preserve source scope data
        if (Array.isArray(result)) {
          result = result.slice();
        } else if (result && typeof result === 'object') {
          result = JSON.parse(JSON.stringify(result));
        }
      break;
      case 'expression':
        result = resolve(
          token.val, token.root ? rootScope : childScope, rootScope, isKey
        ).val;
      break;
      case 'filter':
        result = filter(
          token.val, token.opts, childScope, rootScope, childScope
        );
      break;
      case 'static':
        result = token.val;
      break;
    }
    
    /** Apply filters associated with this token */
    token.filters.forEach(function(tokenFilter) {
      var val  = tokenFilter.val,
          opts = tokenFilter.opts;
          
      result = filter(val, opts, childScope, rootScope, result);
    });
    
    /** Replace token pattern in expression with result */
    if (tokens.length > 1) {
      resolved = resolved.replace(token.pattern, result);
    } else {
      resolved = result;
    }
  });
  
  return { type: type, val: resolved, scope: childScope };
}  

function filter(type, paramsUnresolved, scope, rootScope, result) {
  var params = [];

  paramsUnresolved.forEach(function(param, idx) {
    params[idx] = resolve(param, scope, rootScope).val;
  });

  switch (type) {
    case 'add':
      result = result ? +result : 0;
      params.forEach(function(param) {
        result += +param; 
      });
    break;
    case 'and':
      result = isTruthy(result);    
      params.forEach(function(param) {
        result = result && isTruthy(param);
      });
    break;
    case 'bool':
      result = isTruthy(result);
    break;
    case 'concat':
      if (result) params.unshift(result);
      result = params.join('');
    break;
    case 'count':
      if (Array.isArray(result) || typeof result === 'string') {
        result = result.length;
      } else if (result && typeof result === 'object') {
        result = Object.keys(result);
      } else {
        result = result ? 1 : 0;
      }
    break;
    case 'now':
      result = new Date();
    case 'date':
      switch (( params[0] || 'json').toLowerCase()) {
        case 'milliseconds':
          result = new Date(result).getTime();
        break;
        case 'json':
        default:
          result = new Date(result).toJSON();
        break;
      }
    break;
    case 'decrement':
      result = +result;
      --result;
    break;
    case 'default':
      result = isTruthy(result) ? result : params[0];
    break;
    case 'divide':
      params.forEach(function(param) {
        result = result / param;
      });
    break;
    case 'eq':
      result = result == params[0] ? true : false;
    break;
    case 'filter':
      var filtered = [];
      
      ( Array.isArray(result) ? result : [ result ] ).forEach(function(item) {
        var arrParams = [];
        var testVal;
        
        // The filter() filter will now use the local scope of each array item
        // when resolving parameter expressions.  The ^ root scope operator is
        // still available to access the non-local scope.  For backwards 
        // compatibility, we check to see if the first parameter is in string
        // format.  If it is, we employ legacy processing.  This usage is
        // deprecated and will be removed at a future date.
        // @TODO Should probably only have a single parameter passed to the 
        // filter() function now that we are evaluating expressions.  Can use
        // equality filters gt(), lt(), eq() for tests.  Need to add gte() and
        // lte().
        if (paramsUnresolved[0].match(/^'[^']*'$/)) {
          arrParams = params;
          testVal = item[params[0]];

          switch (arrParams[1]) {
            case '=':
              if (testVal == arrParams[2]) filtered.push(item);
            break;
            case '!=':
              if (testVal != arrParams[2]) filtered.push(item);
            break;
            case '>':
              if (testVal > arrParams[2]) filtered.push(item);
            break;
            case '>=':
              if (testVal >= arrParams[2]) filtered.push(item);
            break;
            case '<':
              if (testVal < arrParams[2]) filtered.push(item);
            break;
            case '<=':
              if (testVal <= arrParams[2]) filtered.push(item);
            break;
            default:
              if (testVal == arrParams[2]) filtered.push(item);
            break;
          }
        } else {                
          paramsUnresolved.forEach(function(param, idx) {
            arrParams[idx] = resolve(param, item, rootScope).val;
          });
          
          arrParams[0] && filtered.push(item);
        }
        
      });
      
      result = filtered;
    break;
    case 'float':
      result = parseFloat(result);      
      result = parseFloat(result.toFixed(params[0] ? params[0] : 2));
    break;
    case 'get':
      if (params.length) {
        result = lookup(params[0], result);
      } else {
        result = scope;
      }
    break;
    case 'gt':
      result = result > params[0];
    break;
    case 'gte':
      result = result >= params[0];
    break;
    case 'hash':
      var hashStr = JSON.stringify(result || '');
      result = crypto.createHash('md5').update(hashStr).digest('hex');
    break;
    case 'if':
      result = isTruthy(result) ? params[0] : params[1];
    break;
    case 'increment':
      result = +result;
      ++result;
    break;
    case 'int':
      result = parseInt(result || 0);
    break;
    case 'join':
      result = (result || '').join(params[0] || ',');
    break;
    case 'json':
      result = JSON.parse(result);
    break;
    case 'keys':
      if (typeof result === 'object') {
        result = Object.keys(result || {});
      }
    break;
    case 'lt':
      return result < params[0];
    break;
    case 'lte':
      return result <= params[0];
    break;
    case 'lowercase':
      result = result.toLowerCase();
    break;
    case 'match':
      var expr = new RegExp(params[ 0 ], params[ 1 ] || 'i');
      
      // Ensure result is a string
      result = typeof result === 'string' ? result : String(result);
          
      result = (result || '').match(expr);      
    break;
    case 'multiply':
      params.forEach(function(param) {
        result = result * param;
      });
    break;
    case 'not':
      result = !isTruthy(params[0]);
    break;    
    case 'or':
      params.forEach(function(param) {
        result = result || param;
      });
    break;
    case 'pluck':
      var plucked = [];
      ( Array.isArray(result) ? result : [ result ] ).forEach(function(item) {
        if (item && params[0] in item) plucked.push(item[params[0]]);
      });
      
      result = plucked;
    break;
    case 'pop':
      result = ( Array.isArray(result) ? result : [ result ] ).pop();
    break;
    case 'prune':
      Object.keys(result || {}).forEach(function(key) {
        if (params.indexOf(key) < 0) delete result[key];
      });      
    break;
    case 'array': // deprecated
    case 'push':
      result = Array.isArray(result) ? result : [ result ];
      
      params.forEach(function(param) {
        result.push(param);
      });            
    break;
    case 'reduce':
      var key = params[1] ? params[0] : 'length',
          type = params[1] ? params[1] : params[0],
          val;
      
      ( Array.isArray(result) ? result : [ result ] ).forEach(function(item) {      
        if (!val) {
          val = item;
        } else {
          var itemKeyVal = item[key] || item,
              valKeyVal = val[key] || val;
        
          switch (type.toLowerCase()) {
            case 'longest': // deprecated
            case 'largest':
              if (itemKeyVal > valKeyVal) val = item;
            break;
            case 'shortest': // deprecated
            case 'smallest':
              if (itemKeyVal < valKeyVal) val = item;
            break;
          }
        }
      });
      
      result = val;
    break;
    case 'replace':    
      var expr = new RegExp(params[0], params[3] || '');
      
      // Ensure result is a string
      result = typeof result === 'string' ? result : String(result);
          
      if ((result || '').match(expr)) {
        result = result.replace(expr, params[1]);
      } else {
        if (params[2]) result = params[2];
      }
    break;
    case 'set':
      var idx = parseInt(params[0] || 0),
          val = params[1] || '';
    
      if (Array.isArray(result)) {
        result[idx] = val;
      } else if (typeof result === 'string') {
        result = result.substr(0, idx) + val + result.substr(idx + val.length);
      } else if (result && typeof result === 'object') {
        result[params[0]] = val;
      }
    break;
    case 'slice':
      if (Array.isArray(result) || typeof result === 'string') {
        if (params[1]) {
          result = result.slice(parseInt(params[0] || 0), parseInt(params[1] || 0));
        } else {
          result = result.slice(parseInt(params[0] || 0));
        }
      }
    break;
    case 'split':
      if (typeof result === 'string') result = result.split(params[0] || ',');
    break;
    case 'subtract':
      result = result ? +result : 0;
      params.forEach(function(param) {
        result -= +param; 
      });
    break;
    case 'trim':
      if (typeof result === 'string') result = result.trim();
    break;
    case 'uppercase':
      result = result.toUpperCase();
    break;
    case 'values':
      var values = [];
      var exclude = {};
      
      if (params[0]) {
        params[0].split(',').forEach(function(key) {
          exclude[key] = true;
        });
      }
      
      if (result) {
        if (typeof result === 'object') {
          Object.keys(result).forEach(function(key) {
            if (key in exclude) return;
          
            if (typeof result[key] === 'object') {
              result[key]['_key'] = key;
            }
            
            values.push(result[key]);
          });
        } else if (Array.isArray(result)) {
          values = result;
        } else {
          values.push(result);
        }
      }
      
      result = values;
    break;
	case "tostring":
 		result = result.toString();
 		break;
    default:
      throw new Error('Unknown filter type: ' + type);
    break;
  }
      
  return result;
}

function isTruthy(val) {
  var truthy = false;
  
  switch (typeof val) {
    case 'string':
      if (+val > 0 || +val < 0) {
        truthy = true;
      } else if (val.search(/^true|yes|t|y$/i) >= 0) {      
        truthy = true;
      } else if (val.search(/^false|no|f|n$/i) >= 0) {
        truthy = false;
      } else if (val.length) {
        truthy = true;
      }
    break;
    case 'number':
      if (val > 0 || val < 0) {
        truthy = true;
      }
    break;
    case 'object':
      if (Array.isArray(val)) {
        if (val.length > 0) {
          truthy = true;
        }
      } else {
        if (Object.keys(val || {}).length > 0) {
          truthy = true;
        }
      }
    break;
    case 'boolean':
      truthy = val;
    break;
  }

  return truthy;  
}

function lookup(key, result) {
  (key || '').split('.').some(function(key) {
    var intKey = parseInt(key || 0);
    
    if (result && ((Array.isArray(result) && intKey in result) 
      || (typeof result === 'string' && intKey < result.length))) {
      result = result[intKey];
    } else if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      result = undefined;
      return true;
    }
  });
  
  return result;
}

function parse(expr) {
  var tokens      = [],
      level       = [],
      addOpts     = false,
      addFilter   = false,
      i           = 0,
      filter;
      
  /** Token factory */    
  var getNewToken = function() {
    return {
      val: '',
      pattern: '',
      opts: [ '' ],
      filters: [],
      type: 'lookup',
      root: false
    }
  }
  
  /** Filter factory */
  var addNewFilter = function(token) {
    var filter = {
      val: '', 
      opts: [], 
      type: 'filter'
    }
    
    token.filters.push(filter);
    return filter;
  }
  
  /** Initialize token */
  var token = getNewToken();
  
  while(i < expr.length) {
    token.pattern += expr[i];
    
    switch (expr[i]) {
      case '\'':      
        /** A single quote at root level is a static value delimeter */
        if (level[level.length - 1] === '\'') {
          level.pop();

          if (level.length === 0) {
            token.type = 'static';
            ++i; continue;
          }          
        } else {
          level.push('\'');

          if (level.length === 1) {
            ++i; continue;
          }
        }        
      break;
      case '^':
        /** A carrot at the start of a new token is a root lookup */
        if (token.val === '' && level.length === 0) {
          token.root = true;
          ++i; continue;
        }
      break;
      case '(':
        level.push(')');
        if (level.length === 1 
          && ((addFilter && filter.val !== '') 
          || (!addFilter && token.val !== ''))) 
        {
          if (!addFilter) token.type = 'filter';
          addOpts = true;
          ++i; continue;
        }
      break;
      case '[':        
        if (!level.length) {
          level.push(']');

          if (token.val !== '') {
            token.pattern = token.pattern.slice(0, -1);
            tokens.push(token);
          }
        
          token = getNewToken();
          token.pattern += "[";
          token.type = 'scope';

          ++i; continue;
        }
      break;
      case '{':
        level.push('}');
      
        /** Check for handlebar opening token notation */
        if (level.length === 1 && expr[i + 1] === '{') {

          /** Remove opening bracket from replacement pattern string */
          if (token.val !== '') {
            token.pattern = token.pattern.slice(0, -1);
            tokens.push(token);
          }
                    
          /** Initialize a new token */
          token = getNewToken();
          token.pattern += "{{";
          token.type = "expression";

          /** Advance expr pointer past handlebar opening notation */
          level[level.length - 1] = '}}';
          ++i; ++i; continue;
        }
      break;
      case '}':
        /** Check for handlebar closing token notation */
        if (expr[i + 1] === '}' && level[level.length - 1] === '}}') {
          if (token.val !== '') {
            token.pattern += '}';
            tokens.push(token);
          }
          
          token = getNewToken();
          ++i; ++i; level.pop();
          continue;
        } else if (level[level.length - 1] === '}') {
          level.pop();
        }
      break;
      case ']':
        if (level.length === 1 && level[0] === expr[i]) {
          level.pop();
          tokens.push(token);
          token = getNewToken();
          ++i; continue;
        }
      break;
      case ')':
        if (level[level.length - 1] === expr[i]) {
          level.pop();
        }
        
        if (addOpts && level.length === 0) {
          addOpts = false;
          ++i; continue;
        }
      break;
      case ' ':      
        /** A space at root level is a token delimeter */        
        if (level.length === 0) {
        
          /** If a pipe was previously found, parse token as filter */
          if (addFilter) {
          
            /** If filter value is not empty, add it to the token */
            if (filter.val !== '') {
            
              /** Add filter to token and intialize new token*/
              tokens.push(token);
              token = getNewToken();
              
              /** Exit filter state */
              addFilter = false;              
              ++i; continue;

            /** If filter value is empty, ignore white space */
            } else {
              ++i; continue;
            }

          /** Parse token as value */
          } else {
            if (token.val !== '') {
              tokens.push(token);          
              token = getNewToken();
            }
            
            ++i; continue;
          }        
        }

        /** Strip white space from filter parameters */
        if (addOpts && level.length === 1 
          && (addFilter || token.type === 'filter')) 
        {
          ++i; continue;
        }
      break;
      case '|':      
        /** A pipe at root level signifies the application of a filter */
        if (level.length === 0) {
          /** Restore previous token */
          if (tokens.length && token.val === '') {
            token = tokens.pop();
            token.pattern += '|';
          }
          
          /** Initialize new filter */
          filter = addNewFilter(token);          
          addFilter = true;
          ++i; continue;
        }
      break;
      case ',':
        if (addOpts && level.length === 1) {
          if (addFilter) {
            filter.opts.push('');
          } else if (token.type === 'filter') {
            token.opts.push('');
          }

          ++i; continue;
        }
      break;
    }    
    
    if (addOpts) {
      if (addFilter) {
        if (!filter.opts.length) filter.opts.push('');
        filter.opts[filter.opts.length - 1] += expr[i];
      } else {
        token.opts[token.opts.length - 1] += expr[i];
      }
    } else {
      if (addFilter) {
        filter.val += expr[i];
      } else {
        token.val += expr[i];
      }
    }
    
    ++i;
  }
  
  // If we have a valid token that hasn't yet been added to tokens, add it
  if (token.val !== '' || token.type === 'object') {
    tokens.push(token);
  }
  
  tokens.forEach(function(token) {
    token.pattern = token.pattern.trim();
    if (token.opts.length === 1 && token.opts[0] === '') {
      token.opts.pop();
    }
  });
  
  return tokens;
}

