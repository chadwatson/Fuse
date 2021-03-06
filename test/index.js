const assert = require('assert')
const vows = require('vows')
const { List, OrderedMap, fromJS, Seq, isKeyed } = require('immutable')
const Fuse = require('../dist/fuse-immutable')
const books = require('./fixtures/books.json')

const verbose = false

vows.describe('Flat list of strings: ["Apple", "Orange", "Banana"]').addBatch({
  'Flat:': {
    topic: function() {
      var fruits = List.of('Apple', 'Orange', 'Banana')
      var fuse = new Fuse(fruits, {
        verbose: verbose
      })
      return fuse
    },
    'When searching for the term "Apple"': {
      topic: function (fuse) {
        var result = fuse.search('Apple')
        return result
      },
      'we get a list of containing 1 item, which is an exact match': function (result) {
        assert.equal(result.size, 1)
      },
      'whose value is "Apple"': function (result) {
        assert.equal(result.first(), 'Apple')
      },
    },
    'When performing a fuzzy search for the term "ran"': {
      topic: function (fuse) {
        var result = fuse.search('ran')
        return result
      },
      'we get a list of containing 2 items: [1, 2]': function (result) {
        assert.equal(result.size, 2)
      },
      'whose values are "Orange" and "Banana"': function (result) {
        assert.equal(result.first(), 'Orange')
        assert.equal(result.get(1), 'Banana')
      },
    },
    'When performing a fuzzy search for the term "nan"': {
      topic: function (fuse) {
        var result = fuse.search('nan')
        return result
      },
      'we get a list of containing 2 items: [2, 1]': function (result) {
        assert.equal(result.size, 2)
      },
      'whose values are "Banana" and "Orange"': function (result) {
        assert.equal(result.first(), 'Banana')
        assert.equal(result.get(1), 'Orange')
      },
    }
  }
}).export(module)

vows.describe('List of books - searching "title" and "author"').addBatch({
  'Books:': {
    topic: function() {
      var options = {
        keys: ['title', 'author'],
        verbose: verbose,
        tokenize: true
      }
      var fuse = new Fuse(fromJS(books), options)
      return fuse
    },
    'When searching for the term "HTML5"': {
      topic: function (fuse) {
        var result = fuse.search('HTML5')
        return result
      },
      'we get a list of containing 3 items': function (result) {
        assert.equal(result.size, 3)
      },
      'whose value is { title: "HTML5", author: "Remy Sharp" }': function (result) {
        assert.deepEqual(result.first(), fromJS({
          title: 'HTML5',
          author: 'Remy Sharp'
        }))
      },
    },
    'When searching for the term "Woodhouse"': {
      topic: function (fuse) {
        var result = fuse.search('Jeeves Woodhouse')
        return result
      },
      'we get a list of containing 6 items': function (result) {
        assert.equal(result.size, 6)
      },
      'which are all the books written by "P.D. Woodhouse"': function (result) {
        var output = Seq(fromJS([
          { title: 'Right Ho Jeeves', author: 'P.D. Woodhouse' },
          { title: 'Thank You Jeeves', author: 'P.D. Woodhouse' },
          { title: 'The Code of the Wooster', author: 'P.D. Woodhouse' },
          { title: 'The Lock Artist', author: 'Steve Hamilton' },
          { title: 'the wooster code', author: 'aa' },
          { title: 'The code of the wooster', author: 'aa' }
        ]))
        assert.equal(output.equals(result), true)
      }
    },
    'When searching for the term "brwn"': {
      topic: function (fuse) {
        var result = fuse.search('brwn')
        return result
      },
      'we get a list of containing at least 3 items': function (result) {
        assert.isTrue(result.size > 3)
      },
      'and the first 3 items should be all the books written by Dan Brown': function (result) {
        assert.deepEqual(result.first(), fromJS({
          'title': 'The DaVinci Code',
          'author': 'Dan Brown'
        }))
        assert.deepEqual(result.get(1), fromJS({
          'title': 'Angels & Demons',
          'author': 'Dan Brown'
        }))
        assert.deepEqual(result.get(2), fromJS({
          'title': 'The Lost Symbol',
          'author': 'Dan Brown'
        }))
      },
    }
  }
}).export(module)

