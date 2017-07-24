var crypto = require('crypto');

module.exports = function(scope, map) {
  return transmute(scope, map);
}

function transmute(scope, map, target, rootScope) {
  target    = target    || {};
  rootScope = rootScope || scope;
  
  if ('@root' in map) {
    rootScope = resolve(map['@root'], rootScope, rootScope).val;
  }

  if ('@path' in map) {
    scope = resolve(map['@path'], scope, rootScope).val;
  }
  
  /** Ensure array format for scope */
  var results = Array.isArray(scope) ? scope : [ scope ];

  /** Iterate over each element in scope */
  results.forEach(function(result, idx) {
    var child = {};
  
    Object.keys(map || {}).forEach(function(key) {
      var opts  = resolve(key, result, rootScope, true),
          childVal = opts.type === 'array' ? [] : {};
      
      /** Recursively process object key values */
      if (typeof map[key] === 'object') {
        transmute(opts.scope, map[key], childVal, rootScope);
      } else {
        childVal = resolve(map[key], opts.scope, rootScope).val;
      }
      
      assign(Array.isArray(target) ? child : target, childVal, opts);
    });

    if (Array.isArray(target) && !((Array.isArray(child) && !child.length) 
      || (typeof child === 'object' && !Object.keys(child).length))) {
        target.push(child);
    }
  });
  
  return target;
}

