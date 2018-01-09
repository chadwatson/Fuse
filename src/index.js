const { List, Map, Set, Seq, fromJS } = require('immutable')
const Bitap = require('./bitap')
const isArray = require('./helpers/is_array')
const deepValue = require('./helpers/deep_value')
const average = require('./helpers/average')

class Fuse {
  constructor (list, {
    // Approximately where in the text is the pattern expected to be found?
    location = 0,
    // Determines how close the match must be to the fuzzy location (specified above).
    // An exact letter match which is 'distance' characters away from the fuzzy location
    // would score as a complete mismatch. A distance of '0' requires the match be at
    // the exact location specified, a threshold of '1000' would require a perfect match
    // to be within 800 characters of the fuzzy location to be found using a 0.8 threshold.
    distance = 100,
    // At what point does the match algorithm give up. A threshold of '0.0' requires a perfect match
    // (of both letters and location), a threshold of '1.0' would match anything.
    threshold = 0.6,
    // Machine word size
    maxPatternLength = 32,
    // Indicates whether comparisons should be case sensitive.
    caseSensitive = false,
    // Regex used to separate words when searching. Only applicable when `tokenize` is `true`.
    tokenSeparator = / +/g,
    // When true, the algorithm continues searching to the end of the input even if a perfect
    // match is found before the end of the same input.
    findAllMatches = false,
    // Minimum number of characters that must be matched before a result is considered a match
    minMatchCharLength = 1,
    // The name of the identifier property. If specified, the returned result will be a list
    // of the items' dentifiers, otherwise it will be a list of the items.
    id = null,
    // List of properties that will be searched. This also supports nested properties.
    keys = [],
    // Whether to sort the result list, by score
    shouldSort = true,
    // The get function to use when fetching an object's properties.
    // The default will search nested paths *ie foo.bar.baz*
    getFn = deepValue,
    // Default sort function
    sortFn = (a, b) => (a.get('score') - b.get('score')),
    // When true, the search algorithm will search individual words **and** the full string,
    // computing the final score as a function of both. Note that when `tokenize` is `true`,
    // the `threshold`, `distance`, and `location` are inconsequential for individual tokens.
    tokenize = false,
    // When true, the result set will only include records that match all tokens. Will only work
    // if `tokenize` is also true.
    matchAllTokens = false,

    includeMatches = false,
    includeScore = false,

    // Will print to the console. Useful for debugging.
    verbose = false
  }) {
    this.options = {
      location,
      distance,
      threshold,
      maxPatternLength,
      isCaseSensitive: caseSensitive,
      tokenSeparator,
      findAllMatches,
      minMatchCharLength,
      id,
      keys,
      includeMatches,
      includeScore,
      shouldSort,
      getFn,
      sortFn,
      verbose,
      tokenize,
      matchAllTokens
    }

    this.weights = typeof list.first() !== 'string' ? this.options.keys.reduce((weights, key) => {
      if (typeof key !== 'string') {
        if (key.weight <= 0 || key.weight > 1) {
          throw new Error('Key weight has to be > 0 and <= 1')
        }

        return weights.setIn([key.name, 'weight'], (1 - key.weight) || 1)
      }

      return weights.setIn([key, 'weight'], 1)
    }, Map()) : null

    this.setCollection(list)
  }

  setCollection (list) {
    this.list = list
    return list
  }

  search (pattern) {
    this._log(`---------\nSearch pattern: "${pattern}"`)

    const { tokenize, tokenSeparator, shouldSort } = this.options
    const tokenSearchers = tokenize ? pattern.split(tokenSeparator).map((token) => this._createSearcher(token)) : []
    const fullSearcher = this._createSearcher(pattern)

    const results = this._computeScore(this._search(tokenSearchers, fullSearcher))

    if (shouldSort) {
      return this._format(this._sort(results))
    }

    return this._format(results)
  }

  _createSearcher (pattern) {
    return new Bitap(pattern, this.options)
  }

  _searchCollectionOfStrings (tokenSearchers, fullSearcher) {
    return Seq(this.list)
      .filter((value) => typeof value === 'string')
      .map((value) => this._analyzeString({
        key: '',
        value,
        tokenSearchers,
        fullSearcher,
      }))
      .map((result) => Map({
        item: result.get('value'),
        output: List.of(result),
        matchedTokens: result.get('matchedTokens'),
      }))
      .filter((item) => item.getIn(['output', 0, 'isMatch']))
  }