vows.describe('Deep key search, with ["title", "author.firstName"]').addBatch({
  'Deep:': {
    topic: function() {
      var books = fromJS([{
        'title': "Old Man's War",
        'author': {
          'firstName': 'John',
          'lastName': 'Scalzi'
        }
      }, {
        'title': 'The Lock Artist',
        'author': {
          'firstName': 'Steve',
          'lastName': 'Hamilton'
        }
      }, {
        'title': 'HTML5',
      }, {
        'title': 'A History of England',
        'author': {
          'firstName': 1066,
          'lastName': 'Hastings'
        }
      }])
      var options = {
        keys: ['title', 'author.firstName'],
        verbose: verbose
      }
      var fuse = new Fuse(books, options)
      return fuse
    },
    'When searching for the term "Stve"': {
      topic: function (fuse) {
        var result = fuse.search('Stve')
        return result
      },
      'we get a list of containing at least 1 item': function (result) {
        assert.isTrue(result.size > 0)
      },
      'whose first value is found': function (result) {
        assert.deepEqual(result.first(), fromJS({
          'title': 'The Lock Artist',
          'author': {
            'firstName': 'Steve',
            'lastName': 'Hamilton'
          }
        }))
      },
    },
    'When searching for the term 106': {
      topic: function (fuse) {
        var result = fuse.search('106')
        return result
      },
      'we get a list of exactly 1 item': function (result) {
        assert.isTrue(result.size > 0)
      },
      'whose first value is found': function (result) {
        assert.deepEqual(result.first(), fromJS({
          'title': 'A History of England',
          'author': {
            'firstName': 1066,
            'lastName': 'Hastings'
          }
        }))
      },
    }
  }
}).export(module)

vows.describe('Custom search function, with ["title", "author.firstName"]').addBatch({
  'Deep:': {
    topic: function() {
      var books = fromJS([{
        'title': "Old Man's War",
        'author': {
          'firstName': 'John',
          'lastName': 'Scalzi'
        }
      }, {
        'title': 'The Lock Artist',
        'author': {
          'firstName': 'Steve',
          'lastName': 'Hamilton'
        }
      }])
      var options = {
        keys: ['title', 'author.firstName'],
        getFn: function (obj, path) {
          if (!obj) {
            return null
          }
          obj = obj.getIn(['author', 'lastName'])
          return obj
        }
      }
      var fuse = new Fuse(books, options)
      return fuse
    },
    'When searching for the term "Hmlt"': {
      topic: function (fuse) {
        var result = fuse.search('Hmlt')
        return result
      },
      'we get a list of containing at least 1 item': function (result) {
        assert.isTrue(result.size > 0)
      },
      'whose first value is found': function (result) {
        assert.deepEqual(result.first(), fromJS({
          'title': 'The Lock Artist',
          'author': {
            'firstName': 'Steve',
            'lastName': 'Hamilton'
          }
        }))
      },
    },
    'When searching for the term "Stve"': {
      topic: function (fuse) {
        var result = fuse.search('Stve')
        return result
      },
      'we get a list of containing at least no items': function (result) {
        // assert.isTrue(result.size > 0)
        assert.equal(result.size, 0)
      },
    }
  }
}).export(module)

vows.describe('Include score in result list: ["Apple", "Orange", "Banana"]').addBatch({
  'Options:': {
    topic: function() {
      var fruits = List.of('Apple', 'Orange', 'Banana')
      var fuse = new Fuse(fruits, {
        includeScore: true,
        verbose: verbose
      })
      return fuse
    },
    'When searching for the term "Apple"': {
      topic: function (fuse) {
        var result = fuse.search('Apple')
        return result
      },
      'we get a list of containing 1 item, which is an exact match': function (result) {
        assert.equal(result.size, 1)
      },
      'whose value and score exist': function (result) {
        assert.equal(result.first().get('item'), 'Apple')
        assert.equal(result.first().get('score'), 0)
      },
    },
    'When performing a fuzzy search for the term "ran"': {
      topic: function (fuse) {
        var result = fuse.search('ran')
        return result
      },
      'we get a list of containing 2 items': function (result) {
        assert.equal(result.size, 2)
      },
      'whose items are the matched values, and have non-zero scores': function (result) {
        assert.equal(result.first().get('item'), 'Orange')
        assert.equal(result.getIn([1, 'item']), 'Banana')
        assert.isNotZero(result.first().get('score'))
        assert.isNotZero(result.getIn([1, 'score']))
      },
    }
  }
}).export(module)