function assign(parent, val, opts) {
  var target   = parent,
      keyParts = opts.val.toString().split('.');
   
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
     
    target = target[keyPart];
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
      case 'array':
        type = 'array';
      case 'object':
        if (token.opts.length) {
          childScope = resolve(token.opts[0], scope, rootScope).val;
        }
      case 'lookup':
        result = token.root ? rootScope : scope; 
        token.val.split('.').some(function(key) {
          if (typeof result === 'object' && key in result) {
            result = result[key];
          } else {
            result = isKey ? token.val : undefined;
            return true;
          }
        });
        
        // If result is an object, make a copy to preserve source scope data
        if (Array.isArray(result)) {
          result = result.slice();
        } else if (typeof result === 'object') {
          result = JSON.parse(JSON.stringify(result));
        }
      break;
      case 'filter':
        result = filter(token.val, token.opts, scope, rootScope);
      break;
      case 'static':
        result = token.val;
      break;
    }
    
    /** Apply filters associated with this token */
    token.filters.forEach(function(tokenFilter) {
      var val  = tokenFilter.val,
          opts = tokenFilter.opts;
          
      result = filter(val, opts, scope, rootScope, result);
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

function filter(type, params, scope, rootScope, result) {
  params.forEach(function(param, idx) {
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
      result = result ? isTruthy(result) : isTruthy(params[0]);
      params.forEach(function(param) {
        result = result && isTruthy(param);
      });
    break;
    case 'array':
      result = result ? [ result ] : [];        
      params.forEach(function(param) {
        result.push(param);
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
      } else if (typeof result === 'object') {
        result = Object.keys(result);
      } else {
        result = result ? 1 : 0;
      }
    break;
    case 'date':
      switch (( params[0] || 'json').toLowerCase()) {
        case 'unix':
          result = new Date(result).getSeconds();
        break;
        case 'javascript':
          result = new Date(result).getMilliseconds();
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
        if (!item || !(params[0] in item)) return;
        
        switch (params[1]) {
          case '=':
            if (item[params[0]] == params[2]) filtered.push(item);
          break;
          case '!=':
            if (item[params[0]] != params[2]) filtered.push(item);
          break;
          case '>':
            if (item[params[0]] > params[2]) filtered.push(item);
          break;
          case '>=':
            if (item[params[0]] >= params[2]) filtered.push(item);
          break;
          case '<':
            if (item[params[0]] < params[2]) filtered.push(item);
          break;
          case '<=':
            if (item[params[0]] <= params[2]) filtered.push(item);
          break;
          default:
            if (item[params[0]] == params[2]) filtered.push(item);
          break;
        }
      });
      
      result = filtered;
    break;
    case 'float':
      result = parseFloat(result);      
      result = parseFloat(result.toFixed(params[0] ? params[0] : 2));
    break;
    case 'gt':
      result = result > params[0];
    break;
    case 'hash':
      var hashStr = JSON.stringify(result);
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
    case 'lt':
      return result < params[0];
    break;
    case 'lowercase':
      result = result.toLowerCase();
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
      Object.keys(result).forEach(function(key) {
        if (params.indexOf(key) < 0) delete result[key];
      });      
    break;
    case 'push':
      result = Array.isArray(result) ? result : [ result ];
      
      params.forEach(function(param) {
        result.push(param);
      });            
    break;
    case 'reduce':
      var val;
    
      ( Array.isArray(result) ? result : [ result ] ).forEach(function(item) {
        if (!val) {
          val = item;
        } else if (!params[1] || params[0] in item) {
          var itemKeyVal = params[1] ? item[params[0]] : item,
              valKeyVal = params[1] ? val[params[0]] : val;
        
          switch (( params[1] || params[0] ).toLowerCase()) {
            case 'largest':
              if (itemKeyVal > valKeyVal) val = item;
            break;
            case 'longest':
              if (((typeof itemKeyVal === 'string' && typeof valKeyVal === 'string') 
                || ('length' in itemKeyVal && 'length' in valKeyVal))
                && itemKeyVal.length > valKeyVal.length) val = item;
            break;
            case 'shortest':
              if (((typeof itemKeyVal === 'string' && typeof valKeyVal === 'string') 
                || ('length' in itemKeyVal && 'length' in valKeyVal))
                && itemKeyVal.length < valKeyVal.length) val = item;
            break;
            case 'smallest':
              if (itemKeyVal < valKeyVal) val = item;
            break;
          }
        }
      });
      
      result = val;
    break;
    case 'replace':    
      var expr = new RegExp(params[0]);
          
      if ((result || '').match(expr)) {
        result = result.replace(expr, params[1]);
      } else {
        result = params[2];
      }
    break;
    case 'slice':
      if (Array.isArray(result) || typeof result === 'string') {
        result = result.slice(parseInt(params[0] || 0), parseInt(params[1] || 0));
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
      
      if (result) {
        if (typeof result === 'object') {
          Object.keys(result).forEach(function(key) {
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
      if (val.search(/^true|yes|t|y$/i) >= 0) {
        truthy = true;
      } else if (+val > 0 || +val < 0) {
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
        if (Object.keys(val).length > 0) {
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

function parse(expr) {
  var tokens    = [],
      level     = [],
      addOpts   = false,
      addFilter = false,
      i         = 0,
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

          if (!level.length) {
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
        if (token.val === '' && level[level.length - 1] !== '\'') {
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
        level.push(']');
        if (level.length === 1 && token.val !== '') {
          token.type = 'array';
          addOpts = true;
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
          token.pattern = "{{";

          /** Advance expr pointer past handlebar opening notation */
          level.push('}');
          ++i; ++i; continue;
        }

        /** Check for object notation */
        if (level.length === 1 && token.val !== '') {
          token.type = 'object';
          addOpts = true;
          ++i; continue;
        }
      break;
      case '}':
        /** Check for handlebar closing token notation */
        if (expr[i + 1] === '}' && level[level.length - 1] === '}'
          && level[level.length - 2] === '}') 
        {
          if (token.val !== '') {
            token.pattern += '}';
            tokens.push(token);
          }
          
          token = getNewToken();
          ++i; ++i; level.pop(); level.pop();
          continue;
        }
      case ')':
      case ']':
        if (level[level.length - 1] === expr[i]) {
          level.pop();
        }
        
        if (addOpts && !level.length) {
          addOpts = false;
          ++i; continue;
        }
      break;
      case ' ':      
        /** A space at root level is a token delimeter */        
        if (!level.length) {
        
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
        if (!level.length) {
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
  
  if (token.val  !== '') tokens.push(token);
  
  tokens.forEach(function(token) {
    token.pattern = token.pattern.trim();
    if (token.opts.length === 1 && token.opts[0] === '') {
      token.opts.pop();
    }
  });
  
  return tokens;
}


