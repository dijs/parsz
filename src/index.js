import 'babel-polyfill';
import debug from 'debug';
import request from 'request';
import cheerio from 'cheerio';
import { resolve as urlResolve } from 'url';

const log = debug('parsz');

const keyPattern = /(\w+)\(?([^)~]*)\)?~?\(?([^)]*)\)?/;
const selectorPattern = /^([.-\s\w[\]=]+)?@?(\w+)?\|?(\w+)?/;
const IDENTITY_SELECTOR = '.';

const transformations = {
  identity: value => value,
  trim: value => value.trim(),
  parseInt,
  parseFloat,
  floor: Math.floor,
  max: Math.max,
};

const getHtml = url => new Promise((resolve, reject) => {
  request(url, (err, res, html) => {
    if (!err && res.statusCode === 200) {
      resolve(html);
    } else {
      reject(err || new Error(`URL returned a status of ${res.statusCode}`));
    }
  });
});

function parseDataKeyInfo(key) {
  const [, name, scope, linkSelector] = key.match(keyPattern);
  const isRemote = !!linkSelector;
  return {
    name,
    scope,
    linkSelector,
    isRemote,
  };
}

function parseSelectorInfo(smartSelector) {
  const matched = smartSelector.match(selectorPattern);
  if (!matched) {
    throw new Error(`Could not match selector pattern: ${smartSelector}`);
  }
  const [, selector, attr, fn] = matched;
  return {
    selector,
    attr,
    fn,
  };
}

function getItemScope(scope, selector) {
  if (!selector || selector === IDENTITY_SELECTOR) {
    return scope;
  }
  return scope.find ? scope.find(selector) : scope(selector);
}

function getScopeResolver(currentScope, keyInfo, options) {
  return keyInfo.isRemote
    ? new Promise((resolve) => {
      log('Parsing remote data...', keyInfo);
      const linkScope = getItemScope(currentScope, keyInfo.linkSelector);
      const path = linkScope.attr('href');
      const url = urlResolve(options.context, path);
      log(`Requesting ${url}`);
      return getHtml(url)
        .then(html => resolve(cheerio.load(html)));
    })
    : Promise.resolve(currentScope);
}

function parseLocalData(scope, smartSelector) {
  const { selector, attr, fn } = parseSelectorInfo(smartSelector);
  log('Parsing local data with', { selector, attr });
  const item = getItemScope(scope, selector);
  const data = attr ? item.attr(attr) : item.text();
  log(`Parsed local data -> ${data}`);
  if (fn) {
    const transformed = transformations[fn](data);
    log(`Transforming data to "${transformed}"`);
    return Promise.resolve(transformed);
  }
  return Promise.resolve(data);
}

function parseLocalDataListItem(item, itemMap, options) {
  // Handle simple case
  if (typeof itemMap === 'string') {
    return parseLocalData(item, itemMap);
  }
  // Handle another mapping object
  const itemPropertyResolvers = Object.keys(itemMap).map((itemKey) => {
    const keyInfo = parseDataKeyInfo(itemKey);
    const map = itemMap[itemKey];
    return getScopeResolver(item, keyInfo, options)
      .then((scope) => {
        const dataResolver = Array.isArray(map)
        // eslint-disable-next-line no-use-before-define
          ? parseLocalDataList(scope, keyInfo.scope, map[0], options)
          : parseLocalDataListItem(scope, map, options);
        return dataResolver;
      })
      .then((data) => {
        const namedData = {
          key: keyInfo.name,
          data,
        };
        return namedData;
      });
  });
  return Promise.all(itemPropertyResolvers).then((pairs) => {
    const resolvedItem = pairs.reduce((memo, pair) => {
      // eslint-disable-next-line no-param-reassign
      memo[pair.key] = pair.data;
      return memo;
    }, {});
    return resolvedItem;
  });
}

function parseLocalDataList(scope, itemSelector, itemMap, options) {
  log(`Parsing data list of selector (${itemSelector})`);
  const items = getItemScope(scope, itemSelector);
  log(`Items: ${items.length}`);
  return Promise.all(items.map((index, item) => {
    const itemParser = parseLocalDataListItem(scope(item), itemMap, options);
    return itemParser;
  }).get());
}

function parseData(currentScope, key, map, options) {
  const keyInfo = parseDataKeyInfo(key);
  return getScopeResolver(currentScope, keyInfo, options)
    .then((scope) => {
      if (Array.isArray(map)) {
        log(`Parsing list "${keyInfo.name}"...`);
        const itemMap = map[0];
        const itemSelector = keyInfo.scope;
        return parseLocalDataList(scope, itemSelector, itemMap, options);
      }
      log(`Parsing "${keyInfo.name}"...`);
      return parseLocalDataListItem(scope, map);
    });
}

function mapToData(html, map, options) {
  const scope = cheerio.load(html);
  const dataPoints = Object.keys(map).map((key) => {
    const dataParser = parseData(scope, key, map[key], options);
    return dataParser;
  });
  // TODO: I think we need iterative here....
  return Promise.all(dataPoints).then((results) => {
    const data = Object.keys(map).reduce((memo, key, index) => {
      const keyInfo = parseDataKeyInfo(key);
      // eslint-disable-next-line no-param-reassign
      memo[keyInfo.name] = results[index];
      return memo;
    }, {});
    return data;
  });
}

export default function parse(parselet, url, options) {
  log(`Requesting ${url}`);
  return getHtml(url).then(html => mapToData(html, parselet, options));
}