vows.describe('Only include ID in results list, with "ISBN"').addBatch({
  'Options:': {
    topic: function() {
      var books = fromJS([{
        'ISBN': '0765348276',
        'title': "Old Man's War",
        'author': 'John Scalzi'
      }, {
        'ISBN': '0312696957',
        'title': 'The Lock Artist',
        'author': 'Steve Hamilton'
      }])
      var options = {
        keys: ['title', 'author'],
        id: 'ISBN'
      }
      var fuse = new Fuse(books, options)
      return fuse
    },
    'When searching for the term "Stve"': {
      topic: function (fuse) {
        var result = fuse.search('Stve')
        return result
      },
      'we get a list containing 1 item': function (result) {
        assert.equal(result.size, 1)
      },
      'whose value is the ISBN of the book': function (result) {
        assert.equal(result.first(), '0312696957')
      },
    }
  }
}).export(module)

vows.describe('Include both ID and score in results list').addBatch({
  'Options:': {
    topic: function() {
      var books = fromJS([{
        'ISBN': '0765348276',
        'title': "Old Man's War",
        'author': 'John Scalzi'
      }, {
        'ISBN': '0312696957',
        'title': 'The Lock Artist',
        'author': 'Steve Hamilton'
      }])
      var options = {
        keys: ['title', 'author'],
        id: 'ISBN',
        includeScore: true,
        verbose: verbose
      }
      var fuse = new Fuse(books, options)
      return fuse
    },
    'When searching for the term "Stve"': {
      topic: function (fuse) {
        var result = fuse.search('Stve')
        return result
      },
      'we get a list containing 1 item': function (result) {
        assert.equal(result.size, 1)
      },
      'whose value is the ISBN of the book': function (result) {
        assert.equal(result.first().get('item'), '0312696957')
      },
      'and has a score different than zero': function (result) {
        assert.isNotZero(result.first().get('score'))
      }
    }
  }
}).export(module)

vows.describe('Search when IDs are numbers').addBatch({
  'Options:': {
    topic: function() {
      var books = fromJS([{
        'ISBN': 1111,
        'title': "Old Man's War",
        'author': 'John Scalzi'
      }, {
        'ISBN': 2222,
        'title': 'The Lock Artist',
        'author': 'Steve Hamilton'
      }])
      var options = {
        keys: ['title', 'author'],
        id: 'ISBN',
        includeScore: true,
        verbose: verbose
      }
      var fuse = new Fuse(books, options)
      return fuse
    },
    'When searching for the term "Stve"': {
      topic: function (fuse) {
        var result = fuse.search('Stve')
        return result
      },
      'we get a list containing 1 item': function (result) {
        assert.equal(result.size, 1)
      },
      'whose value is the ISBN of the book': function (result) {
        assert.equal(result.first().get('item'), 2222)
      },
      'and has a score different than zero': function (result) {
        assert.isNotZero(result.first().get('score'))
      }
    }
  }
}).export(module)

vows.describe('Recurse into arrays').addBatch({
  'Options:': {
    topic: function () {
      var books = fromJS([{
        'ISBN': '0765348276',
        'title': "Old Man's War",
        'author': 'John Scalzi',
        'tags': ['fiction']
      }, {
        'ISBN': '0312696957',
        'title': 'The Lock Artist',
        'author': 'Steve Hamilton',
        'tags': ['fiction']
      }, {
        'ISBN': '0321784421',
        'title': 'HTML5',
        'author': 'Remy Sharp',
        'tags': ['web development', 'nonfiction']
      }])
      var options = {
        keys: ['tags'],
        id: 'ISBN',
        threshold: 0,
        verbose: verbose,
        includeMatches: true
      }
      var fuse = new Fuse(books, options)
      return fuse
    },
    'When searching for the tag "nonfiction"': {
      topic: function (fuse) {
        var result = fuse.search('nonfiction')
        return result
      },
      'we get a list containing 1 item': function (result) {
        assert.equal(result.size, 1)
      },
      'whose value is the ISBN of the book': function (result) {
        assert.equal(result.first().get('item'), '0321784421')
      },
      'with matched tag provided': function (result) {
        const matches = result.first().get('matches')
        assert.equal(matches.first().equals(fromJS({
          key: 'tags',
          value: 'nonfiction',
          indices: [[0, 9]]
        })), true)
      }
    }
  }
}).export(module)

