#!/usr/bin/env node

'use strict';

/* jslint node:true */

var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore');
var program = require('commander');

var nameWithScopePattern = /(\w+)\((.*)\)/;

var log = function(o) {
	if (program.verbose) {
		console.log(o);
	}
};

function select($, selector, filter) {
	if (_.isArray(filter)) {
		return selectList($, selector, filter[0]);
	} else if (_.isArray(selector)) {
		return selectList($, selector[0]);
	} else if (_.isString(selector)) {
		return selectData($, selector);
	} else if (_.isObject(selector)) {
		return selectObject($, selector);
	} else {
		throw new Error('Selector not allowed: ' + selector);
	}
}

function selectObject($, dataMap) {
	log('parsing data map');
	var data = {};
	_.each(dataMap, function(filter, name) {
		var temp = name.match(nameWithScopePattern);
		if (temp) {
			name = temp[1];
			var scope = temp[2];
			log('selecting name with scope: ' + name + '/' + scope);
			data[name] = select($, scope, filter);
		} else {
			log('selecting: ' + filter);
			data[name] = select($, filter);
		}
	});
	return data;
}

function selectList($, selector, dataMap) {
	var results = [];
	if (selector.indexOf('@') !== -1) {
		var temp = selector.split('@');
		selector = temp[0];
		dataMap = '@' + temp[1];
	}
	log('parsing list with selector (' + selector + ') and data-map (' + dataMap + ')');
	$(selector).each(function() {
		results.push(select($(this), dataMap));
	});
	return results;
}

function findSelector(el, selector) {
	return el.find ? el.find(selector) : el(selector);
}

function selectAttr(el, selector) {
	var temp = selector.split('@');
	selector = temp[0].trim();
	var attrName = temp[1].trim();
	return selector.length > 0 ? findSelector(el, selector).attr(attrName) : el.attr(attrName);
}

function selectData(el, selector) {
	var value;
	if (selector === '.') {
		value = el.text();
	} else if (selector.indexOf('@') !== -1) {
		value = selectAttr(el, selector);
	} else {
		value = findSelector(el, selector).text();
	}
	return value;
}

function parse(parselet, url, cb, options) {
	if (options && options.verbose) {
		program.verbose = true;
	}
	request(url, function(err, res, html) {
		if (!err && res.statusCode === 200) {
			var $ = cheerio.load(html);
			cb(null, select($, parselet));
		} else {
			cb(err || new Error('URL returned a status of ' + res.statusCode));
		}
	});
}

if (require.main === module) {
	program
		.version('0.0.1')
		.option('-v, --verbose', 'Verbose mode')
		.option('-u, --url <path>', 'URL to parse')
		.option('-p, --parselet <path>', 'Path to parselet')
		.parse(process.argv);

	parse(require(program.parselet), program.url, function(err, data) {
		if (err) {
			console.log(err);
		}
		console.log(JSON.stringify(data, null, '\t'));
	});
} else {
	module.exports = parse;
}