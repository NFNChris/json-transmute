var jpath = require('JSONPath'),
    moment = require('moment');        

module.exports = function(scope, map) {
  return process(scope, map);
}

function process(scope, map, target, rootScope) {
  target    = target    || {};
  rootScope = rootScope || scope;

  if ('@path' in map) {
    scope = resolve(map['@path'], scope, rootScope).val;
  }
  
  if ('@root' in map) {
    rootScope = resolve(map['@root'], rootScope, rootScope).val;
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
        process(opts.scope, map[key], childVal, rootScope);
      } else {
        childVal = resolve(map[key], result, rootScope).val;
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
      break;
      case 'filter':
        result = filter(token.val, token.opts, scope, rootScope);
      break;
      case 'query':
        result = ( jpath.eval(scope, token.val) || [] );
        
        /** Fix for JSONPath array-wrapping behaviour. */     
        if (result.length === 1 && Array.isArray(result) 
          && Array.isArray(result[0])) {
            result = result[0];
        }
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
      params.forEach(function(param) {
        result = (result || 0) + param; 
      });
    break;
    case 'and':
      result = result || params[0];
      params.forEach(function(param) {
        result = result && param;
      });
    break;
    case 'array':
      result = result ? [ result ] : [];        
      params.forEach(function(param) {
        result.push(param);
      });
    break;
    case 'bool':
      if (result && result.toString().search(/^true|t|yes|y|[1-9]+$/i) >= 0) {
        result = true;
      } else {
        result = false;
      }
    break;
    case 'concat':
      result = params.join(' ');
    break;
    case 'count':
      if (Array.isArray(params[0]) || typeof params[0] === 'string') {
        result = params[0].length;
      } else if (typeof params[0] === 'object') {
        result = Object.keys(params[0]);
      } else {
        result = params[0] ? 1 : 0;
      }
    break;
    case 'decrement':
      --result;
    break;
    case 'default':
      result = result || params[0];
    break;
    case 'filter':
      var filtered = [];
      
      ( Array.isArray(result) ? result : [ result ] ).forEach(function(item) {
        if (!item || !(params[0] in item)) return;
        
        switch (params[2]) {
          case 'eq':
            if (item[params[0]] == params[1]) filtered.push(item);
          break;
          case 'neq':
            if (item[params[0]] != params[1]) filtered.push(item);
          break;
          case 'gt':
            if (item[params[0]] > params[1]) filtered.push(item);
          break;
          case 'gte':
            if (item[params[0]] >= params[1]) filtered.push(item);
          break;
          case 'lt':
            if (item[params[0]] < params[1]) filtered.push(item);
          break;
          case 'lte':
            if (item[params[0]] <= params[1]) filtered.push(item);
          break;
          default:
            if (item[params[0]] == params[1]) filtered.push(item);
          break;
        }
      });
      
      result = filtered;
    break;
    case 'float':
      result = parseFloat(result);      
      if (params[0]) result = parseFloat(result.toFixed(params[0]));
    break;
    case 'gt':
      result = result > params[0];
    break;
    case 'if':
      result = params[0] ? params[1] : params[2];
    break;
    case 'increment':
      ++result;
    break;
    case 'int':
      result = parseInt(result || 0);
    break;
    case 'join':
      result = (result || '').join(params[0] || ',');
    break;
    case 'least':
      var least;
      
      ( Array.isArray(result) ? result : [ result ] ).forEach(function(item) {
        if (!least || params[0] in item && item[params[0]] < least[params[0]]) {
          least = item;
        }
      });
      
      result = least;
    break;
    case 'longest':
      result = params[0][0];    
      params[0].forEach(function(param) {
        if (param.length && param.length > result.length) result = param;
      });
    break;
    case 'lt':
      return result < params[0];
    break;
    case 'lowercase':
      result = result.toLowerCase();
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
    case 'replace':    
      var expr = new RegExp(params[0]);
          
      if ((result || '').match(expr)) {
        result = result.replace(expr, params[1]);
      } else {
        result = params[2];
      }
    break;
    case 'shift':
      result = Array.isArray(result) ? result[0] : [ result ][0];
    break;
    case 'shortest':
      var shortest;    
      
      result.forEach(function(item) {
        if (!item) return;
      
        if (!shortest || (item.length && item.length < shortest.length)) {
          shortest = item;
        }
      });
      
      result = shortest;
    break;
    case 'date':
      switch (params[0]) {
        case 's':
          result = moment(result).unix();
        break;
        case 'ms':
          result = moment(result).valueOf();
        break;
        case 'json':
        default:
          result = moment(result).toJSON();
        break;
      }
    break;
    case 'uppercase':
      result = result.toUpperCase();
    break;
  }
      
  return result;
}

function parse(expr) {
  var filter    = { val: '', opts: [ '' ], type: 'filter' },
      tokens    = [],
      level     = [],
      addOpts   = false,
      addFilter = false,
      i         = 0;
      
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
  
  /** Initialize token */
  var token = getNewToken();
  
  while(i < expr.length) {
    token.pattern += expr[i];
    
    switch (expr[i]) {
      case '\'':      
        /** A single quote at root level is a static value delimeter */
        if (level[level.length - 1] === expr[i]) {
          level.pop();
          token.type = 'static';
          ++i; continue;
        } else if (!level.length) {
          level.push(expr[i]);
          ++i; continue;
        }        
      break;
      /** Deprecated - We can probably get rid of JSON Query now */
      case '$':
        /** A dollar sign at the start of a new token is a query */
        if (token.val === '' && level[level.length - 1] !== '\'') {
          token.type = 'query';
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
        if (level.length === 1 && token.val !== '' && token.type !== 'query') {
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
        if (level[level.length -1] === expr[i]) {
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
              token.filters.push(filter);
              tokens.push(token);
              token = getNewToken();
              
              /** Exit filter state and initialize new filter */
              filter = { val: '', opts: [ '' ], type: 'filter' },
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
  if (filter.val !== '') tokens[tokens.length - 1].filters.push(filter);  
  
  tokens.forEach(function(token) {
    token.pattern = token.pattern.trim();
    if (token.opts.length === 1 && token.opts[0] === '') {
      token.opts.pop();
    }
  });
  
  return tokens;
}