vows.describe('Recurse into objects in arrays').addBatch({
  'Options:': {
    topic: function() {
      var books = fromJS([{
        'ISBN': '0765348276',
        'title': "Old Man's War",
        'author': {
          'name': 'John Scalzi',
          'tags': [{
            value: 'American'
          }]
        }
      }, {
        'ISBN': '0312696957',
        'title': 'The Lock Artist',
        'author': {
          'name': 'Steve Hamilton',
          'tags': [{
            value: 'American'
          }]
        }
      }, {
        'ISBN': '0321784421',
        'title': 'HTML5',
        'author': {
          'name': 'Remy Sharp',
          'tags': [{
            value: 'British'
          }]
        }
      }])
      var options = {
        keys: ['author.tags.value'],
        id: 'ISBN',
        threshold: 0,
        verbose: verbose
      }
      var fuse = new Fuse(books, options)
      return fuse
    },
    'When searching for the author tag "British"': {
      topic: function (fuse) {
        var result = fuse.search('British')
        return result
      },
      'we get a list containing 1 item': function (result) {
        assert.equal(result.size, 1)
      },
      'whose value is the ISBN of the book': function (result) {
        assert.equal(result.first(), '0321784421')
      }
    }
  }
}).export(module)

vows.describe('Searching by ID').addBatch({
  'Options:': {
    topic: function() {
      var books = fromJS([{
        'ISBN': 'A',
        'title': "Old Man's War",
        'author': 'John Scalzi'
      }, {
        'ISBN': 'B',
        'title': 'The Lock Artist',
        'author': 'Steve Hamilton'
      }])
      var options = {
        keys: ['title', 'author'],
        id: 'ISBN'
      }
      var fuse = new Fuse(books, options)
      return fuse
    },
    'When searching for the term "Stve"': {
      topic: function (fuse) {
        var result = fuse.search('Stve')
        return result
      },
      'we get a list containing 1 item': function (result) {
        assert.equal(result.size, 1)
      },
      'whose value is the ISBN of the book': function (result) {
        assert.isString(result.first())
        assert.equal(result.first(), 'B')
      },
    }
  }
}).export(module)

vows.describe('Set new list on Fuse').addBatch({
  'Options:': {
    topic: function() {
      var fruits = List.of('Apple', 'Orange', 'Banana')
      var vegetables = List.of('Onion', 'Lettuce', 'Broccoli')

      var fuse = new Fuse(fruits, {
        verbose: verbose
      })
      fuse.setCollection(vegetables)
      return fuse
    },
    'When searching for the term "Apple"': {
      topic: function (fuse) {
        var result = fuse.search('Lettuce')
        return result
      },
      'we get a list of containing 1 item, which is an exact match': function (result) {
        assert.equal(result.size, 1)
      },
      'whose value is "Lettuce"': function (result) {
        assert.equal(result.first(), 'Lettuce')
      },
    }
  }
}).export(module)

vows.describe('Searching by nested ID').addBatch({
  'Options:': {
    topic: function() {
      var books = fromJS([{
        'ISBN': {
          'name': 'A'
        },
        'title': "Old Man's War",
        'author': 'John Scalzi'
      }, {
        'ISBN': {
          'name': 'B'
        },
        'title': 'The Lock Artist',
        'author': 'Steve Hamilton'
      }])
      var options = {
        keys: ['title', 'author'],
        id: 'ISBN.name'
      }
      var fuse = new Fuse(books, options)
      return fuse
    },
    'When searching for the term "Stve"': {
      topic: function (fuse) {
        var result = fuse.search('Stve')
        return result
      },
      'we get a list containing 1 item': function (result) {
        assert.equal(result.size, 1)
      },
      'whose value is the ISBN of the book': function (result) {
        assert.isString(result.first())
        assert.equal(result.first(), 'B')
      },
    }
  }
}).export(module)

vows.describe('Searching list').addBatch({
  'Options:': {
    topic: function() {
      var items = List.of('FH Mannheim', 'University Mannheim')
      var fuse = new Fuse(items)
      return fuse
    },
    'When searching for the term "Uni Mannheim"': {
      topic: function (fuse) {
        var result = fuse.search('Uni Mannheim')
        return result
      },
      'we get a list containing 2 items': function (result) {
        assert.equal(result.size, 2)
      },
      'whose first value is the index of "University Mannheim"': function (result) {
        assert.equal(result.first(), 1)
      }
    }
  }
}).export(module)

