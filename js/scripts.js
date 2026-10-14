/* ============================================================
   AGI - script.js
   改造后：删除 GA / site.ajax / 后端依赖，新增 Router
   ============================================================ */

/* GA 已移除，提供空函数避免 ga is not defined */
window.ga = window.ga || function () {};

/*
Global vars
------------------------
*/

var DATA_projects = {};
var DATA_members = {};
var DATA_authors = {};
var ARR_projects = [];
var ARR_members = [];
var ARR_authors = [];

var LIST_names = [];
var INDEX_names_ids = {};

var FILTER_countries = [];
var FILTER_sectors = [];
var FILTER_types = [];

var SEARCH = 0;

/*
Handlebars helpers
------------------------
*/

Handlebars.registerHelper('slugify', function (component, options) {
  /**
   * Return a slug for a DOM id or class.
   */
  var slug = component.replace(/[^\w\s]+/gi, '').replace(/ +/gi, '-');
  return slug.toLowerCase();
});

Handlebars.registerHelper('times', function (n, block) {
  var accum = '';
  for (var i = 0; i < n; ++i) block.data.index = i;
  block.data.first = i === 0;
  block.data.last = i === n - 1;
  accum += block.fn(this);
  return accum;
});

Handlebars.registerHelper('ifLessThan4', function (index, options) {
  if (index + 1 < 4) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

/*
-------------------
Custom functions
-------------------
*/

function showLoader() {
  $('#loader1').stop().show().animate({ width: '70%' }, 5000, 'easeOutQuad');
}

function hideLoader() {
  $('#loader1')
    .stop()
    .animate({ width: '100%' }, 500, 'easeInExpo', function () {
      $('#loader1').animate({ opacity: 0 }, 250, function () {
        $('#loader1').css({ opacity: '', width: '' });
      });
    });
}

/*
-------------------
One-off click events
-------------------
*/

$(document).ready(function () {
  /*
  -------------------
  Global listeners
  -------------------
  */

  site.on('#menuToggle.toggleOn', function () {
    $('#head').scrollTop(0);
  });

  /*
  -------------------
  Global Clicks Events
  -------------------
  */

  $('.Navigation-item--search a, #logo a').click(function (ev) {
    ev.preventDefault();

    $('.Navigation-item,#menuToggle').removeClass('is-active');
    site.$html.removeClass('when-Icon-is-active');

    if (site.$html.hasClass('Site--wallActive')) {
      site.ui.wall.close();
    } else {
      $(this).parent().addClass('is-active');
      site.ui.wall.open();

      setTimeout(function () {
        if (!site.is('mobile')) {
          $('#query').focus();
          $('#query').val('');
        }
      }, 700);
    }
  });

  $('#home a').click(function (ev) {
    ev.preventDefault();
    site.ui.wall.open();
  });
});

/*
-------------------
Templates
-------------------
*/

var templates = {
  wall:
    '{{#each projects}}{{#if images.length }}<li class="List-item ui-masonry-item">' +
    '<article class="Item Item--wall ui-clickable " id="wallitem{{ id }}">' +
    '<div class="Item-media">' +
    '<span class="Image  ui-lazyImage  ui-keepRatio" data-id="{{ images.0.id }}" data-title="{{ title }}" data-src="{{ images.0.small }}"  data-ratio="{{ images.0.width }}:{{ images.0.height }}"></span>' +
    '</div>' +
    '<a class="Item-content ui-clickable-link" href="#/design/{{ slug }}">' +
    '<div class="Item-body">' +
    '<div class="Content">' +
    '<h3>{{ designer }}<br>{{ title }}{{#if year }}, {{ year }}{{/if}}</h3>' +
    '</div>' +
    '</div>' +
    '</a>' +
    '</article>' +
    '</li>{{/if}}{{#if ad }}<li class="List-item List-item--ad ui-masonry-item">' +
    '<article class="Item Item--wall ui-clickable " id="wallad{{ id }}">' +
    '<div class="Item-media">' +
    '<span class="Image  ui-lazyImage  ui-keepRatio" data-id="{{ ad.image.0.id }}" data-title="{{ ad.heading }}" data-src="{{ ad.image.0.small }}"  data-ratio="{{ ad.image.0.width }}:{{ ad.image.0.height }}"></span>' +
    '</div>' +
    '<a class="Item-content ui-clickable-link" href="{{ ad.url }}">' +
    '<div class="Item-body">' +
    '<div class="Content">' +
    '<h3>{{ ad.heading }}<br>{{ ad.caption }}</h3>' +
    '</div>' +
    '</div></a>' +
    '</article>' +
    '</li>{{/if}}{{/each}}',
  image: '<img src="{ src }">'
};

var renderWall = Handlebars.compile(
  templates.wall.replace(/(?:\r\n|\r|\n)/g, '').replace(/[\s+]/g, ' ')
);

/*
-------------------
Load JSON data
-------------------
*/

site.addUI('loadData', {
  gotData: 0,
  onFind: function () {
    $.get('data.json', function (data) {
      $.get('members.json', function (memberJSON) {
        DATA_projects = data.projects;
        DATA_authors = data.authors;
        DATA_members = memberJSON;

        var projectsArray = toArray(DATA_projects);
        var memberArray = toArray(DATA_members);

        memberArray.forEach(function (member) {
          var authored = DATA_authors['id_' + member.id];

          LIST_names.push(member.fullName.toLowerCase());
          INDEX_names_ids[member.fullName.toLowerCase()] = member.id;

          if (authored && authored.length) {
            member.projects = DATA_authors['id_' + member.id];
            DATA_members['id_' + member.id].projects = DATA_authors['id_' + member.id];
          }
        });

        projectsArray = projectsArray.filter(function (project) {
          return DATA_members.hasOwnProperty('id_' + project.author);
        });

        projectsArray.forEach(function (p, ix) {
          var author = DATA_members['id_' + p.author];
          var country = typeof author == 'undefined' ? 'Other' : author.nationalGroup;

          if (FILTER_countries.indexOf(country) == -1) FILTER_countries.push(country);
          projectsArray[ix].country = country;

          var sectorsArr = projectsArray[ix].sector;
          sectorsArr.forEach(function (sector) {
            if (FILTER_sectors.indexOf(sector) == -1) FILTER_sectors.push(sector);
          });

          var typesArr = projectsArray[ix].type;
          typesArr.forEach(function (type) {
            if (FILTER_types.indexOf(type) == -1) FILTER_types.push(type);
          });
        });

        ARR_projects = projectsArray;
        ARR_members = memberArray;

        site.trigger('gotData');
        site.ui.loadData.gotData = 1;

        // 已删除原 #projects / #shuffle / #members 调试按钮（依赖原站 DOM）
      });
    });
  }
});

/*
-------------------
ui-templateHeight
-------------------
*/

site.addUI('templateHeight', {
  init: function () {
    site.on('resize', function () {
      var $template = $('.ui-templateHeight');
      if ($template.length) {
        if (site.is('mobile')) {
          $template.css({ 'min-height': site.windowHeight });
        } else {
          var headHeight = $('#head').outerHeight();
          var $tHead = $('.Template-head');
          var $tBody = $('.Template-body');
          var margin = 0;

          if ($tHead.length) margin = parseInt($tHead.css('margin-top'));
          if ($tBody.length) margin += parseInt($tBody.css('margin-bottom'));

          var min = site.windowHeight - margin - headHeight;
          $template.css({ 'min-height': min });
        }
      }
    });
  },
  onFind: function () {}
});

/*
-------------------
ui-logger （GA 转发已移除，仅保留队列结构）
-------------------
*/

site.addUI('logger', {
  queue: [],
  timer: 0,
  init: function () {
    site.ui.logger.timer = setInterval(function () {
      site.ui.logger.deQueue();
    }, 1000);
  },
  log: function (item) {
    site.ui.logger.queue.push(item);
  },
  deQueue: function () {
    if (site.ui.logger.queue.length) {
      site.ui.logger.queue.shift();
      /* GA 已删，不再上报 */
    }
  }
});

/* ============================================================
   Part 1 结束
   Part 2 将从 site.addUI('wall', ...) 开始
   ============================================================ */
/*
	
ui-wall
-----------------
	
*/

site.addUI('wall', {
  curPage: 1,
  perPage: 48,
  results: [],
  active: 0,
  query: 0,
  hideTimer: 0,
  init: function () {
    // 覆盖 site 的滚动取值（当 wall 激活时，滚动的是 #wallScroll）
    site.getScrollY = function () {
      if (site.ui.wall.active) {
        return 0;
      } else {
        return site.scrollTop;
      }
    };

    site.getScrollTop = function () {
      if (site.ui.wall.active) {
        return $('#wallScroll').scrollTop();
      } else {
        return $(window).scrollTop();
      }
    };
  },
  onFind: function ($el) {
    $el.addClass('ui-wall--handled');

    if (!site.ui.loadData.gotData) {
      site.on('gotData', function () {
        site.ui.wall.ready();
      });
    } else {
      site.ui.wall.ready();
    }

    if (!Modernizr.touch) {
      // 悬停显示/隐藏搜索栏
      $('#wall .Wall-head').hover(
        function () {
          if (site.ui.wall.hideTimer) clearTimeout(site.ui.wall.hideTimer);
          $('#wall .Wall-head').stop().animate({ opacity: 1 });
        },
        function () {
          $('#wall .Wall-head').stop().animate({ opacity: 0 });
        }
      );
    }
  },
  hideSearch: function () {
    if (Modernizr.touch) return;
    if (site.ui.wall.hideTimer) clearTimeout(site.ui.wall.hideTimer);

    site.ui.wall.hideTimer = setTimeout(function () {
      if (!$('#wall input:focus').length && !$('#wall .Wall-head:hover').length) {
        $('#wall .Wall-head').stop().animate({ opacity: 0 });
      }
    }, 3000);
  },
  open: function () {
    var $scroller = $('#wallScroll');
    $scroller.removeClass('is-hidden');

    $('#wall .Wall-head').css({ opacity: 1 });
    $('#wallItems').addClass('ui-scrollPager--loading');

    site.$html.addClass('Site--wallActive');
    site.ui.wall.active = 1;

    site.trigger('resize');

    setTimeout(function () {
      site.$html.addClass('Site--showWall');
    }, 20);

    setTimeout(function () {
      var $wall = $('#wall');
      $wall.addClass('is-active').removeClass('is-inactive');
      site.ui.wall.autoScroll($scroller);
    }, 300);
  },
  close: function () {
    $('#wall').removeClass('is-active').addClass('is-inactive');
    site.$html.removeClass('Site--showWall');

    setTimeout(function () {
      site.$html.removeClass('Site--wallActive');

      var $scroller = $('#wallScroll');
      $scroller.stop(true, false);
      $scroller.addClass('is-hidden');
      site.ui.wall.active = 0;
    }, 650);
  },
  ready: function () {
    // 加载默认墙
    var projects = ARR_projects;
    projects = projects.shuffle();
    site.ui.wall.results = projects;
    site.ui.wall.load();

    /*
    搜索配置
    */
    var options = {
      threshold: 0.3,
      location: 0,
      distance: 200,
      maxPatternLength: 32,
      minMatchCharLength: 1,
      keys: [
        { name: 'title', weight: 0.5 },
        { name: 'designer', weight: 1 },
        { name: 'details', weight: 0.3 },
        { name: 'client', weight: 0.4 },
        { name: 'sector', weight: 0.3 },
        { name: 'type', weight: 0.3 },
        { name: 'year', weight: 0.3 }
      ]
    };

    SEARCH = new Fuse(projects, options);

    $('#queryForm').submit(function (ev) {
      ev.preventDefault();
    });

    $('#query').keyup(function (e) {
      e.preventDefault();
      e.stopPropagation();

      var q = $(this).val();
      site.ui.wall.query = q != '';

      var results;

      if (q != '') {
        var qLower = q.toLowerCase();
        var replace = '(^' + qLower + ')|( ' + qLower + ')';
        var re = new RegExp(replace);

        var directMatches = LIST_names.filter(function (item) {
          return item.match(re);
        });

        // 记录日志（不转发 GA）
        if (q.length >= 4) {
          site.ui.logger.log({
            eventCategory: 'Wall',
            eventAction: 'search',
            eventLabel: 'Wall Search For ' + q
          });
        }

        if (directMatches && directMatches.length) {
          var pObjs = [];
          for (var d = 0; d < directMatches.length; d++) {
            var fullName = directMatches[d];
            var memberId = INDEX_names_ids[fullName.toLowerCase()];
            var projectsOfMember = DATA_authors['id_' + memberId];

            if (projectsOfMember) {
              projectsOfMember.forEach(function (pId) {
                if (typeof pId == 'string') {
                  var pObj = DATA_projects['id_' + pId];
                  if (pObj) pObjs.push(pObj);
                }
              });
            }
          }
          results = pObjs;
        } else {
          results = SEARCH.search(q);
        }
      } else {
        results = ARR_projects;
      }

      site.ui.wall.reset();
      results.shuffle();
      site.ui.wall.results = results;
      site.ui.wall.load();
    });

    var $scroller = $('#wallScroll');
    // 触发 site scroll
    $scroller.scroll(function () {
      site.scroll(1);
    });

    // 用户滚动时停止自动滚动
    $scroller.bind('scroll mousedown DOMMouseScroll mousewheel keyup touchmove', function (e) {
      if (e.which > 0 || e.type === 'mousedown' || e.type === 'mousewheel' || e.type === 'touchmove') {
        $scroller.stop();
      }
    });

    // 如果 URL 是 #/ 显示 wall 默认状态
    if ($('.Site--wallActive').length) {
      site.ui.wall.active = 1;
      site.ui.wall.hideSearch();
    }
  },
  loading: 0,
  loadMore: function (uiScrollPagerCallback) {
    if (site.ui.wall.loading) return;
    site.ui.wall.loading = 1;

    setTimeout(function () {
      var pages = site.ui.wall.pages();
      var curPage = site.ui.wall.curPage;

      var lastPage = curPage < pages ? 0 : 1;
      var append = 1;

      site.ui.wall.curPage++;
      site.ui.wall.load(append);

      site.ui.wall.loading = 0;

      uiScrollPagerCallback.call(window, lastPage);

      if (!lastPage) site.ui.scrollPager.reset($('#wallItems'));
    }, 100);
  },
  reset: function () {
    site.ui.wall.curPage = 1;
    site.ui.scrollPager.reset($('#wallItems'));
    $('#wallScroll').stop().scrollTop(0);
  },
  pages: function () {
    var total = site.ui.wall.results.length;
    var pages = Math.ceil(total / site.ui.wall.perPage);
    return pages;
  },
  paginate: function (results) {
    var start = (site.ui.wall.curPage - 1) * site.ui.wall.perPage;
    var end = site.ui.wall.curPage * site.ui.wall.perPage;

    results = site.ui.wall.results.slice(start, end);
    return results;
  },
  load: function (append) {
    var projects = site.ui.wall.paginate();
    var ads = $('#wall').data('wall-ads');

    if (!site.ui.wall.query && ads) {
      var frequency = Math.round(site.ui.wall.perPage / ads.length);

      ads.forEach(function (ad, ix) {
        var pIx = ix * frequency;
        var rand = Math.round(Math.random() * 5);
        pIx += rand;
        if (projects.length <= pIx) pIx = projects.length - 1;
        projects[pIx].ad = ad;
      });
    }

    $('#wallCount').html(site.ui.wall.results.length);

    var html = '';
    html = renderWall({ projects: projects });

    // 更新 HTML
    var append = typeof append != 'undefined' ? append : 0;
    if (append) {
      $('#wallList').append(html);
    } else {
      if ($('#wallList').hasClass('ui-masonry--handled') && $('#wallList').data('isotope')) {
        $('#wallList').isotope('destroy');
        $('#wallList').removeClass('ui-masonry--handled');
      }
      $('#wallList').html(html);
    }

    site.trigger('domChanged');
    site.trigger('resize');
    // 原 site.ajax.getNewLinks() 已删除

    if (site.ui.wall.query) {
      $('#wallScroll').stop().scrollTop(0);
    } else {
      site.ui.wall.autoScroll($('#wallScroll'));
    }

    setTimeout(function () {
      $('#wall').addClass('is-active');
    }, 500);
  },
  autoScroll: function ($scroller) {
    var destination = Math.abs($scroller.scrollTop()) + $scroller.outerHeight();
    var speed = site.is('mobile') ? 20000 : 40000;

    $scroller.stop().animate({ scrollTop: destination }, speed, 'linear', function () {
      site.ui.wall.autoScroll($scroller);
    });
  }
});

/*
	
ui-projects
-----------------
	
*/

site.addUI('projects', {
  curPage: 1,
  perPage: 52,
  curFilters: {},
  renderFilters: 0,
  renderResults: 0,
  defaultTitle: '',
  filterText: {},
  results: [],
  init: function () {},
  onFind: function ($el) {
    $el.addClass('ui-projects--handled');
    site.ui.projects.curFilters = $el.data('filters') || {};

    if (!site.ui.loadData.gotData) {
      site.on('gotData', function () {
        site.ui.projects.ready();
      });
    } else {
      site.ui.projects.ready();
    }
  },
  ready: function ($el) {
    site.ui.projects.curPage = 1;

    // Handlebars 模板
    if (!site.ui.projects.renderFilters) {
      var resultsTemplate = $('#results-template').html();
      var filterTemplate = $('#filter-template').html();

      site.ui.projects.renderFilters = Handlebars.compile(
        filterTemplate.replace(/(?:\r\n|\r|\n)/g, '').replace(/[\s+]/g, ' ')
      );
      site.ui.projects.renderResults = Handlebars.compile(
        resultsTemplate.replace(/(?:\r\n|\r|\n)/g, '').replace(/[\s+]/g, ' ')
      );
    }

    // 排序筛选器
    FILTER_countries.sort();
    FILTER_sectors.sort();
    FILTER_types.sort();

    var countryCols = FILTER_countries.chunkify(6, 1);
    var sectorCols = FILTER_sectors.chunkify(6, 1);
    var typeCols = FILTER_types.chunkify(6, 1);

    var filterCols = {
      countryCols: countryCols,
      sectorCols: sectorCols,
      typeCols: typeCols
    };

    var filterHTML = site.ui.projects.renderFilters(filterCols);
    $(filterHTML).insertAfter($('#filter-template'));

    site.ui.projects.defaultTitle = $('#filterTitle').html();

    site.trigger('domChanged');
    site.checkHashLinks();
    // 原 site.ajax.getNewLinks() 已删除

    // 应用当前筛选（从 URL hash 恢复）
    site.ui.projects.parseHash();
    site.ui.projects.selectCurFilters();

    // 初次加载
    site.ui.projects.reset();
    site.ui.projects.filter();
    site.ui.projects.sort();
    site.ui.projects.updateCount();
    site.ui.projects.load();

    $('#loadMore').click(function () {
      site.ui.projects.loadMore();
    });

    $('#showSelection').click(function () {
      $('#filterWork,#filterProjects').removeClass('is-active').addClass('is-inactive');
      $('html').removeClass('when-Button-is-active');
    });

    $('#filterProjects .Link--filter').click(function () {
      setTimeout(function () {
        site.ui.projects.reset();
        site.ui.projects.filter();
        site.ui.projects.updateCount();
        site.ui.projects.load();
      }, 150);
    });

    $('#clearFilter').click(function () {
      setTimeout(function () {
        site.ui.projects.reset();
        site.ui.projects.filter();
        site.ui.projects.sort();
        site.ui.projects.updateCount();
        site.ui.projects.load();
      }, 150);
    });

    $('#Drop-sortby .Drop-body .Button').click(function () {
      setTimeout(function () {
        site.ui.projects.reset();
        site.ui.projects.sort();
        site.ui.projects.load();
      }, 150);
    });
  },
  /* 从 hash 解析筛选状态 */
  parseHash: function () {
    var hash = (location.hash || '#/work').replace(/^#\/work\/?/, '');
    if (!hash) return;

    var parts = hash.split('/').filter(function (s) {
      return s;
    });

    // 清空当前筛选
    site.ui.projects.curFilters = {
      year: [],
      country: [],
      sector: [],
      discipline: []
    };

    for (var i = 0; i < parts.length; i += 2) {
      var key = parts[i];
      var val = parts[i + 1];
      if (key && val) {
        if (!site.ui.projects.curFilters[key]) site.ui.projects.curFilters[key] = [];
        site.ui.projects.curFilters[key] = site.ui.projects.curFilters[key].concat(val.split(','));
      }
    }
  },
  selectCurFilters: function () {
    // 年份
    $('#yearFilter .is-active').removeClass('is-active');
    if (site.ui.projects.curFilters.year && site.ui.projects.curFilters.year.length) {
      var years =
        typeof site.ui.projects.curFilters.year == 'string'
          ? [site.ui.projects.curFilters.year]
          : site.ui.projects.curFilters.year;
      years.forEach(function (y) {
        $('#yearFilter [data-slug="' + y.toLowerCase() + '"]').addClass('is-active');
      });
    }

    // 行业
    $('#sectorFilter .is-active').removeClass('is-active');
    if (site.ui.projects.curFilters.sector && site.ui.projects.curFilters.sector.length) {
      var sectors =
        typeof site.ui.projects.curFilters.sector == 'string'
          ? [site.ui.projects.curFilters.sector]
          : site.ui.projects.curFilters.sector;
      sectors.forEach(function (s) {
        $('#sectorFilter [data-slug="' + s.toLowerCase() + '"]').addClass('is-active');
      });
    }

    // 国家
    $('#countryFilter .is-active').removeClass('is-active');
    if (site.ui.projects.curFilters.country && site.ui.projects.curFilters.country.length) {
      var countries =
        typeof site.ui.projects.curFilters.country == 'string'
          ? [site.ui.projects.curFilters.country]
          : site.ui.projects.curFilters.country;
      countries.forEach(function (c) {
        $('#countryFilter [data-slug="' + c.toLowerCase() + '"]').addClass('is-active');
      });
    }

    // 学科
    $('#disciplineFilter .is-active').removeClass('is-active');
    if (site.ui.projects.curFilters.discipline && site.ui.projects.curFilters.discipline.length) {
      var disciplines =
        typeof site.ui.projects.curFilters.discipline == 'string'
          ? [site.ui.projects.curFilters.discipline]
          : site.ui.projects.curFilters.discipline;
      disciplines.forEach(function (d) {
        $('#disciplineFilter [data-slug="' + d.toLowerCase() + '"]').addClass('is-active');
      });
    }
  },
  /* 生成 hash URL 并更新地址栏 */
  setUrl: function () {
    var hash = '#/work';

    for (var i in site.ui.projects.curFilters) {
      if (site.ui.projects.curFilters.hasOwnProperty(i)) {
        var segs = site.ui.projects.curFilters[i];
        if (segs && segs.length) {
          if (typeof segs == 'string') segs = [segs];
          hash += '/' + i + '/' + segs.join(',');
        }
      }
    }

    // 避免触发 Router 重复渲染
    if (location.hash !== hash) {
      site.vars.skipHashResolve = 1;
      location.hash = hash;
    }
  },
  reset: function () {
    site.ui.projects.curPage = 1;
  },
  filter: function () {
    var filtered = [];
    site.ui.projects.filterText = {};

    // 年份
    var $filterYears = $('#yearFilter .is-active');
    var filterYears = [];
    var minYear = 0;
    var maxYear = 0;

    site.ui.projects.curFilters.year = $filterYears.length ? [] : false;

    $filterYears.each(function () {
      var val = $(this).data('value');
      var slug = $(this).data('slug');

      site.ui.projects.curFilters.year.push(slug);

      var parts = val.split('-');
      var yFrom = parts[0];
      var yTo = parts[1];

      if (yTo == 'today') yTo = new Date().getFullYear() + '';

      yFrom = +yFrom;
      yTo = +yTo;

      minYear = minYear ? Math.min(minYear, yFrom) : yFrom;
      maxYear = maxYear ? Math.max(maxYear, yTo) : yTo;

      filterYears.push({ yFrom: yFrom, yTo: yTo });
    });

    if (minYear && maxYear) {
      site.ui.projects.filterText['year'] = 'from ' + minYear + ' to ' + maxYear;
    }

    // 国家
    var $filterCountry = $('#countryFilter .is-active');
    var filterCountry = [];
    var countryItems = [];

    site.ui.projects.curFilters.country = $filterCountry.length ? [] : false;

    $filterCountry.each(function () {
      var val = $(this).data('value');
      var slug = $(this).data('slug');
      site.ui.projects.curFilters.country.push(slug);
      filterCountry.push(val);
      countryItems.push($(this).text());
    });

    if (countryItems.length) {
      site.ui.projects.filterText['country'] = 'in ' + site.ui.projects.filterTitleList(countryItems);
    }

    // 行业
    var $filterSector = $('#sectorFilter .is-active');
    var filterSector = [];
    var sectorItems = [];

    site.ui.projects.curFilters.sector = $filterSector.length ? [] : false;

    $filterSector.each(function () {
      var val = $(this).data('value');
      var slug = $(this).data('slug');
      site.ui.projects.curFilters.sector.push(slug);
      filterSector.push(val);
      sectorItems.push($(this).text());
    });

    if (sectorItems.length) {
      site.ui.projects.filterText['sector'] = 'for use in ' + site.ui.projects.filterTitleList(sectorItems);
    }

    // 学科
    var $filterType = $('#disciplineFilter .is-active');
    var filterType = [];
    var typeItems = [];

    site.ui.projects.curFilters.discipline = $filterType.length ? [] : false;

    $filterType.each(function () {
      var val = $(this).data('value');
      var slug = $(this).data('slug');
      site.ui.projects.curFilters.discipline.push(slug);
      filterType.push(val);
      typeItems.push($(this).text());
    });

    if (typeItems.length) {
      site.ui.projects.filterText['type'] = site.ui.projects.filterTitleList(typeItems) + ' work';
    }

    // 应用筛选
    filtered = ARR_projects.filter(function (project) {
      var matches = 0;

      // 年份
      if (filterYears.length) {
        var y = +project.year;
        filterYears.forEach(function (val) {
          if (y >= val.yFrom && y <= val.yTo) matches++;
        });
        if (!matches) return false;
      }

      matches = 0;

      // 国家
      if (filterCountry.length) {
        filterCountry.forEach(function (val) {
          if (project.country == val) matches++;
        });
        if (!matches) return false;
      }

      matches = 0;

      // 行业
      if (filterSector.length) {
        filterSector.forEach(function (val) {
          if (project.sector.indexOf(val) != -1) matches++;
        });
        if (!matches) return false;
      }

      matches = 0;

      // 学科
      if (filterType.length) {
        filterType.forEach(function (val) {
          if (project.type.indexOf(val) != -1 || project.details.indexOf(val) != -1) matches++;
        });
        if (!matches) return false;
      }

      return true;
    });

    site.ui.projects.results = filtered;
  },
  sort: function () {
    var filtered = site.ui.projects.results;
    var sortBy = $('#Drop-sortby a.is-active').data('value');

    switch (sortBy) {
      case 'project-year':
        filtered.propSort('year');
        break;
      case 'designer':
        filtered.propSort('designer');
        break;
      case 'country':
        filtered.propSort('country');
        break;
      default:
        filtered.shuffle();
    }

    site.ui.projects.results = filtered;
  },
  filterTitleList: function (array) {
    var out = '';
    if (array.length > 1) array[array.length - 1] = '& ' + array[array.length - 1];
    out = array.join(', ');
    out = out.replace(', &', ' &');
    return out;
  },
  updateTitle: function () {
    var title;

    if (isEmptyObject(site.ui.projects.filterText)) {
      title = site.ui.projects.defaultTitle;
    } else {
      var typeText = site.ui.projects.filterText.hasOwnProperty('type')
        ? site.ui.projects.filterText['type']
        : 'AGI Work';
      var yearText = site.ui.projects.filterText.hasOwnProperty('year')
        ? site.ui.projects.filterText['year']
        : '';
      var sectorText = site.ui.projects.filterText.hasOwnProperty('sector')
        ? site.ui.projects.filterText['sector']
        : '';
      var countryText = site.ui.projects.filterText.hasOwnProperty('country')
        ? site.ui.projects.filterText['country']
        : '';

      title = typeText + ' ' + yearText + ' ' + countryText + ' ' + sectorText;
    }

    $('#filterTitle').html(title);
  },
  updateCount: function () {
    site.ui.projects.updateTitle();
    $('#filterCount').html(site.ui.projects.results.length);

    var plural = site.ui.projects.results.length == 1 ? '' : 's';
    $('#filterPlural').html(plural);
  },
  pages: function () {
    var total = site.ui.projects.results.length;
    var pages = Math.ceil(total / site.ui.projects.perPage);
    return pages;
  },
  paginate: function () {
    var results = site.ui.projects.results;
    var start = (site.ui.projects.curPage - 1) * site.ui.projects.perPage;
    var end = site.ui.projects.curPage * site.ui.projects.perPage;
    results = results.slice(start, end);
    return results;
  },
  loadMore: function () {
    var pages = site.ui.projects.pages();
    var curPage = site.ui.projects.curPage;
    var append = 1;

    site.ui.projects.curPage++;
    site.ui.projects.load(append);
  },
  load: function (append) {
    var results = site.ui.projects.paginate();
    var html = site.ui.projects.renderResults({ projects: results });

    if (typeof append != 'undefined' && append) {
      $('#projectGrid').append(html);
    } else {
      $('#projectGrid').html(html);
    }

    // 更新 hash
    site.ui.projects.setUrl();

    site.trigger('domChanged');
    site.checkHashLinks();
    // 原 site.ajax.getNewLinks() 已删除

    // 显示/隐藏加载更多
    var pages = site.ui.projects.pages();
    var curPage = site.ui.projects.curPage;

    if (curPage < pages) {
      $('#loadMore').show();
    } else {
      $('#loadMore').hide();
    }
  }
});

/* ============================================================
   Part 2 结束
   Part 3 将从 site.addUI('members', ...) 开始
   ============================================================ */
/*
	
ui-members
-----------------
	
*/

site.addUI('members', {
  query: '',
  curPage: 1,
  perPage: 100,
  isReady: 0,
  renderMembers: 0,
  results: [],
  init: function () {},
  onFind: function ($el) {
    $el.addClass('ui-members--handled');

    if (!site.ui.loadData.gotData) {
      site.on('gotData', function () {
        site.ui.members.ready();
      });
    } else {
      site.ui.members.ready();
    }
  },
  ready: function () {
    // 重置分页
    site.ui.members.curPage = 1;
    site.ui.members.query = '';
    site.ui.members.isReady = 0;

    var $members = $('#members-template');

    if ($members.length) {
      // 编译 Handlebars 模板（只编译一次）
      if (!site.ui.members.renderMembers) {
        var membersTemplate = $members.html();
        site.ui.members.renderMembers = Handlebars.compile(
          membersTemplate.replace(/(?:\r\n|\r|\n)/g, '').replace(/[\s+]/g, ' ')
        );
      }

      site.ui.members.results = ARR_members;

      /*
      快速搜索
      */
      $('#memberSearch').keyup(function (e) {
        e.preventDefault();
        e.stopPropagation();

        site.ui.members.curPage = 1;
        site.ui.members.query = $(this).val();

        // 记录搜索行为（GA 已移除，不转发）
        if (site.ui.members.query.length >= 4) {
          site.ui.logger.log({
            eventCategory: 'Members',
            eventAction: 'search',
            eventLabel: 'Member Search For ' + site.ui.members.query
          });
        }

        site.ui.members.update();
      });

      /*
      首次加载
      */
      site.ui.members.filter();
      site.ui.members.sort();
      site.ui.members.load();

      site.ui.members.isReady = 1;
    }
  },
  filter: function () {
    var filtered = [];

    // 搜索优先
    var query = site.ui.members.query;

    if (query != '') {
      filtered = ARR_members.filter(function (member) {
        var matches = 0;
        var pattern = query;
        var regex = new RegExp(pattern, 'i');

        if (member.fullName.match(regex)) matches++;
        if (!matches) return false;

        return true;
      });

      site.ui.members.results = filtered;
      return;
    }

    // 首字母筛选
    var $filterNames = $('#groups .is-active');
    var filterNames = [];
    $filterNames.each(function () {
      var val = $(this).data('value');
      filterNames.push(val);
    });

    filtered = ARR_members.filter(function (member) {
      var matches = 0;

      if (filterNames.length) {
        filterNames.forEach(function (val) {
          if (val == 'all') {
            matches++;
          } else {
            var pattern = '^[' + val + ']';
            var regex = new RegExp(pattern, 'i');
            if (member.lastName.match(regex)) matches++;
          }
        });

        if (!matches) return false;
      }

      return true;
    });

    site.ui.members.results = filtered;
  },
  sort: function () {
    var filtered = site.ui.members.results;

    var sortBy = 'lastName';
    var dir = 'asc';

    var $sort = $('.ui-sortMembers.is-active');
    if ($sort.length) {
      sortBy = $sort.data('sort-value');
      dir = $sort.data('sort-dir');
    }

    switch (sortBy) {
      default:
        filtered.propSort(sortBy);
    }

    switch (dir) {
      case 'desc':
        filtered.reverse();
    }

    site.ui.members.results = filtered;
  },
  pages: function () {
    var total = site.ui.members.results.length;
    var pages = Math.ceil(total / site.ui.members.perPage);
    return pages;
  },
  paginate: function () {
    var results = site.ui.members.results;
    var start = (site.ui.members.curPage - 1) * site.ui.members.perPage;
    var end = site.ui.members.curPage * site.ui.members.perPage;
    results = results.slice(start, end);
    return results;
  },
  update: function () {
    // 重新加载
    site.ui.members.curPage = 1;
    site.ui.members.filter();
    site.ui.members.sort();
    site.ui.members.load();

    site.ui.scrollPager.reset($('#membersScroller'));
  },
  loadMore: function (uiScrollPagerCallback) {
    if (!site.ui.members.isReady) return;

    // 由 ui-scrollPager 组件调用
    setTimeout(function () {
      if (site.ui.members.query != '') {
        uiScrollPagerCallback.call(window, 1);
        return;
      }

      var pages = site.ui.members.pages();
      var curPage = site.ui.members.curPage;

      var lastPage = curPage < pages ? 0 : 1;
      var append = 1;

      site.ui.members.curPage++;
      site.ui.members.load(append);

      uiScrollPagerCallback.call(window, lastPage);
    }, 500);
  },
  load: function (append) {
    var results = site.ui.members.paginate();
    var html = site.ui.members.renderMembers({ members: results });

    if (typeof append != 'undefined' && append) {
      $('#memberList').append(html);
    } else {
      $('#memberList').html(html);
    }

    site.trigger('domChanged');
    site.checkHashLinks();
    // 原 site.ajax.getNewLinks() 已删除
  }
});

/*
	
ui-loadWork
-----------------
- 成员列表里点击成员，展开显示其作品
	
*/

site.addUI('loadWork', {
  renderWork: 0,
  init: function () {},
  onFind: function ($el) {
    // 编译 Handlebars 模板
    if (!site.ui.loadWork.renderWork) {
      var workTemplate = $('#members-work-template').html();
      site.ui.loadWork.renderWork = Handlebars.compile(
        workTemplate.replace(/(?:\r\n|\r|\n)/g, '').replace(/[\s+]/g, ' ')
      );
    }

    $el.click(function (ev) {
      var id = $(this).data('id');
      var $into = $('#loadWork_' + id);

      if ($into.html() == '') {
        // 从 data.json 组合成员 + 作品数据
        var data = DATA_members['id_' + id];
        var projects = DATA_authors['id_' + id];
        var pObjs = [];

        if (projects == undefined) {
          // 无作品，填充 3 个空白占位
          for (var i = 0; i < 3; i++) {
            pObjs.push({ blank: true });
          }
        } else {
          projects.forEach(function (pId) {
            if (typeof pId == 'string') {
              var pObj = DATA_projects['id_' + pId];
              if (pObj) pObjs.push(pObj);
            }
          });

          if (projects.length > 0) {
            var pDiff = 3 - projects.length;
            if (pDiff > 0) {
              for (var j = 0; j < pDiff; j++) {
                pObjs.push({ blank: true });
              }
            }
          }
        }

        data.projects = pObjs;

        // 渲染
        var html = site.ui.loadWork.renderWork(data);
        $into.html(html);

        site.trigger('domChanged');
        site.checkHashLinks();
        // 原 site.ajax.getNewLinks() 已删除
      }

      // 切换激活状态
      if (!$el.hasClass('is-active')) {
        // 关闭已打开的
        var $cur = $('.ui-loadWork.is-active');
        if ($cur.length) {
          var curId = $cur.data('id');
          $('#loadWork_' + curId).html('');
          $cur.removeClass('is-active');
          $cur.find('.Item-body').removeClass('is-expanded');
        }

        $el.addClass('is-active');
        $el.find('.Item-body').addClass('is-expanded');

        var member = DATA_members['id_' + id];

        site.ui.logger.log({
          eventCategory: 'Member',
          eventAction: 'expand',
          eventLabel: 'Expanded view for ' + member.firstName + ' ' + member.lastName
        });
      } else {
        $into.html('');
        $el.removeClass('is-active');
        $el.find('.Item-body').removeClass('is-expanded');
      }
    });
  }
});

/*
	
ui-loadImages
-----------------
- 点击项目，展开图片列表（调试用）
	
*/

site.addUI('loadImages', function () {
  var $images = $(this).parent().find('.images');

  $(this).click(function () {
    var html = '';

    if ($images.html() == '') {
      var id = $(this).data('id');
      var project = DATA_projects['id_' + id];
      var images = project.images;

      images.forEach(function (image) {
        var ratio = image.height / image.width;
        var h = Math.round(ratio * 100);
        html += '<img src="' + image.small + '" width="100" height="' + h + '">';
      });
    }

    $images.html(html);
  });
});

/*
	
ui-loadProjects
-----------------
- 成员列表里点击成员，展开作品缩略图
	
*/

site.addUI('loadProjects', function () {
  var $into = $(this).parent().find('.projects');

  $(this).click(function () {
    var html = '';

    if ($into.html() == '') {
      var id = $(this).data('id');

      if (DATA_authors.hasOwnProperty('id_' + id) && DATA_authors['id_' + id].length) {
        var pIds = DATA_authors['id_' + id];

        pIds.forEach(function (pId) {
          var project = DATA_projects['id_' + pId];

          if (project && project.images.length) {
            var image = project.images[0];
            var ratio = image.height / image.width;
            var h = Math.round(ratio * 100);
            html += '<img src="' + image.small + '" width="100" height="' + h + '">';
          }
        });
      }
    }

    $into.html(html);
  });
});

/*
	
ui-allProjects
-----------------
- 成员详情页：显示该成员的全部作品
	
*/

site.addUI('allProjects', {
  renderProjects: 0,
  init: function () {},
  onFind: function ($el) {
    // 编译 Handlebars 模板
    if (!site.ui.allProjects.renderProjects) {
      var allProjectsTemplate = $('#all-projects-template').html();
      site.ui.allProjects.renderProjects = Handlebars.compile(
        allProjectsTemplate.replace(/(?:\r\n|\r|\n)/g, '').replace(/[\s+]/g, ' ')
      );
    }

    $el.addClass('ui-allProjects--handled');

    if (!site.ui.loadData.gotData) {
      site.on('gotData', function () {
        site.ui.allProjects.ready($el);
      });
    } else {
      site.ui.allProjects.ready($el);
    }
  },
  ready: function ($el) {
    var $into = $el;
    var id = $el.data('author-id');
    var html = '';

    if ($into.html() == '') {
      var data = DATA_members['id_' + id];
      var projects = DATA_authors['id_' + id];
      var pObjs = [];

      if (projects != undefined) {
        projects.forEach(function (pId) {
          if (typeof pId == 'string') {
            var pObj = DATA_projects['id_' + pId];
            if (pObj) pObjs.push(pObj);
          }
        });
      }

      data.projects = pObjs;

      // 渲染
      html = site.ui.allProjects.renderProjects(data);
      $into.html(html);

      site.trigger('domChanged');
      site.checkHashLinks();
      // 原 site.ajax.getNewLinks() 已删除
    }
  }
});

/* ============================================================
   Part 3 结束
   Part 4 将从 site.opts + site.init + Router + 初始化调用开始
   ============================================================ */
/*
Init the site
--------------------------------
*/

site.opts = {
  royalSlider: {
    imageScaleMode: 'fit',
    imageScalePadding: 0,
    autoScaleSlider: true,
    imageAlignCenter: true,
    controlNavigation: 'none',
    arrowsNav: false,
    arrowsNavAutoHide: false,
    autoHeight: false,
    slidesSpacing: 0,
    loop: true,
    usePreloader: true,
    transitionType: 'move',
    navigateByClick: true,
    sliderDrag: false,
    keyboardNavEnabled: true,
    easeOut: 'easeOutSine',
    easeInOut: 'easeInOutSine',
    transitionSpeed: '900',
    autoPlay: {
      enabled: true,
      pauseOnHover: false,
      delay: 5000,
      stopAtAction: false,
      video: {
        autoHideBlocks: true,
        autoHideArrows: false,
        vimeoCode:
          '<iframe src="https://player.vimeo.com/video/%id%?byline=0&amp;portrait=0&amp;autoplay=1" frameborder="no" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>'
      }
    }
  },

  breakPoints: {
    'Site--mobile': 745,
    'Site--tablet': 1024,
    'Site--desktop': 1400
  }
};

/*
-------------------
Ajax Rules 已全部删除（改 hash 路由）
-------------------
*/

/*
	
Away we go!
----------------
*/

site.init();

/* ============================================================
   Router（新增：hash 路由）
   解析 #/、#/work、#/members
   ============================================================ */

var Router = {
  current: '',
  routes: {
    '/': 'view-wall',
    '/work': 'view-work',
    '/members': 'view-members'
  },
  init: function () {
    window.addEventListener('hashchange', Router.resolve);
    Router.resolve();
  },
  resolve: function () {
    // 如果 setUrl 引起的 hash 变化，跳过
    if (site.vars.skipHashResolve) {
      site.vars.skipHashResolve = 0;
      return;
    }

    var hash = (location.hash || '#/').replace(/^#/, '');
    var parts = hash.split('/').filter(function (s) {
      return s;
    });
    var main = '/' + (parts[0] || '');
    var view = Router.routes[main] || 'view-wall';

    if (view === Router.current) return;
    Router.current = view;

    // 切换视图
    $('.View').removeClass('is-active');
    $('#' + view).addClass('is-active');

    // wall 特殊处理：控制 Site--wallActive 类
    if (view === 'view-wall') {
      site.$html.addClass('Site--wallActive Site--showWall');
    } else {
      site.$html.removeClass('Site--wallActive Site--showWall');
    }

    // 懒加载视图数据
    if (view === 'view-work' && site.ui.projects && !site.ui.projects._ready) {
      site.ui.projects._ready = 1;
      site.ui.projects.ready();
    }
    if (view === 'view-members' && site.ui.members) {
      site.ui.members.ready();
    }

    // 滚动回顶部
    window.scrollTo(0, 0);

    site.trigger('domChanged');
    site.trigger('resize');
    site.trigger('scroll');
  }
};

Router.init();

/* ============================================================
   Core components
   ============================================================ */

/*
	 
ui-showOnLoad
-------------------	
	- Show on load
*/

site.addUI('showOnLoad', {
  init: function () {
    site.on('load', function () {
      site.ui.showOnLoad.run();
    });
  },
  run: function () {
    if (Modernizr.csstransitions) {
      setTimeout(function () {
        $('.ui-showOnLoad').addClass('show');
      }, 200);
      setTimeout(function () {
        site.trigger('show');
      }, 500);
    } else {
      $('.ui-showOnLoad')
        .delay(200)
        .animate({ opacity: 1 }, 1200, function () {
          site.trigger('show');
        });
    }
  }
});

site.registerComponent('toggleState', {
  init: function () {},
  toggleOn: function (selector) {
    var $el = $(selector);
    site.ui.toggleState.activate($el);
  },
  toggleOff: function (selector) {
    var $el = $(selector);
    site.ui.toggleState.deactivate($el);
  },
  activate: function ($el) {
    var state = $el.data('state');
    if (!site.defined(state)) state = 'is-active';
    if (!$el.hasClass(state)) $el.trigger('click');
  },
  deactivate: function ($el) {
    var state = $el.data('state');
    if (!site.defined(state)) state = 'is-active';
    if ($el.hasClass(state)) $el.trigger('click');
  },
  onFind: function ($el) {
    var specificOffSelector = $el.data('toggle-off-selector');
    var $specificOffSelector = [];

    if (!!site.defined(specificOffSelector)) {
      $specificOffSelector = $el.find(specificOffSelector);
    }

    if ($specificOffSelector.length) {
      site.click($specificOffSelector, function (ev) {
        var $parent = $specificOffSelector.closest('.ui-toggleState');
        $parent.data('toggle-locked', 0);
        ev.stopPropagation();
        ev.preventDefault();
        $parent.trigger('click');
      });
    }

    site.click($el, function () {
      site.ui.toggleState.toggle($el);
    });

    if ($el.hasClass('is-active') && $el.is(':visible')) {
      $el.removeClass('is-active');
      site.ui.toggleState.toggle($el);
    }
  },
  toggle: function ($el) {
    var toggleFor = $el.data('toggle-for');
    var $check = $el;
    if (!!site.defined(toggleFor)) {
      var $toggleFor = $(toggleFor);
      if ($toggleFor.length) $check = $toggleFor;
    }

    var specificOffSelector = $check.data('toggle-off-selector');

    var locked = $check.data('toggle-locked');
    if (!site.defined(locked)) locked = 0;

    var state = $check.data('state');
    if (!site.defined(state)) state = 'is-active';

    var offState = $check.data('off-state');
    if (!site.defined(offState)) offState = 'is-inactive';

    var informComponents = $check.data('toggle-inform-components');
    if (!site.defined(informComponents)) {
      informComponents = '.' + site.siteClass;
      var $informComponents = site.$html;
    } else {
      var $informComponents = $(informComponents);
    }

    var $alsoToggle = [];
    var alsoToggle = $check.data('toggle-also');
    if (!site.defined(alsoToggle)) alsoToggle = $el.data('toggle-also');
    if (!!site.defined(alsoToggle)) {
      $alsoToggle = $(alsoToggle);
    }

    var componentName = $check.data('toggle-inform-components');
    if (!site.defined(componentName)) componentName = site.componentName($check);

    var informAs = $check.data('toggle-inform-as');
    if (!site.defined(informAs)) {
      informAs = $el.data('toggle-inform-as');
    }

    var informState;
    if (!!site.defined(informAs)) informState = 'when-' + informAs + '-is-active';
    else informState = $check.data('toggle-inform-state');

    if (!site.defined(informState)) informState = 'when-' + componentName + '-is-active';

    var deactivateOthers = $check.data('toggle-deactivate-others');

    if (!locked) {
      if ($check.hasClass(state)) {
        $check.removeClass(state);
        $check.addClass(offState);
        if (!!site.defined(specificOffSelector)) $check.data('toggle-locked', 0);
        site.trigger('toggleOff', { $el: $check });
        site.trigger('toggle', { $el: $check });

        if ($informComponents.length) $informComponents.removeClass(informState);
        if ($alsoToggle.length) {
          $alsoToggle.removeClass(state);
          $alsoToggle.addClass(offState);
          site.trigger('toggleOff', { $el: $alsoToggle });
          site.trigger('toggle', { $el: $alsoToggle });
        }
      } else {
        if (!!site.defined(deactivateOthers)) {
          $('.' + componentName + ' > .' + state + ',.' + componentName + '.' + state).each(function () {
            var $this = $(this);
            var deactivateAs = $this.data('toggle-inform-as');
            var deactivateComponentName = site.componentName($this);

            var deactivateState;
            if (!!site.defined(deactivateAs)) deactivateState = 'when-' + deactivateAs + '-is-active';
            else deactivateState = $this.data('toggle-inform-state');

            if (!site.defined(deactivateState))
              deactivateState = 'when-' + deactivateComponentName + '-is-active';

            site.$html.removeClass(deactivateState);
            site.trigger('toggleOff', { $el: $this });
            site.trigger('toggle', { $el: $this });
            $this.removeClass(state).data('toggle-locked', 0);
          });

          $check.siblings('.' + state).removeClass(state);
        }

        $check.addClass(state);
        $check.removeClass(offState);
        if ($informComponents.length) $informComponents.addClass(informState);

        if (!!site.defined(specificOffSelector)) $el.data('toggle-locked', 1);
        site.trigger('toggleOn', { $el: $check });
        site.trigger('toggle', { $el: $check });

        if ($alsoToggle.length) {
          $alsoToggle.addClass(state);
          $alsoToggle.removeClass(offState);
          site.trigger('toggleOn', { $el: $alsoToggle });
          site.trigger('toggle', { $el: $alsoToggle });
        }
      }
    }
  }
});

/*
	 
	ui-hoverable
  -------------------	
*/

site.addUI('hoverable', function ($el) {
  if (!Modernizr.touch) {
    $el.hover(
      function () {
        $('.is-hover').removeClass('is-hover');
        $el.addClass('is-hover');

        var $parent = $el.closest('.ui-hoverable-parent');
        if ($parent.length) $parent.addClass('is-hover');
      },
      function () {
        $el.removeClass('is-hover');
        var $parent = $el.closest('.ui-hoverable-parent');
        if ($parent.length) $parent.removeClass('is-hover');
      }
    );
  } else {
    var twoTap = $el.data('hoverable-two-tap');
    twoTap = !!site.defined(twoTap) ? twoTap : false;

    $el.click(function (ev) {
      if (twoTap) {
        if ($el.hasClass('is-hover')) {
          $el.removeClass('is-hover');
          var $parent = $el.closest('.ui-hoverable-parent');
          if ($parent.length) $parent.removeClass('is-hover');
        } else {
          ev.preventDefault();
          ev.stopPropagation();

          $('.is-hover').removeClass('is-hover');
          $el.addClass('is-hover');

          var $parent = $el.closest('.ui-hoverable-parent');
          if ($parent.length) $parent.addClass('is-hover');
        }
      } else {
        $el.addClass('is-hover');
      }
    });
  }
});

site.registerComponent('siteClass', {
  classes: { site: [] },
  informed: [],
  init: function () {
    site.on('domChanged', function () {
      var com = site.data('siteClass');
      if (!$('.ui-siteClass').length && !$('.ui-siteClass-inherit').length) com.clearSiteClasses();
    });
  },
  applySiteClass: function (siteClass, group) {
    if (!site.defined(group)) group = 'site';
    var com = site.data('siteClass');
    if (!com.classes.hasOwnProperty(group)) com.classes[group] = [];

    com.clearSiteClasses(group);
    com.addSiteClass(siteClass, group);
  },
  clearSiteClasses: function (group) {
    if (!site.defined(group)) group = 'site';
    var com = site.data('siteClass');

    if (com.classes.hasOwnProperty(group)) {
      if (!com.classes[group].length) return;
      var classList = com.classes[group].join(' ');
      site.$html.removeClass(classList);

      if (com.informed.length) {
        for (var i in com.informed) {
          var $el = $(com.informed[i]);
          if ($el.length) $el.removeClass(classList);
        }
      }
    }
  },
  addSiteClass: function (siteClass, group) {
    if (!site.defined(group)) group = 'site';
    var siteClasses = siteClass.split(',');
    var com = site.data('siteClass');

    for (var i = 0; i < siteClasses.length; i++) {
      var sc = siteClasses[i];
      sc = 'Site--' + sc;

      com.classes[group].push(sc);
      site.trigger('siteClass', { className: sc, group: group });
      site.$html.addClass(sc);
    }
  },
  addElementClass: function (selector, className) {
    var com = site.data('siteClass');
    com.classes.push(className);
    com.informed.push(selector);
    var $el = $(selector);
    if ($el.length) $el.addClass(className);
  },
  onUnhandled: function ($el) {
    var group = $el.attr('data-site-class-group');
    if (!site.defined(group)) group = 'site';

    var com = site.data('siteClass');
    if (!com.classes.hasOwnProperty(group)) com.classes[group] = [];
    com.clearSiteClasses(group);

    var siteClass = $el.attr('data-site-class');
    var inform = $el.attr('data-site-class-inform');

    if (site.defined(inform)) {
      com.addElementClass(inform, siteClass);
    } else {
      if (site.defined(siteClass)) com.addSiteClass(siteClass, group);
    }
  }
});

site.addUI('siteClass-clickable', function ($el) {
  $el.click(function () {
    var group = $el.attr('data-site-class-group');
    if (!site.defined(group)) group = 'site';

    var com = site.data('siteClass');
    if (!com.classes.hasOwnProperty(group)) com.classes[group] = [];
    com.clearSiteClasses(group);

    var siteClass = $el.attr('data-site-class');
    var inform = $el.attr('data-site-class-inform');

    if (site.defined(inform)) {
      com.addElementClass(inform, siteClass);
    } else {
      if (site.defined(siteClass)) com.addSiteClass(siteClass, group);
    }
  });
});

site.addUI('clickable', {
  init: function () {},
  clickify: function ($el) {
    var $link = $el.find('.ui-clickable-link:first');
    if (!$link.length) $link = $el.find('a:first');

    // 阻止冒泡
    $link.click(function (ev) {
      ev.stopPropagation();
    });

    $el.click(function () {
      if ($link.hasClass('Site-link--external')) {
        window.open($link.attr('href'));
      } else {
        if (Modernizr.touch) {
          if ($el.hasClass('hover')) {
            $link.trigger('click');
          } else {
            $('.ui-clickable.hover').removeClass('hover');
            $el.addClass('hover');
          }
        } else {
          $link.trigger('click');
        }
      }
    });
  },
  onFind: function ($el) {
    site.ui.clickable.clickify($el);
  }
});

site.registerComponent('lazyImage', {
  _img: [],
  init: function () {
    site.on('scroll', function () {
      if (!site.windowLoaded) {
        site.when(
          function () {
            return site.windowLoaded;
          },
          function () {
            site.ui.lazyImage.check();
          },
          0
        );
        return;
      } else {
        site.ui.lazyImage.check();
      }
    });

    site.on('domChanged', function () {
      site.ui.lazyImage.check();
    });
  },
  check: function () {
    var className = 'ui-lazyImage';
    var $items = $('.' + className);

    if ($items.length) {
      var vis = 0;
      $items
        .not('.' + className + '--seen')
        .each(function (ix) {
          var loading = $(site.loadingSelector).length;

          if (loading <= 15) {
            if (!$(this).find('img').length) {
              var force = $(this).data('force');
              force = !!site.defined(force);

              if (force || site.isVisible($(this))) {
                $(this).removeClass('not-visible').addClass('is-visible');
                vis++;
                var $img = $(this);
                $img.addClass(className + '--seen');
                setTimeout(function () {
                  site.loadImage($img);
                  site.ui.lazyImage.setImages($img);
                  site.trigger('loadImage');
                }, vis * 200);
              } else {
                $(this).addClass('not-visible');
              }
            }
          }
        });
    }
  },
  getImages: function () {
    return site.ui.lazyImage._img;
  },
  setImages: function (img) {
    site.ui.lazyImage._img.push(img);
  }
});

site.registerComponent('royalSlider', {
  $slider: [],
  slider: {},
  opts: {
    imageScaleMode: 'fill',
    imageAlignCenter: true,
    controlNavigation: 'none',
    arrowsNav: false,
    arrowsNavAutoHide: false,
    autoHeight: false,
    slidesSpacing: 0,
    loop: true,
    usePreloader: true,
    transitionType: 'move',
    autoPlay: {
      enabled: true,
      pauseOnHover: true
    }
  },
  init: function () {
    site.on('startResize', function () {
      if (site.ui.royalSlider.exists()) {
        site.ui.royalSlider.$elements.each(function (ix) {
          var slider = $(this).data('royalSlider');
          if (slider) slider.updateSliderSize(true);
        });
      }
    });
    site.on('stopResize', function () {
      if (site.ui.royalSlider.exists()) {
        site.ui.royalSlider.$elements.each(function (ix) {
          var slider = $(this).data('royalSlider');
          if (slider) slider.updateSliderSize(true);
        });
      }
    });
  },
  onUnhandled: function ($el) {
    var opts =
      site.opts.hasOwnProperty('royalSlider') ? site.opts.royalSlider : site.ui.royalSlider.opts;

    $el.royalSlider(opts);

    var wrapperSelector = $el.data('royalslider-wrapper');
    var $wrapper;

    if (typeof wrapperSelector != 'undefined') {
      $wrapper = $el.closest(wrapperSelector);
    } else {
      $wrapper = $el.parent();
    }

    site.ui.royalSlider.$slider = $el;
    var slider = $el.data('royalSlider');
    site.ui.royalSlider.slider = slider;

    if (!slider) return;

    $wrapper.find('.ui-royalSlider-currentSlide').html(slider.currSlideId + 1);
    $wrapper.find('.ui-royalSlider-page').removeClass('is-active');
    $wrapper.find('.ui-royalSlider-page:eq(' + slider.currSlideId + ')').addClass('is-active');

    var $slide = $(slider.currSlide.content);
    var $caption = $slide.find('.ui-royalSlider-slideCaption');

    if ($caption.length) {
      var $globalCaption = $('.ui-royalSlider-caption');
      if ($globalCaption.length) $globalCaption.html($caption.text());
    }

    slider.ev.on('rsAfterContentSet', function (e, slideObject) {
      slider.updateSliderSize(true);
    });

    slider.ev.on('rsAfterSlideChange', function (event) {
      var $slide = $(slider.currSlide.content);
      $wrapper.find('.ui-royalSlider-currentSlide').html(slider.currSlideId + 1);
      $wrapper.find('.ui-royalSlider-page').removeClass('is-active');
      $wrapper.find('.ui-royalSlider-page:eq(' + slider.currSlideId + ')').addClass('is-active');

      var $caption = $slide.find('.ui-royalSlider-slideCaption');
      if ($caption.length) {
        var $globalCaption = $('.ui-royalSlider-caption');
        if ($globalCaption.length) $globalCaption.html($caption.text());
      }

      site.trigger('domChanged');
      // 原 site.ajax.getNewLinks() 已删除
    });

    $wrapper.find('.ui-royalSlider-page:eq(0)').addClass('is-active');

    $wrapper.find('.ui-royalSlider-page').click(function () {
      var slider = $el.data('royalSlider');
      var ix = $(this).index();
      slider.goTo(ix);
      $wrapper.find('.ui-royalSlider-page').removeClass('is-active');
      $wrapper.find('.ui-royalSlider-page:eq(' + ix + ')').addClass('is-active');
    });

    $wrapper.find('.ui-royalSlider-next').click(function () {
      var slider = $el.data('royalSlider');
      slider.next();
    });

    $wrapper.find('.ui-royalSlider-prev').click(function () {
      var slider = $el.data('royalSlider');
      slider.prev();
    });

    slider.updateSliderSize(true);
  }
});

site.addUI('slideDown', {
  elementHeight: {},
  $parent: {},
  init: function ($el) {
    site.on('load', function () {
      var $items = $('.ui-slideDown');
      if ($items.length) {
        $items.each(function () {
          var $el = $(this);
          if ($el.hasClass('is-expanded')) {
            $el.css('height', 'auto');
          }
        });
      }
    });

    site.on('startResize', function () {
      var $items = $('.ui-slideDown');
      if ($items.length) {
        $items.each(function () {
          var $el = $(this);
          if (!site.is('mobile')) {
            if ($el.hasClass('is-expanded')) {
              $el.css('height', 'auto');
            }
          }
        });
      }
    });

    site.on('stopResize', function () {
      var $items = $('.ui-slideDown');
      if ($items.length) {
        $items.each(function () {
          var $el = $(this);
          if (!site.is('mobile')) {
            if ($el.hasClass('is-expanded')) {
              $el.css('height', $el.outerHeight(true));
            }
          }
        });
      }
    });
  },
  onFind: function ($el) {
    if (site.ui.slideDown.exists()) {
      site.ui.slideDown.setHeight($el);
      site.ui.slideDown.classController($el);
    }
  },
  setHeight: function ($el) {
    $el.css('height', '0');
  },
  classController: function ($el) {
    var triggerSelector = $el.data('slidedown-trigger');
    var $parent = $el.parent();
    var $trigger = $parent.find(triggerSelector);

    if (!$trigger.length) $trigger = $(triggerSelector);

    $trigger.click(function () {
      site.ui.slideDown.open($el);
    });
  },
  close: function ($el) {
    var $toggle = [];
    var toggleSelector = $el.data('slidedown-toggle');

    if (typeof toggleSelector != 'undefined') {
      $toggle = $el.closest(toggleSelector);
      if (!$toggle.length) $toggle = $(toggleSelector);
    }

    $el.css('height', '0');
    $el.removeClass('is-expanded');
    $el.addClass('is-not-expanded');
  },
  open: function ($el) {
    var $toggle = [];
    var toggleSelector = $el.data('slidedown-toggle');

    if (typeof toggleSelector != 'undefined') {
      $toggle = $el.closest(toggleSelector);
      if (!$toggle.length) $toggle = $(toggleSelector);
    }

    $el.addClass('no-transition');
    $el.css('height', 'auto');
    var elementHeight = $el.outerHeight(true);

    if ($('.Item-body').hasClass('is-expanded')) {
      site.ui.slideDown.closeOthers();
    }

    if (!$el.hasClass('is-expanded')) {
      $el.removeClass('no-transition');
      $el.height(elementHeight);
    } else {
      $el.height(elementHeight);
    }

    $el.addClass('is-expanded');
    $el.removeClass('is-not-expanded');

    if ($toggle.length) $toggle.addClass('is-active').removeClass('is-inactive');
  },
  closeOthers: function () {
    $('.is-expanded').each(function () {
      var $parent = $(this).parent();
      var $toggle = $parent.closest($(this).data('slidedown-toggle'));
      $(this).css('height', '0');
      $(this).removeClass('is-expanded').addClass('is-not-expanded');
      if ($toggle.length) $toggle.removeClass('is-active').addClass('is-inactive');
    });
  }
});

site.registerComponent('isVisible', {
  init: function () {
    site.on('scroll', function () {
      if (!site.windowLoaded) {
        site.when(
          function () {
            return site.windowLoaded;
          },
          function () {
            site.ui.isVisible.check();
          },
          0
        );
        return;
      } else {
        site.ui.isVisible.check();
      }
    });

    site.on('domChanged', function () {
      site.ui.isVisible.check();
    });
  },
  onFind: function ($el) {
    $el.addClass('ui-isVisible--invisible');
  },
  check: function () {
    var className = 'ui-isVisible';
    var $items = $('.' + className);

    if ($items.length) {
      $items
        .not('.' + className + '--visible')
        .each(function (ix) {
          var $item = $(this);
          var itemLeft = $item.offset().left;
          var itemWidth = $item.outerWidth();
          var itemRight = itemLeft + itemWidth;

          if (itemLeft < site.windowWidth / 2) $item.addClass(className + '--left');
          if (itemRight - itemWidth / 2 > site.windowWidth / 2) $item.addClass(className + '--right');

          setTimeout(function () {
            if (Modernizr.touch || site.isVisible($item)) {
              setTimeout(function () {
                $item.removeClass(className + '--invisible').addClass(className + '--visible');
              }, 10);
            } else {
              $item.addClass(className + '--invisible');
            }
          }, 10);
        });
    }
  },
  reset: function () {
    var className = 'ui-isVisible';
    var $items = $('.' + className);
    $items.removeClass(className + '--visible').addClass(className + '--invisible');
  }
});

site.registerComponent('keepRatio', {
  init: function () {
    site.on('resize', function () {
      var $items = $('.ui-keepRatio');
      if ($items.length) {
        $items.each(function () {
          var $el = $(this);
          site.ui.keepRatio.resize($el);
        });
      }
    });
  },
  onUnhandled: function ($el) {
    site.ui.keepRatio.resize($el);
  },
  resize: function ($el) {
    var ratio = $el.data('ratio');
    if (!ratio) return;

    ratio = ratio.replace('x', ':');
    var ratioArray = ratio.split(':');
    var w = ratioArray[0];
    var h = ratioArray[1];

    var factor = h < w ? h / w : w / h;
    factor = h / w;

    $el.data('factor', factor);

    var curW = $el.outerWidth();
    var dataW = $el.data('width');
    if (site.defined(dataW)) curW = dataW;

    if (curW) {
      var newH = Math.round(curW * factor);
      $el.height(newH);
    } else {
      $el.height(0);
    }
  }
});

/* ============================================================
   以下 ajax 相关组件已删除：
   - site.addUI('ajax', ...)
   - site.addUI('ajaxBack', ...)
   - site.addUI('ajaxTeaser', ...)
   - site.addUI('ajaxPreload', ...)
   - site.addUI('autoFocus', ...)   // 纯前端但少用，可删
   - site.addUI('checkField', ...)  // $.post
   - site.addUI('ajaxForm', ...)    // $.post
   ============================================================ */

// 保留 autoFocus（纯前端）
site.addUI('autoFocus', function ($el) {
  setTimeout(function () {
    $el.focus();
  }, 500);
});

/* ============================================================
   Isotope + Packery（masonry）
   ============================================================ */

site.addUI('masonry', {
  ready: 0,
  resizing: 0,
  $grid: [],
  isotope: {},
  init: function () {
    site.on('resize', function () {
      site.trigger('masonryResize');
    });

    site.on('masonryResize', function () {
      if (site.ui.masonry.exists() && site.ui.masonry.ready) {
        site.ui.masonry.resizing = 1;
        site.ui.masonry.$grid.isotope('layout');

        setTimeout(function () {
          site.ui.masonry.resizing = 0;
          site.trigger('scroll');
        }, 1000);
      } else {
        site.on('masonryReady', function () {
          site.ui.masonry.$grid.isotope('layout');
          site.trigger('scroll');
        });
      }
    });

    site.on('domChanged', function () {
      if (site.ui.masonry.exists() && site.ui.masonry.ready) {
        site.ui.masonry.$elements.each(function () {
          var $el = $(this);
          var $added = $el.find('.ui-masonry-item').not('.ui-masonry-item--seen');
          if ($added.length && $el.data('isotope')) {
            $el.isotope('appended', $added);
            $el.isotope('layout');

            setTimeout(function () {
              $added.addClass('ui-masonry-item--seen');
              site.trigger('scroll');
            }, 50);
          }
        });
      }
    });
  },
  onFind: function ($el) {
    $el.css({ opacity: 0 });
    site.ui.masonry.ready = 0;

    setTimeout(function () {
      var $children = $el.find('.ui-masonry-item');
      $children.addClass('ui-masonry-item--seen');
      $el.data('childCount', $children.length);

      $el.isotope({
        isResizable: false,
        isResizeBound: false,
        layoutMode: 'packery',
        itemSelector: '.ui-masonry-item'
      });

      site.ui.masonry.$grid = $el;
      site.ui.masonry.ready = 1;

      site.trigger('onMasonryReady');
      $el.animate({ opacity: 1 });
    }, 300);
  }
});

/* ============================================================
   ui-scrollPager（触底加载，改为调用组件 loadMore）
   ============================================================ */

site.addUI('scrollPager', {
  loader:
    '<span class="Loader Loader--inline"><span class="Loader-body">Loading...</span><span class="Loader-spinner"></span></span>',
  init: function () {
    site.on('scroll', function () {
      site.ui.scrollPager.check();
    });
  },
  onFind: function ($el) {
    var offset = $el.offset().top;
    $el.data('offset', offset);

    var $loader = $(site.ui.scrollPager.loader);
    $loader.appendTo($el);
    $loader.css({ opacity: 0 });

    var pagesId = $el.data('scrollpager-pages');
    if (pagesId) $(pagesId).hide();
  },
  check: function () {
    $('.ui-scrollPager').each(function () {
      if (!$(this).hasClass('ui-scrollPager--loading')) {
        var offset = $(this).data('offset');
        var h = $(this).outerHeight();

        if (h) {
          var threshold = $(this).data('scrollpager-threshold');
          threshold = typeof threshold != 'undefined' ? parseInt(threshold) : 0;

          var occupiedHeight = offset + h;
          var loadAt = occupiedHeight - site.windowHeight - threshold;
          var scrolled = site.getScrollTop();

          if (scrolled >= loadAt) {
            site.ui.scrollPager.load($(this));
          }
        }
      }
    });
  },
  reset: function ($scrollPager) {
    $scrollPager.removeClass('ui-scrollPager--loading');
    $scrollPager.find('.Loader').stop().show().css({ opacity: 0 });
  },
  finish: function ($scrollPager) {
    $scrollPager.find('.Loader').hide();
  },
  load: function ($scrollPager) {
    $scrollPager.addClass('ui-scrollPager--loading');
    $scrollPager.find('.Loader').animate({ opacity: 1 });

    var call = $scrollPager.data('scrollpager-call');

    if (typeof call != 'undefined') {
      function executeFunctionByName(functionName, context) {
        var args = Array.prototype.slice.call(arguments, 2);
        var namespaces = functionName.split('.');
        var func = namespaces.pop();
        for (var i = 0; i < namespaces.length; i++) {
          context = context[namespaces[i]];
        }
        return context[func].apply(context, args);
      }

      executeFunctionByName(call, window, function (lastPage) {
        if (!lastPage) {
          $scrollPager.removeClass('ui-scrollPager--loading');
          $scrollPager.find('.Loader').stop().animate({ opacity: 0 });
        } else {
          $scrollPager.find('.Loader').hide();
        }
      });

      return;
    }

    // 无 call 时，直接隐藏 loader
    $scrollPager.find('.Loader').hide();
  }
});

/* ============================================================
   ui-jumpLink
   ============================================================ */

site.addUI('jumpLink', {
  init: function () {
    site.vars.jumping = 0;
  },
  onFind: function ($el) {
    $el.click(function () {
      var href = $(this).attr('href');
      var valid = !!href.match(/^[a-zA-Z0-9_#.\-]+$/);

      if (valid) {
        var $target = $($(this).attr('href'));
        var destination = $target.offset().top;

        site.vars.jumping = 1;
        site.trigger('jump', { $el: $target });

        $('html,body').animate({ scrollTop: destination }, 700, function () {
          site.vars.jumping = 0;
        });
      }
    });
  }
});

/* ============================================================
   ui-window（视图高度适配窗口）
   ============================================================ */

site.addUI('window', {
  init: function () {
    site.on('resize', function () {
      site.ui.window.resize();
    });
  },
  onFind: function () {
    site.ui.window.resize();
  },
  resize: function () {
    if (site.ui.window.exists()) {
      site.ui.window.$elements.each(function () {
        var excludeH = 0;

        $(this).css({ height: 'auto', width: '' });

        var exclude = $(this).data('window-exclude');
        if (!!site.defined(exclude)) {
          var $exclude = $(exclude);
          if ($exclude.length) {
            $exclude.each(function () {
              var oh = $(this).outerHeight(true);
              excludeH += oh;
            });
          }
        }

        var h = site.windowHeight - excludeH;
        var w = site.windowWidth;

        var $excludeInner = $(this).find('.ui-window-exclude');
        if ($excludeInner.length) {
          h -= $excludeInner.outerHeight();
          w -= $excludeInner.outerWidth();
        }

        var autoWidth = $(this).data('window-autowidth');
        if (!!site.defined(autoWidth)) {
          w = $(this).outerWidth();
        }

        var widthFrom = $(this).data('window-widthfrom');
        if (!!site.defined(widthFrom)) {
          var $from = $(widthFrom);
          w = $from.outerWidth();
        }

        var oh = $(this).outerHeight();
        var winH = h;
        h = oh > h ? oh : h;

        var fixedHeight = $(this).data('window-fixedheight');
        h = typeof fixedHeight == 'undefined' ? h : winH;
        var prop = typeof fixedHeight == 'undefined' ? 'min-height' : 'height';

        var cssopts = {};
        cssopts[prop] = h;

        var heightOnly = $(this).data('window-heightonly');
        if (!site.defined(heightOnly)) {
          cssopts['width'] = w;
        }

        $(this).css(cssopts);
      });
    }
  }
});

/* ============================================================
   ui-shareable（分享按钮）
   ============================================================ */

site.addUI('shareable', {
  shareUrls: {
    facebook:
      'http://www.facebook.com/sharer/sharer.php?s=100&p[title]={title}&p[summary]={desc}&p[url]={url}&p[images][0]={img}&',
    'facebook-app':
      'https://www.facebook.com/dialog/share?app_id={app_id}&display=page&href={url}&redirect_uri={redirect_url}',
    twitter: 'https://twitter.com/share?url={url}&text={title}&via={via}&hashtags={hashtags}',
    google: 'https://plus.google.com/share?url={url}',
    pinterest:
      'https://pinterest.com/pin/create/bookmarklet/?media={img}&url={url}&is_video={is_video}&description={title}',
    linkedin: 'http://www.linkedin.com/shareArticle?url={url}&title={title}',
    buffer: 'http://bufferapp.com/add?text={title}&url={url}',
    digg: 'http://digg.com/submit?url={url}&title={title}',
    tumblr: 'http://www.tumblr.com/share/link?url={url}&name={title}&description={desc}',
    reddit: 'http://reddit.com/submit?url={url}&title={title}',
    stumbleupon: 'http://www.stumbleupon.com/submit?url={url}&title={title}',
    delicious:
      'https://delicious.com/save?v=5&provider={provider}&noui&jump=close&url={url}&title={title}',
    email: 'mailto:?subject={title}&body={url}',
    renren: 'http://share.renren.com/share/buttonshare.do?link={url}&title={title}',
    weibo:
      'http://service.weibo.com/share/share.php?url={url}&appkey={app_id}&title={title}&pic={img}&ralateUid=&language=zh_cn',
    baidu:
      'http://like.baidu.com/set?buttontype=small&cb=bdShare.ajax._callbacks.bd4bb141b&index=0&url={url}'
  },
  init: function () {},
  onFind: function ($el) {
    var shareData = site.ui.shareable.shareData($el);
    $el.unbind('click');
    $el.attr('target', '_blank');
    $el.attr('href', shareData.shareUrl);
    $el.click(function (ev) {
      site.trigger('share', shareData);
    });
  },
  shareData: function ($item) {
    var service = $item.data('service');
    if (!site.defined(service)) service = $item.text().toLowerCase();
    if (!site.ui.shareable.shareUrls.hasOwnProperty(service)) return;

    var url = $item.data('url');
    var img = $item.data('img');
    var title = $item.data('title');
    var desc = $item.data('desc');
    var app_id = $item.data('app-id');
    var redirect_url = $item.data('redirect-url');
    var via = $item.data('via');
    var hashtags = $item.data('hashtags');
    var provider = $item.data('provider');
    var is_video = $item.data('is-video');

    if (!site.defined(url)) url = window.location.href;
    if (!site.defined(img)) img = '';
    if (!site.defined(title)) title = document.title;

    var $desc = $('meta[name="description"]');
    if (!site.defined(desc))
      desc = $desc.length ? $desc.attr('content') : 'Shared from ' + window.location.hostname;
    if (!site.defined(app_id)) app_id = 0;
    if (!site.defined(redirect_url)) redirect_url = window.location.href;
    if (!site.defined(via)) via = '';
    if (!site.defined(hashtags)) hashtags = '';
    if (!site.defined(provider)) provider = window.location.hostname;
    if (!site.defined(is_video)) is_video = 0;

    url = encodeURIComponent(url);
    img = encodeURIComponent(img);
    title = encodeURIComponent(title);
    desc = encodeURIComponent(desc);
    app_id = encodeURIComponent(app_id);
    redirect_url = encodeURIComponent(redirect_url);
    via = encodeURIComponent(via);
    hashtags = encodeURIComponent(hashtags);
    provider = encodeURIComponent(provider);
    is_video = encodeURIComponent(is_video);

    var shareUrl = site.ui.shareable.shareUrls[service] || '';
    shareUrl = shareUrl
      .replace('{url}', url)
      .replace('{img}', img)
      .replace('{title}', title)
      .replace('{desc}', desc)
      .replace('{app_id}', app_id)
      .replace('{redirect_url}', url)
      .replace('{via}', via)
      .replace('{hashtags}', hashtags)
      .replace('{provider}', provider)
      .replace('{is_video}', is_video);

    if (via == '') shareUrl = shareUrl.replace('&via=', '');
    if (hashtags == '') shareUrl = shareUrl.replace('&hashtags=', '');

    var shareData = {
      item: $item,
      shareUrl: shareUrl,
      url: url,
      title: title,
      service: service
    };

    return shareData;
  }
});

/* ============================================================
   ui-buttonClassSwitcher
   ============================================================ */

site.addUI('buttonClassSwitcher', {
  init: function () {
    site.on('resize', function () {
      var $items = $('.ui-buttonClassSwitcher');
      if ($items.length) {
        $items.each(function () {
          var $el = $(this);
          site.ui.buttonClassSwitcher.classSwitcher($el);
        });
      }
    });
  },
  onFind: function ($el) {
    site.ui.buttonClassSwitcher.classSwitcher($el);
  },
  classSwitcher: function ($el) {
    if (
      site.windowWidth <= site.opts.breakPoints['Site--tablet'] ||
      site.windowWidth <= site.opts.breakPoints['Site--mobile']
    ) {
      $el.removeClass('Button--default').addClass('Button--alt');
    } else {
      $el.removeClass('Button--alt').addClass('Button--default');
    }
  }
});

/* ============================================================
   ui-toggleFilter
   ============================================================ */

site.addUI('toggleFilter', {
  onFind: function ($el) {
    var $filterButtons = $('.ui-filterButton');
    var $filterBody = $('#filterBody');
    var $filterRegions = $('.ui-filterButton-region');
    var filterSelector = $el.data('filter-selector');
    var $trigger = $(filterSelector);

    if (Modernizr.touch) {
      $el.on('click touchstart', function () {
        if ($(this).hasClass('is-active')) {
          $filterButtons.removeClass('is-active').addClass('is-inactive');
          $filterRegions.removeClass('is-active').addClass('is-inactive');
          $trigger.addClass('is-inactive').removeClass('is-active');

          site.ui.selectors.go();
        }
      });
    } else {
      $el.click(function () {
        var $this = $(this);
        setTimeout(function () {
          if ($this.hasClass('is-active')) {
            var $yearFilter = $('#yearFilter');
            var $yearButton = $('#year');
            $yearButton.addClass('is-active').removeClass('is-inactive');
            $yearFilter.addClass('is-active').removeClass('is-inactive');
            $filterRegions.addClass('is-inactive');
          } else {
            $filterButtons.removeClass('is-active').addClass('is-inactive');
            $filterRegions.removeClass('is-active').addClass('is-inactive');
            $trigger.addClass('is-inactive').removeClass('is-active');

            site.ui.selectors.go();
          }
        }, 20);
      });
    }
  }
});

/* ============================================================
   ui-filterButton
   ============================================================ */

site.addUI('filterButton', {
  onFind: function ($el) {
    var $filterButtons = $('.ui-filterButton');
    var $filterBody = $('#filterBody');
    var $filterWork = $('#filterWork');
    var $filterRegions = $('.ui-filterButton-region');
    var filterSelector = $el.data('filter-selector');
    var $trigger = $(filterSelector);

    $el.click(function () {
      var $this = $(this);
      if ($this.hasClass('is-active')) {
        $this.removeClass('is-active');
        $('.Site').removeClass('when-Button-is-active');
      } else {
        $filterButtons.removeClass('is-active');
        $this.addClass('is-active');

        $filterRegions.addClass('is-inactive').removeClass('is-active');
        $trigger.addClass('is-active').removeClass('is-inactive');
      }
    });
  }
});

/* ============================================================
   ui-selectors（筛选器：点击 -> 生成 hash）
   ============================================================ */

site.addUI('selectors', {
  selection: {
    year: [],
    country: [],
    discipline: [],
    sector: [],
    sort: []
  },
  baseUri: '',
  lastUri: '',

  onFind: function ($el) {
    var $options = $('.ui-selectors-option');
    $options.each(function () {
      $(this).addClass('ui-selectors-option--handled');
      site.ui.selectors.toggleClasses($(this), $el);
      site.ui.selectors.updateButton($(this), $(this).data('button'));
    });

    var selector = $el.data('go');
    if (selector) {
      $(selector).click(function (e) {
        e.preventDefault();
        site.ui.selectors.go();
      });
    }

    var reset = $el.data('reset');
    if (reset) {
      $(reset).click(function (e) {
        e.preventDefault();
        site.ui.selectors.clearSelection($el);
        site.ui.selectors.go();
      });
    }

    site.ui.selectors.baseUri = $el.data('base-uri') || '/work';
    site.ui.selectors.lastUri = site.ui.selectors.baseUri;
  },

  toggleClasses: function ($option, $el) {
    var $elements = $option.find('li > ul > li');
    if (!$elements.length) $elements = $option.find('.ui-selectors-item');

    $elements.each(function () {
      $(this).click(function () {
        var $a = $(this).find('a');
        var auto = $option.data('auto');

        if ($option.data('type') == 'radio') {
          $option.find('a').addClass('is-inactive').removeClass('is-active');
        }

        if (!$a.hasClass('is-active')) {
          $a.addClass('is-active').removeClass('is-inactive');
        } else {
          $a.addClass('is-inactive').removeClass('is-active');
        }

        site.ui.selectors.buildSelection($el);
        site.ui.selectors.updateButton($option, $option.data('button'));

        if (typeof auto != 'undefined') {
          site.ui.selectors.go();
        }
      });
    });
  },
  resetClasses: function ($el) {
    var $options = $('.ui-selectors-option');
    $options.each(function () {
      site.ui.selectors.resetClass($(this), $el);
      site.ui.selectors.updateButton($(this), $(this).data('button'));
    });
  },
  resetClass: function ($option) {
    var $elements = $option.find('li > ul > li');
    if (!$elements.length) $elements = $option.find('.ui-selectors-item');

    $elements.each(function () {
      var $a = $(this).find('a');
      if ($option.data('type') == 'radio') {
        $option.find('a').removeClass('is-active').addClass('is-inactive');
      } else {
        $a.removeClass('is-active is-inactive');
      }
    });
  },
  updateButton: function ($el, buttonId) {
    var infoText;
    var active = $el.find('a.is-active').length;
    var $button = $('#' + buttonId);
    var $buttonText = $button.find('.Button-body');

    if (!$button.length) return;

    if ($el.data('type') == 'checkbox') {
      if (active == 0) infoText = $button.data('title');
      else if (active == 1) infoText = '1 ' + $button.data('single');
      else infoText = active + ' ' + $button.data('plural');
      $buttonText.text(infoText);
    } else {
      if (active == 0) $buttonText.text($button.data('title'));
      else $buttonText.text($el.find('a.is-active').text());
    }
  },
  buildSelection: function ($el) {
    site.ui.selectors.resetSelection();
    var $options = $('.ui-selectors-option');

    $options.each(function () {
      $(this)
        .find('a.is-active')
        .each(function () {
          var type = $(this).data('type');
          var value = $(this).data('value');
          if (site.ui.selectors.selection.hasOwnProperty(type)) {
            site.ui.selectors.selection[type].push(value);
          }
        });
    });
  },
  /* 生成 hash 并跳转 */
  go: function () {
    var hash = '#/work';
    var hasFilter = false;

    for (var i in site.ui.selectors.selection) {
      if (site.ui.selectors.selection[i].length) {
        hasFilter = true;
        hash += '/' + i + '/' + site.ui.selectors.selection[i].join(',');
      }
    }

    site.vars.skipHashResolve = 1;
    location.hash = hash;

    // 手动触发 projects 重新渲染
    setTimeout(function () {
      site.ui.projects.parseHash();
      site.ui.projects.reset();
      site.ui.projects.filter();
      site.ui.projects.sort();
      site.ui.projects.updateCount();
      site.ui.projects.load();
    }, 50);
  },
  resetSelection: function () {
    site.ui.selectors.selection = {
      year: [],
      country: [],
      discipline: [],
      sector: [],
      sort: []
    };
  },
  clearSelection: function ($el) {
    site.ui.selectors.resetSelection();
    site.ui.selectors.resetClasses($el);
  }
});

/* ============================================================
   ui-showHideNav（滚动时显示/隐藏顶部导航）
   ============================================================ */

site.addUI('showHideNav', {
  init: function () {
    site.on('scroll', function () {
      var $items = $('.ui-showHideNav');
      if ($items.length) {
        $items.each(function () {
          var $el = $(this);
          if (Modernizr.touch) return false;
          else site.ui.showHideNav.addClassOnScroll($el);
        });
      }
    });
  },
  onFind: function ($el) {
    if (Modernizr.touch) {
      return false;
    } else {
      site.ui.showHideNav.addClassOnScroll($el);
      site.ui.showHideNav.scrollDirection($el);
    }
  },
  addClassOnScroll: function ($el) {
    var scrollTop = $(window).scrollTop();

    if (scrollTop > 200) {
      site.$html.addClass('Site--scrolled');
    } else {
      if (scrollTop == 0) {
        site.$html.removeClass('Site--scrolled');
        $el.removeClass('is-scrollingUp is-scrollingDown');
      }
      if ($el.hasClass('is-scrollingUp')) {
      } else {
        site.$html.removeClass('Site--scrolled');
      }
    }
  },
  scrollDirection: function ($el) {
    var prevScroll = 0;
    $(window).scroll(function (event) {
      var currentScroll = $(this).scrollTop();

      if (site.$html.hasClass('Site--scrolled')) {
        if (currentScroll > prevScroll) {
          $el.addClass('is-scrollingDown').removeClass('is-scrollingUp');
        } else {
          $el.addClass('is-scrollingUp').removeClass('is-scrollingDown');
        }
      }
      prevScroll = currentScroll;
    });
  }
});

/* ============================================================
   ui-sortMembers / ui-filterMembers
   ============================================================ */

site.addUI('sortMembers', {
  init: function () {},
  onFind: function ($el) {
    $el.click(function () {
      $('.ui-sortMembers.is-active').removeClass('is-active');
      $(this).addClass('is-active');

      site.ui.members.update();
    });
  }
});

site.addUI('filterMembers', {
  init: function () {},
  onFind: function ($el) {
    $el.click(function () {
      $('.ui-filterMembers.is-active').removeClass('is-active');
      $(this).addClass('is-active');

      site.ui.members.update();
    });
  }
});

/* ============================================================
   BrowserDetect（保留，用于 html 类名）
   ============================================================ */

var BrowserDetect = {};

(function (undefined) {
  /* Apple Device Webkit Browsers */
  var isIdevice = /(iPhone|iPod|iPad).*AppleWebKit/i.test(navigator.userAgent);
  if (isIdevice) {
    document.getElementsByTagName('html')[0].className += ' ud-iphone ud-ipod ud-ipad';
  }
  var isIphone = /(iPhone).*AppleWebKit/i.test(navigator.userAgent);
  if (isIphone) {
    document.getElementsByTagName('html')[0].className += ' ud-iphone';
  }
  var isIpad = /(iPad).*AppleWebKit/i.test(navigator.userAgent);
  if (isIpad) {
    document.getElementsByTagName('html')[0].className += ' ud-ipad';
  }
  var isIpod = /(iPod).*AppleWebKit/i.test(navigator.userAgent);
  if (isIpod) {
    document.getElementsByTagName('html')[0].className += ' ud-ipod';
  }

  BrowserDetect = {
    init: function () {
      this.browser = this.searchString(this.dataBrowser) || 'An unknown browser';
      this.version =
        this.searchVersion(navigator.userAgent) ||
        this.searchVersion(navigator.appVersion) ||
        'an unknown version';
      this.OS = this.searchString(this.dataOS) || 'an unknown OS';
    },
    searchString: function (data) {
      for (var i = 0; i < data.length; i++) {
        var dataString = data[i].string;
        var dataProp = data[i].prop;
        this.versionSearchString = data[i].versionSearch || data[i].identity;
        if (dataString) {
          if (dataString.indexOf(data[i].subString) != -1) return data[i].identity;
        } else if (dataProp) return data[i].identity;
      }
    },
    searchVersion: function (dataString) {
      var index = dataString.indexOf(this.versionSearchString);
      if (index == -1) return;
      return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
    },
    dataBrowser: [
      { string: navigator.userAgent, subString: 'Chrome', identity: 'Chrome' },
      { string: navigator.userAgent, subString: 'OmniWeb', versionSearch: 'OmniWeb/', identity: 'OmniWeb' },
      { string: navigator.vendor, subString: 'Apple', identity: 'Safari', versionSearch: 'Version' },
      { prop: window.opera, identity: 'Opera', versionSearch: 'Version' },
      { string: navigator.vendor, subString: 'iCab', identity: 'iCab' },
      { string: navigator.vendor, subString: 'KDE', identity: 'Konqueror' },
      { string: navigator.userAgent, subString: 'Firefox', identity: 'Firefox' },
      { string: navigator.vendor, subString: 'Camino', identity: 'Camino' },
      { string: navigator.userAgent, subString: 'Netscape', identity: 'Netscape' },
      { string: navigator.userAgent, subString: 'MSIE', identity: 'Explorer', versionSearch: 'MSIE' },
      { string: navigator.userAgent, subString: 'Gecko', identity: 'Mozilla', versionSearch: 'rv' },
      { string: navigator.userAgent, subString: 'Mozilla', identity: 'Netscape', versionSearch: 'Mozilla' }
    ],
    dataOS: [
      { string: navigator.platform, subString: 'Win', identity: 'Windows' },
      { string: navigator.platform, subString: 'Mac', identity: 'Mac' },
      { string: navigator.userAgent, subString: 'iPhone', identity: 'iPhone/iPod' },
      { string: navigator.platform, subString: 'Linux', identity: 'Linux' }
    ]
  };

  BrowserDetect.init();

  document.getElementsByTagName('html')[0].className +=
    ' os-' + BrowserDetect.OS.toLowerCase() + ' ua-' + BrowserDetect.browser.toLowerCase() + ' ua-' + BrowserDetect.browser.toLowerCase() + '-' + BrowserDetect.version;
})();

/* ============================================================
   script.js 完整版结束
   ============================================================ */