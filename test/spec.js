/* eslint-disable */
'use strict';

/* jshint node:true */
/* globals describe, it */

require('should');
var parsz = require('../dist/index').default;
var nock = require('nock');
var fs = require('fs');

nock('http://www.test.com')
	.get('/')
	.times(4)
	.reply(200, fs.readFileSync(__dirname + '/index.html', 'UTF-8'));

nock('http://www.yelp.com')
	.get('/')
	.times(2)
	.reply(200, fs.readFileSync(__dirname + '/yelp.html', 'UTF-8'))
  .get('/carol')
  .times(1)
  .reply(200, fs.readFileSync(__dirname + '/carol_profile.html', 'UTF-8'))
	.get('/biz/tacorea-san-francisco')
	.times(1)
	.reply(200, fs.readFileSync(__dirname + '/tacorea.html', 'UTF-8'))
	.get('/biz/tacorea-san-francisco?osq=tacos')
	.times(1)
	.reply(200, fs.readFileSync(__dirname + '/tacorea.html', 'UTF-8'))
	.get('/biz/el-farolito-san-francisco-2?osq=tacos')
	.times(1)
	.reply(200, fs.readFileSync(__dirname + '/tacorea.html', 'UTF-8'))
	.get('/biz/street-taco-san-francisco?osq=tacos')
	.times(1)
	.reply(200, fs.readFileSync(__dirname + '/tacorea.html', 'UTF-8'))
	.get('/biz/the-taco-shop-at-underdogs-san-francisco-2?osq=tacos')
	.times(1)
	.reply(200, fs.readFileSync(__dirname + '/tacorea.html', 'UTF-8'))
	.get('/biz/la-taqueria-san-francisco-2?osq=tacos')
	.times(1)
	.reply(200, fs.readFileSync(__dirname + '/tacorea.html', 'UTF-8'))
	.get('/biz/el-rinc%C3%B3n-yucateco-san-francisco-3?osq=tacos')
	.times(1)
	.reply(200, fs.readFileSync(__dirname + '/tacorea.html', 'UTF-8'))
	.get('/biz/taqueria-guadalajara-san-francisco?osq=tacos')
	.times(1)
	.reply(200, fs.readFileSync(__dirname + '/tacorea.html', 'UTF-8'))
	.get('/biz/garaje-san-francisco?osq=tacos')
	.times(1)
	.reply(200, fs.readFileSync(__dirname + '/tacorea.html', 'UTF-8'))
	.get('/biz/nicks-crispy-tacos-san-francisco-2?osq=tacos')
	.times(1)
	.reply(200, fs.readFileSync(__dirname + '/tacorea.html', 'UTF-8'))
	.get('/biz/taqueria-canc%C3%BAn-san-francisco-5?osq=tacos')
	.times(1)
	.reply(200, fs.readFileSync(__dirname + '/tacorea.html', 'UTF-8'))

var tacoPlacesInSanFrancsico = {
  'places(.regular-search-result)': [{
    name: '.biz-name',
    rating: '.biz-rating img@alt|parseFloat',
    phone: '.biz-phone|trim',
    address: 'address|trim',
  }]
};

describe('Parsley', function() {
	it('should parse plain selectors', function(done) {
		parsz(
      {
  			title: 'h1'
  		},
      'http://www.test.com'
    ).then(function(data) {
			data.title.should.equal('Hello World!');
			done();
		}).catch(console.log);
	});
	it('should parse list of elements', function(done) {
		parsz(
      {
  			'links(ul a)': [{
  				name: '.',
  				href: '@href'
  			}]
  		},
      'http://www.test.com'
    ).then(function(data) {
			data.links.length.should.equal(3);
			data.links[0].name.should.equal('A');
			data.links[0].href.should.equal('/a');
			done();
		});
	});
	it('should parse attributes', function(done) {
		parsz(
      {
  			published: '[itemprop=date-published]@content'
  		},
      'http://www.test.com'
    ).then(function(data) {
			data.published.should.equal('01/01/2015');
			done();
		});
	});
	it('should parse array as object prop value', function(done) {
		parsz(
      {
			   'images(img)': ['@src']
		  },
      'http://www.test.com'
    ).then(function(data) {
			data.images[0].should.equal('a.png');
			data.images[1].should.equal('b.jpg');
			done();
		});
	});

  it('should parse yelp reviews', function(done) {
    parsz(
      tacoPlacesInSanFrancsico,
      'http://www.yelp.com'
    ).then(function(data) {
      data.places.filter(function (place) {
        return place.rating > 4;
      }).length.should.equal(4);
      data.places[0].rating.should.equal(4.5);
      data.places[0].name.should.equal('Tacorea');
      data.places[0].phone.should.equal('(415) 885-1325');
			done();
		});
  });

  it('should parse simple remote data', function(done) {
    const url = 'http://www.yelp.com/carol';
    const mapping = {
      name: 'h1|trim',
      'lastReviewedPlace~(.reviews li:first-child a)': {
        name: 'h1|trim',
      },
    };
    parsz(mapping, url, {
      context: 'http://www.yelp.com/',
    })
      .then(function(data) {
        data.name.should.equal('Carol L.');
        data.lastReviewedPlace.name.should.equal('Tacorea');
        done();
      });
  });

	it('should parse deep remote data', function(done) {
    const url = 'http://www.yelp.com/';
    const mapping = {
      'places(.regular-search-result)': [{
        name: '.biz-name',
        'reviews(.review)~(.search-result-title a)': [{
          name: '.user-display-name|trim',
          content: '.review-content p|trim',
        }],
      }],
    };
    parsz(mapping, url, {
      context: 'http://www.yelp.com/',
    })
      .then(function(data) {
        data.places.length.should.equal(10);
        data.places[0].name.should.equal('Tacorea');
        data.places[0].reviews.length.should.equal(21);
        data.places[0].reviews[1].name.should.equal('Carol L.');
        data.places[0].reviews[1].content.should.startWith('This place does Korean');
        done();
      });
  });
});