vows.describe('Searching list').addBatch({
  'Options:': {
    topic: function() {
      var items = List.of(
        'Borwaila hamlet',
        'Bobe hamlet',
        'Bo hamlet',
        'Boma hamlet')

      var fuse = new Fuse(items, {
        includeScore: true,
        verbose: verbose
      })
      return fuse
    },
    'When searching for the term "Bo hamet"': {
      topic: function (fuse) {
        var result = fuse.search('Bo hamet')
        return result
      },
      'we get a list containing 4 items': function (result) {
        assert.equal(result.size, 4)
      },
      'whose first value is "Bo hamlet"': function (result) {
        assert.equal(result.first().get('item'), 'Bo hamlet')
      }
    }
  }
}).export(module)

vows.describe('List of books - searching for long pattern length > 32').addBatch({
  'Books:': {
    topic: function() {
      var options = {
        keys: ['title'],
        verbose: verbose
      }
      var fuse = new Fuse(fromJS(books), options)
      return fuse
    },
    'When searching for the term "HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5 HTML5"': {
      topic: function (fuse) {
        var result = fuse.search('HTML5 ')
        return result
      },
      'we get a a non empty list': function (result) {
        assert.isTrue(!!result.size)
      },
      'whose first value is { title: "HTML5", author: "Remy Sharp" }': function (result) {
        assert.deepEqual(result.first(), fromJS({
          title: 'HTML5',
          author: 'Remy Sharp'
        }))
      },
    }
  }
}).export(module)

vows.describe('Weighted search').addBatch({
  'Books:': {
    topic: function() {
      var items = fromJS([{
        title: "Old Man's War fiction",
        author: 'John X',
        tags: ['war']
      }, {
        title: 'Right Ho Jeeves',
        author: 'P.D. Mans',
        tags: ['fiction', 'war']
      }])
      return items
    },
    'When searching for the term "Man", where the author is weighted higher than title': {
      topic: function (items) {
        var options = {
          keys: [{
            name: 'title',
            weight: 0.3
          }, {
            name: 'author',
            weight: 0.7
          }],
          verbose: verbose
        }
        var fuse = new Fuse(items, options)
        var result = fuse.search('Man')
        return result
      },
      'We get the value { title: "Right Ho Jeeves", author: "P.D. Mans" }': function (result) {
        assert.deepEqual(result.first().get('title'), 'Right Ho Jeeves')
      },
    },
    'When searching for the term "Man", where the title is weighted higher than author': {
      topic: function (items) {
        var options = {
          keys: [{
            name: 'title',
            weight: 0.7
          }, {
            name: 'author',
            weight: 0.3
          }],
          verbose: verbose
        }
        var fuse = new Fuse(items, options)
        var result = fuse.search('Man')
        return result
      },
      'We get the value for "John X"': function (result) {
        assert.deepEqual(result.first().get('author'), 'John X')
      },
    },
    'When searching for the term "war", where tags are weighted higher than all other keys': {
      topic: function (items) {
        var options = {
          keys: [{
            name: 'title',
            weight: 0.8
          }, {
            name: 'author',
            weight: 0.3
          }, {
            name: 'tags',
            weight: 0.2
          }],
          verbose: verbose
        }
        var fuse = new Fuse(items, options)
        var result = fuse.search('fiction')
        return result
      },
      'We get the value for "P.D. Mans"': function (result) {
        assert.deepEqual(result.first().get('author'), 'P.D. Mans')
      },
    }
  }
}).export(module)

vows.describe('Search location').addBatch({
  'Books:': {
    topic: function () {
      var items = fromJS([{
        name: 'Hello World'
      }])
      var options = {
        keys: ['name'],
        verbose: verbose,
        includeScore: true,
        includeMatches: true
      }
      var fuse = new Fuse(items, options)
      return fuse
    },
    'When searching for the term "wor"': {
      topic: function (fuse) {
        var result = fuse.search('wor')
        return result
      },
      'we get a a non empty list': function (result) {
        assert.isTrue(!!result.size)
      },
      'whose indices are found': function (result) {
        var matches = result.first().get('matches')
        var a = matches.first().get('indices').first()
        var b = matches.first().get('indices').get(1)
        assert.deepEqual(a, List.of(4, 4))
        assert.deepEqual(b, List.of(6, 8))
      },
      'with original text value': function (result) {
        var matches = result.first().get('matches')
        assert.equal(matches.first().get('value'), 'Hello World')
      }
    }
  }
}).export(module)

