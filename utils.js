/**
 * class Utils
 */
class Utils {

  /**
   *
   * @return {number}
   */
  static timestamp () {
    return Number((new Date()).getTime())
  }

  /**
   *
   * @param list
   * @return {{}}
   */
  static objSortByAlp (list) {
    return Object
      .entries(list)
      .sort()
      .reduce((_sortedObj, [k, v]) => ({
        ..._sortedObj,
        [k]: v
      }), {})
  }

  static callableFn = (first, second) => first ? first : second

  static toJson = value => JSON.stringify(value)

  static fromJson = str => JSON.parse(str)
}

module.exports = new Utils()