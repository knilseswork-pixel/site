/**
 * Сортировка уровней: от подготовительного к комбинациям
 */
(function () {
  var ID_RANK = {
    prep: 10,
    'prep-level': 10,
    beginner: 20,
    'beginner-level': 20,
    middle: 30,
    'middle-level': 30,
    advanced: 40,
    'advanced-level': 40,
    combos: 50,
  };

  function rankFromTitle(title) {
    var t = String(title || '').toLowerCase();
    if (t.indexOf('подготов') >= 0) return 10;
    if (t.indexOf('начал') >= 0) return 20;
    if (t.indexOf('средн') >= 0) return 30;
    if (t.indexOf('продвин') >= 0) return 40;
    if (t.indexOf('комбина') >= 0) return 50;
    return null;
  }

  function getLevelRank(item) {
    if (!item) return 1000;
    var id = String(item.id || '').toLowerCase();
    if (ID_RANK[id] != null) return ID_RANK[id];
    var fromTitle = rankFromTitle(item.title);
    if (fromTitle != null) return fromTitle;
    return 1000;
  }

  function sortByLevel(items) {
    var list = items || [];
    return list
      .map(function (it, index) {
        return { item: it, index: index };
      })
      .sort(function (a, b) {
        var ra = getLevelRank(a.item);
        var rb = getLevelRank(b.item);
        if (ra !== rb) return ra - rb;
        return a.index - b.index;
      })
      .map(function (x) {
        return x.item;
      });
  }

  window.WorkoutLevelSort = {
    getLevelRank: getLevelRank,
    sortByLevel: sortByLevel,
  };
})();