vows.describe('Search with match all tokens: ["AustralianSuper - Corporate Division", "Aon Master Trust - Corporate Super", "Promina Corporate Superannuation Fund", "Workforce Superannuation Corporate", "IGT (Australia) Pty Ltd Superannuation Fund"]').addBatch({
  'Flat:': {
    topic: function() {
      var items = List.of(
        'AustralianSuper - Corporate Division',
        'Aon Master Trust - Corporate Super',
        'Promina Corporate Superannuation Fund',
        'Workforce Superannuation Corporate',
        'IGT (Australia) Pty Ltd Superannuation Fund'
      )
      return items
    },
    'When searching for the term "Australia"': {
      topic: function (items) {
        var fuse = new Fuse(items, {
          verbose: verbose,
          tokenize: true
        })
        var result = fuse.search('Australia')
        return result
      },
      'we get a list of containing 2 items': function (result) {
        assert.equal(result.size, 2)
      },
      'whose items are "AustralianSuper - Corporate Division" and "IGT (Australia) Pty Ltd Superannuation Fund"': function (result) {
        assert.equal(result.first(), 'AustralianSuper - Corporate Division')
        assert.equal(result.get(1), 'IGT (Australia) Pty Ltd Superannuation Fund')
      }
    },
    'When searching for the term "corporate"': {
      topic: function (items) {
        var fuse = new Fuse(items, {
          verbose: verbose,
          tokenize: true
        })
        var result = fuse.search('corporate')
        return result
      },
      'we get a list of containing 4 items': function (result) {
        assert.equal(result.size, 4)
      },
      'whose items are "AustralianSuper - Corporate Division", "Aon Master Trust - Corporate Super", "Promina Corporate Superannuation Fund" and "Workforce Superannuation Corporate"': function (result) {
        assert.notEqual(result.get('AustralianSuper - Corporate Division'), -1)
        assert.notEqual(result.get('Aon Master Trust - Corporate Super'), -1)
        assert.notEqual(result.get('Promina Corporate Superannuation Fund'), -1)
        assert.notEqual(result.get('Workforce Superannuation Corporate'), -1)
      }
    },
    'When searching for the term "Australia corporate" with "matchAllTokens" set to false': {
      topic: function (items) {
        var fuse = new Fuse(items, {
          verbose: verbose,
          tokenize: true,
          matchAllTokens: false
        })
        var result = fuse.search('Australia corporate')
        return result
      },
      'we get a list of containing 5 items': function (result) {
        assert.equal(result.size, 5)
      },
      'whose items are "AustralianSuper - Corporate Division", "Aon Master Trust - Corporate Super", "Promina Corporate Superannuation Fund", "Workforce Superannuation Corporate" and "IGT (Australia) Pty Ltd Superannuation Fund"': function (result) {
        assert.notEqual(result.get('AustralianSuper - Corporate Division'), -1)
        assert.notEqual(result.get('Aon Master Trust - Corporate Super'), -1)
        assert.notEqual(result.get('Promina Corporate Superannuation Fund'), -1)
        assert.notEqual(result.get('Workforce Superannuation Corporate'), -1)
        assert.notEqual(result.get('IGT (Australia) Pty Ltd Superannuation Fund'), -1)
      }
    },
    'When searching for the term "Australia corporate" with "matchAllTokens" set to true': {
      topic: function (items) {
        var fuse = new Fuse(items, {
          verbose: verbose,
          tokenize: true,
          matchAllTokens: true
        })
        var result = fuse.search('Australia corporate')
        return result
      },
      'we get a list of containing 1 item': function (result) {
        assert.equal(result.size, 1)
      },
      'whose item is "AustralianSuper - Corporate Division"': function (result) {
        assert.equal(result.get(0), 'AustralianSuper - Corporate Division')
      }
    }
  }
}).export(module)

