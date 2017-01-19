# pársz
### - A tool for parsing the web

[![NPM Version](https://img.shields.io/npm/v/parsz.svg)](https://www.npmjs.com/package/parsz)

## Usage

Install globally from npm/yarn

``` bash
$ npm install -g parsz
```

View options from help menu

```bash
$ parsz --help
```

Use a "parselet" as a recipe/filter to parse a website.

The structure of the parselet is JSON.

Here is an example of a parselet for grabbing business data from a Yelp page:

```json
{
  "name": "h1|trim",
  "phone": ".biz-phone|trim",
  "address": "address|trim",
  "reviews(.review)": [{
    "date": "meta[itemprop=datePublished] @content",
    "name": ".user-name a",
    "comment": ".review-content p"
  }]
}
```

## As a module

You can also use parsz as a module:

```js
import parsz from 'parsz';

parsz([Parselet JSON], [URL]).then(data => {
  // Do something with the data
});
```

## Tips

This is a very general purpose and flexible tool. But here are some tips for getting started.

### Grabbing a list of data

Use a reference selector in the key and an Array as the value.

```json
{
  "users(.user)": [{
    "name": ".name",
    "age": ".age",
  }]
}
```

### Use transformation functions on data

Add a pipe (|) and the transformation name after the data selector.

```json
{
  "user": {
    "name": ".name|trim",
    "age": ".age|parseInt",
    "worth": ".age|parseFloat",
    "someNumber": ".age|floor",
  }
}
```

*If anyone would like to see a certain, helpful transformation function added, please just open a issue*

### Grabbing an attribute

Use a (@) symbol to reference an attribute.

```json
{
  "user": {
    "name": ".name",
    "nickname": ".name@data-nickname",
  }
}
```

### Grabbing remote data

Use a (~) and a link selector to reference external content. The mapping (value) will be relative to that new external scope.

```json
{
  "user": {
    "name": ".name",
    "company~(a.company)": {
      "name": ".company-name",
      "address": ".company-address",
    },
  }
}
```

Have fun!
