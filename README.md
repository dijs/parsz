# pársz
### - The language engine and tool for web parsing

This is a Javascript rewrite of [https://github.com/fizx/parsley](https://github.com/fizx/parsley).

## Usage

Install globally from npm

``` bash
$ sudo npm install -g parsz
```

Learn options from help

```bash
$ parsz --help
```

The tool uses a "parselet" as a recipe/filter to parse a website.

The structure of the parselet is JSON.

Here is an example of a parselet for grabbing business data from Yelp:

```json
{
  "name": "h1",
  "phone": ".biz-phone",
  "address": "address",
  "reviews(.review)": [{
    "date": "meta[itemprop=datePublished] @content",
    "user_name": ".user-name a",
    "comment": "p[itemprop=description]"
  }]
}
```

## As a Module

You can also use parsz as a module which loads in as one function:

```javascript
var parsz = require('parsz');
parsz([Parselet JSON], [URL], function(err, data) {
	// Do something with the data
});
```

## Future

There is much to be done, although it is currently a *very* useful tool! 