vows.describe('Searching with default options').addBatch({
  'Options:': {
    topic: function() {
      var items = List.of('t te tes test tes te t');

      var fuse = new Fuse(items, {
        includeMatches: true,
        verbose: verbose
      })
      return fuse
    },
    'When searching for the term "test"': {
      topic: function (fuse) {
        var result = fuse.search('test')
        return result
      },
      'We get a match containing 4 indices': function (result) {
        assert.equal(result.first().get('matches').first().get('indices').size, 4)
      },
      'The first index is a single character': function (result) {
        assert.equal(result.first().get('matches').first().get('indices').first().first(), 0)
        assert.equal(result.first().get('matches').first().get('indices').first().get(1), 0)
      },
    },
    'When the seach pattern is longer than maxPatternLength and contains RegExp special characters': {
      topic: function (fuse) {
        var resultThunk = function() {
          return fuse.search('searching with a sufficiently long string sprinkled with ([ )] *+^$ etc.')
        };
        return resultThunk
      },
      'We get a match without crashing': function (resultThunk) {
        assert.doesNotThrow(resultThunk)
      }
    }
  }
}).export(module)

vows.describe('Searching with findallmatches options').addBatch({
  'Options:': {
    topic: function() {
      var items = List.of('t te tes test tes te t')

      var fuse = new Fuse(items, {
        includeMatches: true,
        findAllMatches: true,
        verbose: verbose
      })
      return fuse
    },
    'When searching for the term "test"': {
      topic: function (fuse) {
        var result = fuse.search('test')
        return result
      },
      'We get a match containing 7 indices': function (result) {
        assert.equal(result.first().get('matches').first().get('indices').size, 7)
      },
      'The first index is a single character': function (result) {
        assert.equal(result.first().get('matches').first().get('indices').first().first(), 0)
        assert.equal(result.first().get('matches').first().get('indices').first().get(1), 0)
      },
    }
  }
}).export(module)

vows.describe('Searching with minMatchCharLength options').addBatch({
  'Options:': {
    topic: function () {
      var items = List.of('t te tes test tes te t')

      var fuse = new Fuse(items, {
        includeMatches: true,
        minMatchCharLength: 2,
        verbose: verbose
      })
      return fuse
    },
    'When searching for the term "test"': {
      topic: function (fuse) {
        var result = fuse.search('test')
        return result
      },
      'We get a match containing 3 indices': function (result) {
        assert.equal(result.first().get('matches').first().get('indices').size, 3)
      },
      'The first index is a single character': function (result) {
        assert.equal(result.first().get('matches').first().get('indices').first().first(), 2)
        assert.equal(result.first().get('matches').first().get('indices').first().get(1), 3)
      }
    },
    'When searching for a string shorter than minMatchCharLength': {
      topic: function (fuse) {
        var result = fuse.search('t')
        return result
      },
      'We get a result with no matches included': function (result) {
        assert.equal(result.size, 1)
        assert.equal(result.first().get('matches').size, 0)
      }
    }
  }
}).export(module)

vows.describe('Weighted search with exact match').addBatch({
  'Books:': {
    topic: function() {
      var items = fromJS([{
        title: "John Smith",
        author: 'Steve Pearson',
      }, {
        title: 'The life of Jane',
        author: 'John Smith',
      }])
      return items
    },

    'When searching for the term "John Smith" with author weighted higher': {
      topic: function (items) {
        var options = {
          keys: [{
            name: 'title',
            weight: 0.3
          }, {
            name: 'author',
            weight: 0.7
          }],
          verbose: verbose
        }
        var fuse = new Fuse(items, options)
        var result = fuse.search('John Smith')
        return result
      },
      'We get the value { title: "The life of Jane", author: "John Smith" }': function (result) {
        assert.deepEqual(result.first().get('title'), 'The life of Jane');
        assert.deepEqual(result.first().get('author'), 'John Smith');
      },
    },

    'When searching for the term "John Smith" with title weighted higher': {
      topic: function (items) {
        var options = {
          keys: [{
            name: 'title',
            weight: 0.7
          }, {
            name: 'author',
            weight: 0.3
          }],
          verbose: verbose
        }
        var fuse = new Fuse(items, options)
        var result = fuse.search('John Smith')
        return result
      },
      'We get the value { title: "John Smith", author: "Steve Pearson" }': function (result) {
        assert.deepEqual(result.first().get('title'), 'John Smith');
        assert.deepEqual(result.first().get('author'), 'Steve Pearson');
      },
    },
  }
}).export(module);