  _searchCollectionOfMaps (tokenSearchers, fullSearcher) {
    return Seq(this.list).map((item) =>
      Seq(this.options.keys)
        .map((key) => typeof key !== 'string' ? key.name : key)
        .map((key) => [key, this.options.getFn(item, key)])
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value]) => [key, typeof value === 'string' ? List.of(value) : value])
        .map(([key, values]) =>
          Seq(values)
            .map((value) => this._analyzeString({ key, value, tokenSearchers, fullSearcher }))
            .filter((result) => result.get('isMatch')))
            .toList()
        .reduce((keysResults, keyResults) =>
          keysResults.withMutations((mutableKeysResults) =>
              mutableKeysResults
                .update('output', (output) => output.concat(keyResults))
                .update('matchedTokens', (matchedTokens) =>
                  Seq(keyResults).reduce(
                    (accumulation, result) => accumulation.union(result.get('matchedTokens')),
                    matchedTokens
                  )))
        , Map({ item, output: List(), matchedTokens: Set() })))
        .filterNot((result) => result.get('output').isEmpty())
  }

  _search (tokenSearchers = [], fullSearcher) {
    const { tokenize, matchAllTokens } = this.options
    const list = this.list
    const results = typeof list.first() === 'string'
      ? this._searchCollectionOfStrings(tokenSearchers, fullSearcher)
      : this._searchCollectionOfMaps(tokenSearchers, fullSearcher)

    if (tokenize && matchAllTokens) {
      return results.filter((item) => item.get('matchedTokens').size === tokenSearchers.length)
    }

    return results
  }

  _analyzeString ({ key, arrayIndex = -1, value, tokenSearchers = [], fullSearcher }) {
    let exists = false
    let averageScore = -1
    let matchedTokens = []

    this._log(`\nKey: ${key === '' ? '-' : key}`)

    const mainSearchResult = fullSearcher.search(value)
    this._log(`Full text: "${value}", score: ${mainSearchResult.score}`)

    if (this.options.tokenize) {
      const words = value.split(this.options.tokenSeparator)
      const scores = tokenSearchers.reduce((accumulation, tokenSearcher) => {
        this._log(`\nPattern: "${tokenSearcher.pattern}"`)

        const tokenScores = words.reduce((wordScores, word) => {
          const tokenSearchResult = tokenSearcher.search(word)
          if (tokenSearchResult.isMatch) {
            exists = true
            matchedTokens.push(tokenSearcher.pattern)
            return wordScores.push(tokenSearchResult.score)
          }
          
          if (!this.options.matchAllTokens) {
            return wordScores.push(1)
          }
          
          return wordScores
        }, List())

        return accumulation.concat(tokenScores)
      }, List())

      averageScore = average(scores)

      this._log('Token score average:', averageScore)
    }

    const finalScore = averageScore > -1 ? average(List.of(mainSearchResult.score, averageScore)) : mainSearchResult.score

    this._log('Score average:', finalScore)

    return fromJS({
      key,
      value,
      arrayIndex,
      isMatch: exists || mainSearchResult.isMatch,
      score: finalScore,
      matchedIndices: mainSearchResult.matchedIndices,
      matchedTokens: Set.of(...matchedTokens)
    })
  }

  _computeScore (results) {
    this._log('\n\nComputing score:\n')

    const { weights } = this

    return results.map((result) => result.withMutations((mutableResult) => {
      const output = result.get('output')
      const computedScores = result.get('output').reduce((scores, output, index) => {
        const weight = weights ? weights.getIn([output.get('key'), 'weight']) : 1
        const score = weight === 1 ? output.get('score') : (output.get('score') || 0.001)
        const nScore = score * weight

        if (weight !== 1) {
          return scores.update('bestScore', (bestScore) => Math.min(bestScore, nScore))
        } else {
          mutableResult.setIn(['output', index, 'nScore'], nScore)
          return scores.update('totalScore', (totalScore) => totalScore + nScore)
        }
      }, Map({
        totalScore: 0,
        bestScore: 1,
      }))

      mutableResult.set('score', computedScores.get('bestScore') === 1 ? computedScores.get('totalScore') / output.size : computedScores.get('bestScore'))

      this._log(mutableResult)

      return mutableResult
    }))
  }

  _sort (results) {
    this._log('\n\nSorting....')
    return results.sort(this.options.sortFn)
  }

  _format (results) {
    const { includeMatches, includeScore, id, getFn } = this.options

    this._log('\n\nOutput:\n\n', results)

    const transformers = []

    if (includeMatches) {
      transformers.push((result, data) =>
        data.set('matches', result.get('output').reduce((matches, item) => {
          if (item.get('matchedIndices').size === 0) {
            return matches
          }

          const obj = {
            indices: item.get('matchedIndices'),
            value: item.get('value')
          }
          if (item.get('key')) {
            obj.key = item.get('key')
          }
          if (item.has('arrayIndex') && item.get('arrayIndex') > -1) {
            obj.arrayIndex = item.get('arrayIndex')
          }

          return matches.push(fromJS(obj))
        }, List()))
      )
    }

    if (includeScore) {
      transformers.push((result, data) => data.set('score', result.get('score')))
    }

    return results.map((result) => {
      const item = id ? getFn(result.get('item'), id).first() : result.get('item')

      if (!transformers.length) {
        return item
      }

      return transformers.reduce((data, xf) => xf(result, data), Map({ item }))
    })
  }

  _log () {
    if (this.options.verbose) {
      console.log(...arguments)
    }
  }
}

module.exports = Fuse
