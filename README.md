# fuse-immutable

*Lightweight fuzzy-search for Immutable.js (Based on [Fuse.js by krisk](https://github.com/krisk/Fuse))*

[![Twitter URL](https://img.shields.io/twitter/url/https/twitter.com/fold_left.svg?style=social&label=Follow%20%40chadallenwatson)](https://twitter.com/chadallenwatson)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [How is this different than Fuse.js?](#how-is-this-different-than-fuse-js)
- [Contributing](#contributing)
  - [Coding conventions](#coding-conventions)
  - [Testing](#testing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## How is this different than Fuse.js?

The obvious difference is that it works with Immutable.js data. Instead of an array for your `list` argument, pass in an Immutable.List.

One other key difference is the results when using `tokenize` and `matchAllTokens` together. Fuse.js will return items that have a single value that matches all tokens. fuse-immutable returns items where each token can be found *somewhere* in the item.

```javascript
import { fromJS } from 'immutable'
import Fuse from 'fuse'

const list = fromJS([{
  title: 'Jackson',
  author: 'Steve Pearson',
  tags: ['Kevin Wong', 'Victoria Adam', 'John Smith']
}, {
  title: 'The life of Jane',
  author: 'John Smith',
  tags: ['Jane', 'Jackson', 'Sam']
}, {
  title: 'The life of John',
  author: 'Jane Wong',
  tags: ['Victoria Adam', 'John Pearson']
}])

const options = {
  threshold: 0,
  tokenize: true,
  matchAllTokens: true,
}

const fuse = new Fuse(list, options)

console.log(fuse.search('Jackson Wong'))
// List [
//   Map {
//    "title": "Jackson",
//    "author": "Steve Pearson",
//    "tags": List [ "Kevin Wong", "Victoria Adam", "John Smith" ]
//   }
//  ]
```

## Contributing

### Coding conventions

Code should be run through [Standard Format](https://www.npmjs.com/package/standard-format).

### Testing

Before submitting a pull request, please add relevant tests in `test/index.js`, and execute them via `npm test`.