vows.describe('Weighted search with exact match in arrays').addBatch({
  'Books:': {
    topic: function() {
      var items = fromJS([{
        title: "Jackson",
        author: 'Steve Pearson',
        tags: ['Kevin Wong', 'Victoria Adam', 'John Smith']
      }, {
        title: 'The life of Jane',
        author: 'John Smith',
        tags: ['Jane', 'Jackson', 'Sam']
      }])
      return items
    },

    'When searching for the term "Jackson", with tags weighted higher and string inside tags getting exact match': {
      topic: function (items) {
        var options = {
          keys: [{
            name: 'tags',
            weight: 0.7
          }, {
            name: 'title',
            weight: 0.3
          }],
          verbose: verbose
        }
        var fuse = new Fuse(items, options)
        var result = fuse.search('Jackson')
        return result
      },
      'We get the value { title: "The life of Jane", tags: ["Jane", "Jackson", "Sam"] ... }': function (result) {
        assert.deepEqual(result.first().get('title'), 'The life of Jane');
        assert.deepEqual(result.first().get('tags'), List.of('Jane', 'Jackson', 'Sam'));
      },
    },

    'When searching for the term "Jackson", with title weighted higher and string inside getting exact match': {
      topic: function (items) {
        var options = {
          keys: [{
            name: 'tags',
            weight: 0.3
          }, {
            name: 'title',
            weight: 0.7
          }],
          verbose: verbose
        }
        var fuse = new Fuse(items, options)
        var result = fuse.search('Jackson')
        return result
      },
      'We get the value { title: "Jackson", tags: "Kevin Wong", ... }': function (result) {
        assert.deepEqual(result.first().get('title'), 'Jackson');
        assert.deepEqual(result.first().get('tags'), List.of('Kevin Wong', 'Victoria Adam', 'John Smith'));
      },
    }
  }
}).export(module);

vows.describe('Tokenize and matchAllTokens for Maps').addBatch({
  'Books:': {
    topic: function() {
      var items = fromJS([{
        title: "Jackson",
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
      return items
    },
    'When searching for the term "Jackson Wong" and searching all keys': {
      topic: function (items) {
        var options = {
          keys: ['title', 'author', 'tags'],
          tokenize: true,
          matchAllTokens: true,
          threshold: 0,
          verbose: verbose,
        }
        var fuse = new Fuse(items, options)
        var result = fuse.search('Jackson Wong')
        return result
      },
      'We get a single value in the results': function (result) {
        assert.equal(result.size, 1)
      },
      'We get the value { title: "Jackson", author: "Steve Pearson", tags: "Kevin Wong", ... }': function (result) {
        assert.equal(result.first().get('title'), 'Jackson');
        assert.equal(result.first().get('author'), 'Steve Pearson');
        assert.deepEqual(result.first().get('tags'), List.of('Kevin Wong', 'Victoria Adam', 'John Smith'));
      },
    },
    'When searching for the term "Victoria Pearson" and searching all keys': {
      topic: function (items) {
        var options = {
          keys: ['title', 'author', 'tags'],
          tokenize: true,
          matchAllTokens: true,
          threshold: 0,
          verbose: verbose,
        }
        var fuse = new Fuse(items, options)
        var result = fuse.search('Victoria Pearson')
        return result
      },
      'We get a single value in the results': function (result) {
        assert.equal(result.size, 2)
      },
      'We get the correct values': function (result) {
        assert.equal(result.first().get('title'), 'Jackson');
        assert.equal(result.first().get('author'), 'Steve Pearson');
        assert.deepEqual(result.first().get('tags'), List.of('Kevin Wong', 'Victoria Adam', 'John Smith'));
        assert.equal(result.getIn([1, 'title']), 'The life of John');
        assert.equal(result.getIn([1, 'author']), 'Jane Wong');
        assert.deepEqual(result.getIn([1, 'tags']), List.of('Victoria Adam', 'John Pearson'));
      },
    }
  }
}).export(module);

vows.describe('OrderedMap of strings: OrderedMap([["a", "Apple"], ["o", "Orange"], ["b", "Banana"]])').addBatch({
  'Flat:': {
    topic: function() {
      var fruits = OrderedMap([["a", "Apple"], ["o", "Orange"], ["b", "Banana"]])
      var fuse = new Fuse(fruits, {
        verbose: verbose
      })
      return fuse
    },
    'When searching for the term "Apple"': {
      topic: function (fuse) {
        var result = fuse.search('Apple')
        return result
      },
      'we get a keyed Seq': function (result) {
        assert.equal(Seq.isSeq(result), true)
        assert.equal(isKeyed(result), true)
      },
    },
  }
}).export(module)
