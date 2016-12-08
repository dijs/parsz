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

nock('http://www.yelp.com')
	.get('/')
	.times(2)
	.reply(200, fs.readFileSync(__dirname + '/yelp.html', 'UTF-8'));

var tacoPlacesInSanFrancsico = {
  'places(.regular-search-result)': [{
    name: '.biz-name',
    rating: '.biz-rating img@alt|parseFloat',
    phone: '.biz-phone|trim',
    address: 'address|trim',
  }]
};

// "reviews(.review)": [{
//   "date": "meta[itemprop=datePublished] @content",
//   "user_name": ".user-name a",
//   "comment": "p[itemprop=description]"
// }]

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

  it('should parse yelp reviews', function(done) {
    parsz(tacoPlacesInSanFrancsico, 'http://www.yelp.com', function(err, data) {
      data.places.filter(function (place) {
        return place.rating > 4;
      }).length.should.equal(4);
      data.places[0].name.should.equal('Tacorea');
      data.places[0].phone.should.equal('(415) 885-1325');
			done();
		});
  });

});
