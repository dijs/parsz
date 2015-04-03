'use strict';

/* jshint node:true */
/* globals describe, it */

require('should');
var parsz = require('../index');
var nock = require('nock');
var fs = require('fs');

nock('http://www.test.com')
	.get('/')
	.times(4)
	.reply(200, fs.readFileSync(__dirname + '/index.html', 'UTF-8'));

describe('Parsley', function() {
	it('should parse plain selectors', function(done) {
		parsz({
			title: 'h1'
		}, 'http://www.test.com', function(err, data) {
			data.title.should.equal('Hello World!');
			done();
		});
	});
	it('should parse list of elements', function(done) {
		parsz({
			'links(ul a)': [{
				name: '.',
				href: '@href'
			}]
		}, 'http://www.test.com', function(err, data) {
			data.links.length.should.equal(3);
			data.links[0].name.should.equal('A');
			data.links[0].href.should.equal('/a');
			done();
		});
	});
	it('should parse attributes', function(done) {
		parsz({
			published: '[itemprop=date-published] @content'
		}, 'http://www.test.com', function(err, data) {
			data.published.should.equal('01/01/2015');
			done();
		});
	});
	it('should parse array as object prop value', function(done) {
		parsz({
			images: ['img @src']
		}, 'http://www.test.com', function(err, data) {
			data.images[0].should.equal('a.png');
			data.images[1].should.equal('b.jpg');
			done();
		});
	});
});