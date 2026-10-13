/*!
 * site-core.js
 * ----------------------
 * AGI 站点主架构
 *
 * 部署：GitHub Pages，纯 hash 模式
 * URL 形如：https://username.github.io/agi-site/#/work/
 *
 * 依赖（必须在此之前加载）：
 *   - jQuery 2.1.x
 *   - jQuery UI 1.11.4
 *   - GSAP TweenMax 1.17.0
 *   - jQuery Easing 1.3
 *   - Handlebars 4.0.5
 *   - Fuse.js 2.6.0
 *   - Isotope 2.2.1
 *   - Packery 1.4.2
 *   - jQuery Mousewheel 3.1.13
 *   - jQuery ScrollTo 1.4.6
 *   - RoyalSlider 9.5.4
 *   - js/site-touch-plugins.js
 *   - js/utils.js
 *
 * 已删除：GA、checkField、ajaxForm、登录表单
 * 模式：纯 hash（pushState 关闭）
 */


/* ============================================================
   SITE.JS
   Description: Framework for automatic frontend heavy lifting
   ============================================================ */

var site = {
    currentState: '',
    previousStates: [],
    previousState: function(){
      return site.previousStates[site.previousStates.length - 1];
    },
    opts: {},
    trackMouse: 1,
    windowWidth: 0,
    windowHeight: 0,
    windowLoaded: 0,
    mouseX: 0,
    mouseY: 0,
    windowX: 0,
    windowY: 0,
    scrollTop: 0,
    scrollLeft: 0,
    busy: 0,
    touching: 0,
    touchTimer: 0,
    siteClass: 'Site',
    breakPoints: {
        'Site--mobile': 767,
        'Site--tablet': 1022,
        'Site--desktop': 1023
    },
    currentBreak : '',
    loadingSelector: '.Site-loading',
    loadedSelector: '.Site-loaded',
    lazyImageSelector: '.Site-lazy-image',
    seenSelector: '.Site-seen',
    stateSelector: '.Site-state',
    isVisibleSelector: '.Site-is-visible',
    keepRatioSelector: '.Site-keep-ratio',
    shareableSelector: '.Site-shareable',
    expandableSelector: '.Site-expandable',
    prefixes: {
        ui: '.ui-'
    },
    states: {
        active: '--active',
        inactive: '--inactive',
        loading: '--loading',
        loaded: '--loaded',
        seen: '--seen',
        handled: '--handled',
        visible: '--visible',
        invisible: '--invisible'
    },
    externalLinkClass: 'Site-link--external',
    hashLinkClass: 'Site-link--hash',
    shareUrls: {
        'facebook': 'http://www.facebook.com/sharer/sharer.php?s=100&p[title]={title}&p[summary]={desc}&p[url]={url}&p[images][0]={img}&',
        'facebook-app': 'https://www.facebook.com/dialog/share?app_id={app_id}&display=page&href={url}&redirect_uri={redirect_url}',
        'twitter': 'https://twitter.com/share?url={url}&text={title}&via={via}&hashtags={hashtags}',
        'google': 'https://plus.google.com/share?url={url}',
        'pinterest': 'https://pinterest.com/pin/create/bookmarklet/?media={img}&url={url}&is_video={is_video}&description={title}',
        'linkedin': 'http://www.linkedin.com/shareArticle?url={url}&title={title}',
        'buffer': 'http://bufferapp.com/add?text={title}&url={url}',
        'digg': 'http://digg.com/submit?url={url}&title={title}',
        'tumblr': 'http://www.tumblr.com/share/link?url={url}&name={title}&description={desc}',
        'reddit': 'http://reddit.com/submit?url={url}&title={title}',
        'stumbleupon': 'http://www.stumbleupon.com/submit?url={url}&title={title}',
        'delicious': 'https://delicious.com/save?v=5&provider={provider}&noui&jump=close&url={url}&title={title}',
        'email': 'mailto:?subject={title}&body={url}'
    },
    tasks: {
      queue: [],
      lastTask : 0,
      busy:0,
      add : function(tasks,callback){
        for(var t=0;t < tasks.length;t++){
          var obj = {data:tasks[t],func:callback,total:tasks.length};
          site.tasks.queue.push(obj);
        }
        return site.tasks;
      },
      continue : function(){
        site.tasks.busy = 0;
      },
      check : function(){
        if(site.lastTask){
          var complete = Math.abs(site.lastTask.total - site.tasks.queue.length);
          var progress = Math.round((complete / site.lastTask.total) * 100);
          var lastTask = site.lastTask;
          site.trigger('taskComplete',{progress:progress,task:lastTask.data});
          site.lastTask = 0;
        }
        if(!site.tasks.queue.length){
          site.tasks.busy = 0;
          site.trigger('tasksComplete');
          return;
        }
        if(site.tasks.queue.length && !site.tasks.busy){
          var task = site.tasks.queue.shift();
          if(typeof task != 'undefined'){
            site.lastTask = task;
            if(task.hasOwnProperty('data') && task.hasOwnProperty('func')){
              site.tasks.busy = 1;
              var callback = task.func;
              callback(task.data);
            }
          }
        }
      },
      interval : 0,
      tick:50,
      start : function(){
        if(!site.tasks.interval){
        site.tasks.interval = setInterval(function(){
          site.tasks.check();
        },site.tasks.tick);
        }
      },
      stop: function(){
        if(site.tasks.interval){
        clearInterval(site.tasks.interval);
        site.tasks.interval = 0;
        }
      }
    },
    requestURI: function() {
        return window.location.pathname;
    },
    httpHost: function() {
        return window.location.hostname;
    },
    inArray: function(needle, haystack) {
        return ($.inArray(needle, haystack) >= 0);
    },
    ui: {},
    vars: {},
    siteData: {},
    data: function(k, val) {
        if (!!site.defined(val)) {
            site.siteData[k] = val;
        } else {
            return site.siteData[k];
        }
    },
    $html: [],
    loaded: 0,
    loadedClass: 'Site--loaded',
    loaders: 0,
    loader: {},
    loadTimer:250,
    loadInitOpts: {},
    loaderObject: function(opts) {
        site.loaders++;
        this.defaults = {
            text: 'Loading…',
            html:'<div id="loader' + site.loaders + '" class="Site-loader"><span class="Loader"><span class="Loader-body">{text}</span><span class="Loader-spinner"></span></span></div>',
            $appendTo: $('body')
        };
        this.opts = $.extend(this.defaults, opts);
        this.$element = $(this.opts.html.replace('{text}', this.opts.text));
        this.$element.appendTo(this.opts.$appendTo);

        this.show = function(callback) {
            this.$element.fadeIn(site.loadTimer,function() {
                if (typeof callback != 'undefined') callback();
            });
        };
        this.hide = function() {
            if (site.windowLoaded) {
                this.$element.stop().fadeOut(250, function() {
                });
            }
        };
    },
    setState : function(to){
      var from = site.currentState;
      site.previousStates.push(from);
      site.trigger('exitState',{state:to,from:from,to:to});
      site.currentState = to;
      site.trigger('enterState',{state:to,from:from,to:to});
      site.trigger('setState',{state:to,from:from,to:to});
    },
    isRetina : function(){
      return (
        window.devicePixelRatio > 1 ||
        (window.matchMedia && window.matchMedia("(-webkit-min-device-pixel-ratio: 1.5),(-moz-min-device-pixel-ratio: 1.5),(min-device-pixel-ratio: 1.5)").matches)
      );
    },
    init: function(opts, callback) {
        // Override options are…optional. If they're actually a function, they must be the callback function
        if (typeof opts == 'undefined') opts = site.opts;
        if (typeof opts == 'function') {
            callback = opts;
            opts = {};
        }

        // Allow site to be fully extendable/overwritable
        site = $.extend(site, opts);

        // The handle is used for namespacing component listeners so we can auto load matched elements to registerd components when they fire an event
        site.vars.handle = site.siteClass;

        // jQuery objects cached
        site.$html = $('html');

        site.loader = new site.loaderObject(site.loadInitOpts);
        site.loader.show();

        // Change this to a single checkClickables() method
        site.checkExternalLinks();
        site.checkHashLinks();

        site.checkShareables();
        site.checkExpandables();

        site.ajax.url = site.requestURI();
        if (site.ajax.rules.length) site.ajax.init();

        // Start the ajax preloader even if there are no rules
        if (!site.windowLoaded) {
            site.on('load', function() {
                setTimeout(function() {
                    site.ajax.startPreload();
                }, 10000);
            });
        } else {
            setTimeout(function() {
                site.ajax.startPreload();
            }, 10000);
        }

        $(window).mousewheel(function(event) {
            // TODO: Normalize deltas... across diferent mice
            if(!site.vars.swiping){
              site.vars.swiping = 1;
              if(event.deltaY < 0){
                site.trigger('swipeUp');
              }else{
                site.trigger('swipeDown');
              }
              setTimeout(function(){
                site.vars.swiping = 0;
              },500)
            }
        });

        // Resize listener
        $(window).resize(function() {
            site.resize();
        });

        // Scroll listener
        if (!Modernizr.touch) {
            $(window).scroll(function() {
                site.scroll(1);
            });
        } else {
            document.addEventListener("touchstart", function() {
                if (site.touchTimer) {
                    clearTimeout(site.touchTimer);
                    site.touchTimer = 0;
                }
                site.touching = 1;
            }, false);
            document.addEventListener("touchend", function() {
                site.touchTimer = setTimeout(function() {
                    site.touching = 0;
                }, 1500);
            }, false);
            document.addEventListener("touchmove", site.scroll, false);
        }

        // Window load callback
        $(window).load(function() {
            site.windowLoaded = 1;
            site.loader.hide();
            $(window).scrollTo(0, 1);
            site.$html.addClass(site.loadedClass);
            site.trigger('load');
        });

        if (site.opts.trackMouse) {
            // Mouse position
            $(document).mousemove(function(event) {
                site.mouseX = event.pageX;
                site.mouseY = event.pageY;
                site.windowX = event.pageX - site.scrollLeft;
                site.windowY = event.pageY - site.scrollTop;
            });

            if (Modernizr.touch) {
                // Mouse position (with touch)
                document.addEventListener('touchmove', function(event) {
                    var touch = event.touches[0] || event.changedTouches[0];
                    site.mouseX = touch.pageX;
                    site.mouseY = touch.pageY;
                    site.windowX = touch.pageX - site.scrollLeft;
                    site.windowY = touch.pageY - site.scrollTop;
                });
            }
        }

        // Add some base styles. These can be pretty easily overridden by a more specific CSS rule
        var css = site.keepRatioSelector + ' { display:block;width:auto;position:relative } ' + site.keepRatioSelector + ' > * { display:block;width:100%;height:100%; } ' + site.lazyImageSelector.replace(',', ' img,') + ' img{ display:block;width:100%;height:auto; }';
        css += site.keepRatioSelector + site.lazyImageSelector.replace(',', ' img,') + ' img{ min-height:100%; }';
        css += 'html.site.expanded body{overflow:hidden;width:100%;} .site__ExpandContainer {z-index:999;display:none;position:fixed;width:100%;height:100%;top:0;left:0} .site__ExpandContent {width:100%;height:100%;position:relative;overflow:auto;} .site__ExpandContent img{width:100%;height:auto;max-width:none;position:relative;}';

        var head = document.head || document.getElementsByTagName('head')[0],
            style = document.createElement('style');

        style.type = 'text/css';
        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        head.appendChild(style);

        // Trigger resize & scroll
        site.resize();
        site.scroll();

        // Start frame loop
        site.frame();

        // Site defaults set up, custom init callback function can be called
        if (typeof callback != 'undefined') callback();

        site.trigger('domChanged'); // do this first to register new components
        site.trigger('ready');
        site.trigger("uriChanged", {
            uri: site.requestURI(),
            segments: site.ajax.segments(site.requestURI())
        });
        site.trigger('resize');
        site.trigger('scroll');

        // ============================================================
        // 首屏路由加载：如果 URL 带 #/xxx/ 则加载对应内容
        // GitHub Pages 上，hash 部分不会触发服务器请求，永远返回 index.html
        // 由 JS 根据 hash 决定加载哪个路由的内容
        // ============================================================
        (function() {
            var hash = window.location.hash.replace(/^#/, '');
            if (hash && hash !== '/' && hash !== '') {
                setTimeout(function() {
                    site.ajax.initialiseStateFromUrl();
                }, 100);
            }
        })();
    },
    frame: function() {
        requestAnimationFrame(function() {
            site.trigger('frame');
            site.frame();
        });
    },
    is: function(modifier) {
        if(site.opts.breakPoints.hasOwnProperty('Site--'+modifier)){
          return (site.windowWidth <= site.opts.breakPoints['Site--'+modifier]);
        }else{
          return site.$html.hasClass('Site--' + modifier);
        }
    },
    addUI: function(handle, component) {
        site.registerComponent(handle, component);
    },
    _: function(handle, component) {
        site.registerComponent(handle, component);
    },
    registerComponent: function(handle, component) {
        if (typeof component == 'function') {
            var callback = component;
            component = {
                init: function() {},
                onUnhandled: function($el) {
                    callback($el);
                }
            }
        }

        if (component.hasOwnProperty('onFind')) {
            component.onUnhandled = component.onFind;
        }

        if (!component.hasOwnProperty('onUnhandled')) {
            component.onUnhandled = function() {};
        }

        if (!component.hasOwnProperty('onFindAll')) {
            component.onFindAll = function() {};
        }

        // Store a reference to it in the ui object before the init() call, so it can reference itself
        site.ui[handle] = component;
        // Store a reference in the site data
        site.data(handle, component);

        if (component.hasOwnProperty('init') || component.hasOwnProperty('onUnhandled')) {
            // Set the site handle to the component namespace
            site.vars.handle = handle;

            if (component.hasOwnProperty('onUnhandled')) {
                site.addUnhandledListener(component.onUnhandled, handle)
            }

            component.$elements = [];
            component.$unhandled = [];

            // Elements on the page
            component.exists = function() {
                return this.$elements.length;
            }
            // Unhandled elements on the page
            component.unhandled = function() {
                return this.$unhandled.length;
            }

            // Any listeneners created now will be namespaced by the component handle
            if (component.hasOwnProperty('init')) {
                component.init();
            }

            // Reset the site handle
            site.vars.handle = site.siteClass;
        }
    },
    addUnhandledListener: function(func, handle) {
        site.on('domChanged', function(args) {
            var $elements = args.$elements;
            var $unhandled = args.$unhandled;
            // Update the $elements property in the component
            site.ui[handle].$elements = $elements;
            site.ui[handle].$unhandled = $unhandled;

            if ($unhandled.length) {
                $unhandled.each(function() {
                    var $el = $(this);
                    func($el);
                    site.handle($el, handle);
                });
                site.ui[handle].onFindAll($unhandled);
            }
        });
    },
    handle: function($el, handle) {
        $el.addClass('ui-' + handle + site.states.handled);
    },
    unHandle: function($elements) {
        $elements.each(function() {
            var $el = $(this);
            var classList = $el.attr('class');
            if(typeof classList != 'undefined'){
              classList = classList.replace(site.states.handled, '');
              $el.attr('class', '');
              $el.attr('class', classList);
            }
        });
    },
    listeners: {},
    on: function(eventName, callback) {
        // Get [optional] scope from event Name eg #lightbox.onToggleOn
        var scope = eventName.split('.');
        eventName = scope[(scope.length - 1)];
        scope = scope.join('.').replace('.' + eventName, '');

        // Get [optional] state from event name eg loadingScreen:onFrame, so that logic is only trggered if the site is in a certain state
        var state = eventName.split(':');
        eventName = state[(state.length - 1)];
        state = state.join(':').replace(':' + eventName, '');

        if (scope == eventName) scope = 0;
        if (state == eventName) state = 0;

        if (!site.listeners.hasOwnProperty(eventName)) site.listeners[eventName] = [];

        var callback = {
            func: callback,
            handle: site.vars.handle,
            scope: scope,
            state:state
        };
        site.listeners[eventName].push(callback);
    },
    trigger: function(eventName, params) {
        if (!site.defined(params)) params = {};
        if (site.listeners.hasOwnProperty(eventName)) site.deploy(site.listeners[eventName], params);
    },
    click: function($el, func) {
        if (Modernizr.touch) {
            $el.fastClick(func);
        } else {
            $el.click(func);
        }
    },
    onLoads: [],
    onLoad: function(callback) {
        site.onLoads.push(callback);
    },
    onStartScrolls: [],
    onStartScroll: function(callback) {
        site.onStartScrolls.push(callback);
    },
    onStopScrolls: [],
    onStopScroll: function(callback) {
        site.onStopScrolls.push(callback);
    },
    onScrolls: [],
    onScroll: function(callback) {
        site.onScrolls.push(callback);
    },
    scrolling: 0,
    stopScroll: 0,
    endScroll: 0,
    scroll: function() {
        if (!site.scrolling) {
            site.deploy(site.onStartScrolls);
        }

        site.scrolling = 1;

        if (site.stopScroll) clearTimeout(site.stopScroll);
        if (site.endScroll) clearTimeout(site.endScroll);

        site.scrollTop = site.getScrollTop();
        site.scrollLeft = site.getScrollLeft();

        site.deploy(site.onScrolls);
        site.trigger('scroll');

        site.stopScroll = setTimeout(function() {
            site.scrolling = 0
        }, 200);
        site.endScroll = setTimeout(function() {
            if (!site.scrolling) {
                site.deploy(site.onStopScrolls);
            }
        }, 300);
    },
    getScrollTop: function() {
        return $(window).scrollTop();
    },
    getScrollLeft: function() {
        return $(window).scrollLeft();
    },
    onStartResizes: [],
    onStartResize: function(callback) {
        site.onStartResizes.push(callback);
    },
    onStopResizes: [],
    onStopResize: function(callback) {
        site.onStopResizes.push(callback);
    },
    onResizes: [],
    onResize: function(callback) {
        site.onResizes.push(callback);
    },
    resizing: 0,
    stopResize: 0,
    endResize: 0,
    resize: function() {
        if (!site.resizing) {
            site.deploy(site.onStartResizes);
            site.trigger('startResize');
        }

        site.resizing = 1;

        if (site.stopResize) clearTimeout(site.stopResize);
        if (site.endResize) clearTimeout(site.endResize);

        site.windowHeight = $(window).height();
        site.windowWidth = $(window).width();

        /* js-powered breakpoint & orientation classes */
        if (site.windowWidth < site.windowHeight) {
            site.$html.addClass('portrait');
        } else {
            site.$html.removeClass('portrait');
            if ((site.windowWidth / site.windowHeight) < 1.5) {
                site.$html.addClass('square');
            } else {
                site.$html.removeClass('square');
            }
        }

        var breakClasses = [];
        for (var b in site.breakPoints) {
            breakClasses.push(b);
        }

        for (var i in site.breakPoints) {
            var bp = i;
            if (site.windowWidth <= site.breakPoints[i]  && site.currentBreak != i) {
                site.currentBreak = bp;
                site.$html.removeClass(breakClasses.join(' '));
                site.$html.addClass(i);
                site.trigger('breakpoint',{ breakpoint:bp });
                break;
            }
            site.currentBreak = i;
            site.$html.removeClass(breakClasses.join(' '));
            site.$html.addClass(i);
        }

        site.deploy(site.onResizes);
        site.trigger('resize');

        site.stopResize = setTimeout(function() {
            site.resizing = 0
        }, 200);
        site.endResize = setTimeout(function() {
            if (!site.resizing) {
                site.deploy(site.onStopResizes);
                site.trigger('stopResize');
            }
        }, 300);
    },
    whenThrottle: 50,
    whenListenerStarted: 0,
    whens: [],
    checkWhens: function() {
        if (!site.whens.length) return;
        var now = site.now();
        for (i in site.whens) {
            var obj = site.whens[i];
            var lastChecked = obj.lastChecked;
            var timeBetweenChecks = obj.timeBetweenChecks;
            if (typeof lastChecked == 'undefined' || (now - lastChecked) >= timeBetweenChecks) {
                var hasMet = obj.met;
                var nowMet = obj.condition();
                var everChecked = obj.everchecked;
                obj.everchecked = 1;
                obj.lastChecked = now;
                if (nowMet) {
                    obj.met = 1;
                    if (!hasMet) obj.onCallback();
                } else {
                    obj.met = 0;
                    if (!!hasMet || typeof everChecked == 'undefined') obj.offCallback();
                }
            }
            site.whens[i] = obj;
        }
    },
    startWhenListener: function(throttle) {
        if (site.whenListenerStarted) return;
        site.whenListenerStarted = 1;
        setInterval(site.checkWhens, site.whenThrottle);
    },
    when: function(condition, onCallback, offCallback, timeBetweenChecks) {
        var listen = 0;
        if (typeof timeBetweenChecks == 'undefined') timeBetweenChecks = 0;
        if (typeof offCallback == 'undefined') offCallback = function() {};
        if (typeof offCallback == 'function') listen = 1;
        else listen = 0;

        if (listen) {
            var obj = {
                'condition': condition,
                'onCallback': onCallback,
                'offCallback': offCallback,
                'met': 0,
                'timeBetweenChecks': timeBetweenChecks
            };
            site.whens.push(obj);
            if (site.whens.length == 1) site.startWhenListener();
        } else {
            var met = condition();
            if (met) {
                onCallback();
            } else {
                setTimeout(function() {
                    site.when(condition, onCallback, 0);
                }, site.whenThrottle);
            }
        }
    },
    interval: function(callback, delay, repetitions) {
        var x = 0;
        var intervalID = window.setInterval(function() {
            callback();
            if (++x === repetitions) {
                window.clearInterval(intervalID);
            }
        }, delay);
    },
    componentName: function($el) {
        var classes = $el.attr('class');
        var first = classes.split(' ')[0];
        var com = first.split('-')[0];
        return com;
    },
    checkLazyImages: function() {
        if (!site.windowLoaded) {
            site.when(function() {
                return site.windowLoaded;
            }, function() {
                site.checkLazyImages()
            }, 0);
            return;
        }
        var $items = $(site.lazyImageSelector);
        if ($items.length) {
            $items.not(site.seenSelector).each(function(ix) {
                var loading = $(site.loadingSelector).length;
                if (loading < 10) {
                    if (!$(this).find('img').length) {
                        if ($(this).hasClass(site.deClassify(site.lazyImageSelector) + '--force') || site.isVisible($(this))) {
                            var $img = $(this);
                            $img.addClass(site.deClassify(site.seenSelector));
                            setTimeout(function() {
                                site.loadImage($img)
                            }, ix * 300);
                        }
                    }
                }
            });
        }
    },
    preload: function(imgArray, callback) {
        var count = 0;
        var lgth = imgArray.length;

        var fnCallback = function() {}
        if (typeof callback !== 'undefined') fnCallback = callback;

        var fnCallbackEach = function() {}
        if (typeof callbackEach !== 'undefined') fnCallbackEach = callbackEach();

        for (var url in imgArray) {
            var img = new Image();
            var src = imgArray[url];
            img.id = url;
            addImageLoadCallback(img, url);
            img.src = imgArray[url];
        }

        function addImageLoadCallback(img, url) {
            img.onload = function(ev) {
                imgOnload(ev, url);
            }
            img.onerror = function(ev) {
                imgOnload(ev, url);
            }
        }

        function imgOnload(ev, pos) {
            count++;
            var src = ev.path[0].currentSrc;
            var args = {
                'complete': (count === lgth),
                'count': count,
                'length': lgth,
                'imgArray': imgArray,
                'src': src,
                'position': pos
            };
            fnCallback(args);
        }

        return {
            callback: function(fn) {
                callback = fn || fnCallback;
            }
        };
    },
    loadSrc: function(src, callback) {
        var i = new Image();
        i.onload = function() {
            callback(src);
        };
        i.src = src;
    },
    loadImage: function($image, callback) {
        var src = $image.data('image');
        if (!site.defined(src)) src = $image.data('src');

        $image.addClass(site.deClassify(site.loadingSelector));
        var i = new Image();
        i.onload = function() {
            var $load = $image;
            $load.html('<img style="visibility:hidden;" src="' + src + '" />');
            setTimeout(function() {
                $load.find('img').css({
                    visibility: 'visible'
                }).hide().fadeIn(1000, function() {
                    $(this).css({
                        'visibility': ''
                    });
                    if (typeof callback != 'undefined') callback();
                });
            }, 0);
            setTimeout(function() {
                $image.removeClass(site.deClassify(site.loadingSelector)).addClass(site.deClassify(site.loadedSelector));
            }, 500);
        };
        i.src = src;
    },
    checkIsVisibles: function() {
        if (!site.windowLoaded) return;
        var $items = $(site.isVisibleSelector);
        if ($items.length) {
            $items.not(site.isVisibleSelector + site.states.visible).each(function(ix) {
                if (site.isVisible($(this))) {
                    var $item = $(this);
                    setTimeout(function() {
                        $item.removeClass(site.deClassify(site.isVisibleSelector) + site.states.invisible).addClass(site.deClassify(site.isVisibleSelector) + site.states.visible + ' ' + site.deClassify(site.seenSelector));
                    }, 10);
                } else {
                    $(this).addClass(site.deClassify(site.isVisibleSelector) + site.states.invisible);
                }
            });
        }
    },
    getItemOffset: function($item) {
        return $item.offset().top;
    },
    getScrollY: function($item) {
        return site.scrollTop;
    },
    getScrollableHeight: function($item) {
        return site.windowHeight;
    },
    isVisible: function($item, args) {
        if (!site.defined(args)) args = {};

        var defaults = {
            threshold: 10
        }
        var options = $.extend(defaults, args);

        var offset = site.getItemOffset($item);
        var scrolled = site.getScrollY($item);
        var height = site.getScrollableHeight($item);
        var itemHeight = $item.outerHeight(true);

        var itemTop = offset;
        var itemBottom = offset + itemHeight;
        var itemMid = offset + Math.round(itemHeight / 2);

        var visTop = 0 + scrolled;
        var visBottom = height + scrolled;
        var threshold = options.threshold;

        var stopsBeingVisibleAt = visTop - itemHeight;

        var topVisible = ((itemTop >= (visTop - threshold)) && (itemTop <= (visBottom - threshold)));
        var bottomVisible = (itemBottom >= (visTop)) && (itemBottom <= (visBottom));
        var midVisible = (itemMid >= (visTop)) && (itemMid <= (visBottom));

        return (topVisible || bottomVisible || midVisible || (itemTop > stopsBeingVisibleAt) && (itemTop < visBottom));
    },
    setCookie : function(cname, cvalue, exdays) {
      var d = new Date();
      if(typeof cvalue == 'undefined') var cvalue = 1;
      if(typeof exdays == 'undefined') var exdays = 365;
      d.setTime(d.getTime() + (exdays*24*60*60*1000));
      var expires = "expires="+d.toUTCString();
      document.cookie = cname + "=" + cvalue + "; " + expires + ";path=/";
    },
    getCookie : function(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i=0; i<ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        return "";
    },
    keepRatios: function() {
        var $items = $(site.keepRatioSelector);
        if ($items.length) {
            site.keepRatio($items);
        }
    },
    keepRatio: function($items) {
        $items.each(function() {
            var ratio = $(this).data('ratio');
            ratio = ratio.replace('x', ':');
            var ratioArray = ratio.split(':');
            var w = ratioArray[0];
            var h = ratioArray[1];

            var factor = (h < w) ? h / w : w / h;
            factor = h / w;

            $(this).data('factor', factor);
            $(this).addClass('has-ratio');

            var curW = $(this).outerWidth();
            if (curW) {
                var newH = Math.round(curW * factor);
                $(this).height(newH);
            }
        });
    },
    expandContainers: 0,
    expandContainer: {},
    expandInitOpts: {},
    expandContainerObject: function(opts) {
        site.expandContainers++;
        this.defaults = {
            siteExpandedClass: 'expanded',
            html: '<div id="expand' + site.expandContainers + '" class="site__ExpandContainer"></div>',
            content: '<div class="site__ExpandContent"></div>',
            $appendTo: $('body')
        };
        this.opts = $.extend(this.defaults, opts);

        this.$element = $(this.opts.html);
        this.$element.appendTo(this.opts.$appendTo);

        this.$content = $(this.opts.content);
        this.$content.appendTo(this.$element);

        this.show = function(callback) {
            $('body').width($('body').width());
            site.$html.addClass(this.opts.siteExpandedClass);
            this.$element.fadeIn(function() {
                if (typeof callback != 'undefined') callback();
            });
        };
        this.hide = function() {
            var opts = this.opts;
            this.$element.stop().fadeOut(250, function() {
                $('body').css({
                    width: ''
                });
                site.$html.removeClass(opts.siteExpandedClass);
            });
        };
    },
    checkExpandables: function() {
        if (!site.expandContainers) {
            site.expandContainer = new site.expandContainerObject(site.expandInitOpts);
        }

        var $items = $(site.expandableSelector);
        if ($items.length) {
            $items.not(site.expandableSelector + site.states.handled).each(function(ix) {
                var $item = $(this);
                $item.addClass(site.deClassify(site.expandableSelector + site.states.handled));

                $item.click(function(ev) {
                    ev.preventDefault();
                    var canExpand = 1;
                    if (site.canExpands.length) canExpand = site.check(site.canExpands, {
                        $item: $item
                    });
                    if (canExpand) site.expand({
                        $item: $(this),
                        container: site.expandContainer,
                        loader: site.loader
                    });
                });
            });
        }
    },
    updateExpandables: function() {
        var $items = $(site.expandableSelector);
        $items.removeClass(site.deClassify(site.expandableSelector + site.states.handled)).unbind('click');
        site.checkExpandables();
    },
    canExpands: [],
    canExpand: function(callback) {
        site.canExpands.push(callback);
    },
    onExpands: [],
    onExpand: function(callback) {
        site.onExpands.push(callback);
    },
    expand: function(args) {
        var container = args.container;
        var loader = args.loader;
        var $item = args.$item;

        loader.show();
        container.$content.html('');
        container.show();

        var src = $item.attr('href');
        if (!site.defined(src)) src = $item.data('expand');

        var i = new Image();

        i.onload = function() {
            loader.hide();
            container.$content.html('<img src="' + src + '" />');
            var $img = container.$content.find('img');
            $img.css({
                opacity: 0
            });
            var h = $img.outerHeight();
            $img.animate({
                opacity: 1
            });

            if (Modernizr.touch) {
                $img.bind('touchy-drag', function(e, phase, $target, data) {
                    var movedTop = data.movePoint.y - data.lastMovePoint.y;
                    var movedLeft = data.movePoint.x - data.lastMovePoint.x;
                    var curTop = parseInt($target.position().top);
                    var curLeft = parseInt($target.position().left);
                    var maxTop = container.$element.outerHeight() - $target.outerHeight();
                    var curTop = parseInt($target.position().top);
                    var curLeft = parseInt($target.position().left);
                    var newTop = curTop + movedTop;
                    if (newTop < maxTop) newTop = maxTop;
                    if (newTop > 0) newTop = 0;
                    var maxLeft = container.$element.outerWidth() - $target.outerWidth();
                    var newLeft = curLeft + movedLeft;
                    if (newLeft < maxLeft) newLeft = maxLeft;
                    if (newLeft > 0) newLeft = 0;
                    var newLeft = curLeft + movedLeft;
                    if (newLeft < maxLeft) newLeft = maxLeft;
                    if (newLeft > 0) newLeft = 0;
                    $target.css({
                        top: newTop,
                        left: newLeft
                    });
                });

                $img.bind('touchy-pinch', function(e, $target, data) {
                    var scaled = data.scale - data.previousScale;
                    var pixels = Math.round(container.$element.outerWidth() * scaled);
                    if (data.scale < data.previousScale) pixels *= 2;
                    var newWidth = Math.round($target.outerWidth() + pixels);
                    if (newWidth < container.$element.outerWidth()) newWidth = container.$element.outerWidth();
                    var curTop = parseInt($target.position().top);
                    var curLeft = parseInt($target.position().left);
                    if (scaled > 1) {
                        curTop += Math.round(pixels / 2);
                        curLeft += Math.round(pixels / 2);
                    } else {
                        curTop -= Math.round(pixels / 2);
                        curLeft -= Math.round(pixels / 2);
                    }
                    var maxTop = container.$element.outerHeight() - $target.outerHeight();
                    var maxLeft = container.$element.outerWidth() - $target.outerWidth();
                    if (curTop < maxTop) curTop = maxTop;
                    if (curTop > 0) curTop = 0;
                    if (curLeft < maxLeft) curLeft = maxLeft;
                    if (curLeft > 0) curLeft = 0;
                    $target.css({
                        width: newWidth,
                        left: curLeft,
                        top: curTop
                    });
                });

                $img.bind('touchy-longpress', function() {
                    container.hide();
                });
            } else {
                $img.click(function() {
                    container.hide();
                });
            }
        }

        i.src = src;
    },
    checkShareables: function() {
        var $items = $(site.shareableSelector);
        if ($items.length) {
            $items.not(site.shareableSelector + site.states.handled).each(function(ix) {
                var $item = $(this);
                $item.addClass(site.deClassify(site.shareableSelector + site.states.handled));
                $item.click(function(ev) {
                    ev.preventDefault();
                    site.share($(this));
                });
            });
        }
    },
    updateShareables: function() {
        var $items = $(site.shareableSelector);
        $items.removeClass(site.deClassify(site.shareableSelector + site.states.handled)).unbind('click');
        site.checkShareables();
    },
    onShares: [],
    onShare: function(callback) {
        site.onShares.push(callback);
    },
    share: function($item) {
        var service = $item.data('service');
        if (!site.defined(service)) service = $item.text().toLowerCase();
        if (!site.shareUrls.hasOwnProperty(service)) return;

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
        if (!site.defined(desc)) desc = ($desc.length) ? $desc.attr('content') : 'Shared from ' + window.location.hostname;
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

        var shareUrl = site.shareUrls[service];
        shareUrl = shareUrl.replace('{url}', url).replace('{img}', img).replace('{title}', title).replace('{desc}', desc).replace('{app_id}', app_id).replace('{redirect_url}', url).replace('{via}', via).replace('{hashtags}', hashtags).replace('{provider}', provider).replace('{is_video}', is_video);

        if (via == '') shareUrl = shareUrl.replace('&via=', '');
        if (hashtags == '') shareUrl = shareUrl.replace('&hashtags=', '');

        site.deploy(site.onShares, {
            id: $item.data('callback-id'),
            item: $item,
            url: url,
            title: title,
            service: service
        });

        window.open(shareUrl);
    },
    defined: function(variable) {
        return !(typeof variable == 'undefined');
    },
    scrollToTop: function(callback) {
        site.scrollTo(0, callback);
    },
    scrollTo: function(pos, callback, $scroller) {
        if (Math.abs(Math.round(pos) - site.scrollTop) <= 1) {
            return;
        }
        if (typeof $scroller == 'undefined') {
            $.scrollTo(pos, 800, {
                easing: 'easeInOutExpo',
                axis: 'y',
                onAfter: function() {
                    site.scroll();
                    if (typeof callback != 'undefined') callback();
                }
            });
        } else {
            $scroller.scrollTo(pos, 800, {
                easing: 'easeInOutExpo',
                axis: 'y',
                onAfter: function() {
                    site.scroll();
                    if (typeof callback != 'undefined') callback();
                }
            });
        }
    },
    scrollToX: function(pos, callback, $scroller) {
        if (typeof $scroller == 'undefined') {
            $.scrollTo(pos, 800, {
                easing: 'easeInOutExpo',
                axis: 'x',
                onAfter: function() {
                    site.scroll();
                    if (typeof callback != 'undefined') callback();
                }
            });
        } else {
            $scroller.scrollTo(pos, 800, {
                easing: 'easeInOutExpo',
                axis: 'x',
                onAfter: function() {
                    site.scroll();
                    if (typeof callback != 'undefined') callback();
                }
            });
        }
    },
    checkExternalLinks: function() {
        var $assets = $('a').not('.' + site.externalLinkClass).filter(function() {
            var href = $(this).attr('href');
            if (!site.defined(href)) $(this).attr('href', '#');
            return $(this).attr('href').match(/\.(jpg|png|gif|pdf|zip|doc|docx|csv)/i);
        });

        $assets.addClass(site.externalLinkClass);
        $assets.attr('target', '_blank');

        var $internal = $('a[href^="/"],a[href^="' + window.location.protocol + '//' + window.location.hostname + '"]');
        var $external = $('a').not('.' + site.externalLinkClass).not($internal).not('a[href^=#]');
        if ($external.length) {
            $external.addClass(site.externalLinkClass);
            $external.unbind('click');
            $external.not('a[href^="tel:"],a[href^="mailto:"]').click(function(ev) {
                ev.preventDefault();
                ev.stopPropagation();
                window.open($(this).attr('href'));
            });
        }
    },
    checkHashLinks: function() {
        var $hashes = $('a[href^=#]').not('.' + site.hashLinkClass);
        if ($hashes.length) {
            $hashes.addClass(site.hashLinkClass);
            $hashes.click(function(ev) {
                ev.preventDefault();
            });
        }
    },
    checkShareLinks: function() {
        var $shares = $('.' + site.shareLinkClass);
        if ($hashes.length) {
            $hashes.addClass(site.hashLinkClass);
            $hashes.click(function(ev) {
                ev.preventDefault();
            });
        }
    },
    setTitle: function(title) {
        document.title = title;
    },
    deploy: function(functions, args) {
        if (!site.defined(args)) args = {};

        for (f in functions) {
            if (typeof functions[f] == 'function') {
                functions[f](args);
            } else {
                var func = functions[f].func;
                var handle = functions[f].handle;
                var scope = functions[f].scope;
                var state = functions[f].state;

                if(!state || state == site.currentState){
                    if (!!scope && args.hasOwnProperty('$el')) {
                        if (args.$el.is(scope)) {
                            var $elements = $(site.prefixes.ui + handle);
                            var $unhandled = $(site.prefixes.ui + handle).not(site.prefixes.ui + handle + site.states.handled);
                            args.$elements = $elements;
                            args.$unhandled = $unhandled;
                            func(args.$el, args);
                        }
                    } else {
                        var $elements = $(site.prefixes.ui + handle);
                        var $unhandled = $(site.prefixes.ui + handle).not(site.prefixes.ui + handle + site.states.handled);
                        args.$elements = $elements;
                        args.$unhandled = $unhandled;
                        func(args);
                    }
                }
            }
        }
    },
    check: function(functions, args) {
        if (!site.defined(args)) args = {};
        for (f in functions) {
            if (!functions[f](args)) return false;
        }
        return true;
    },
    now: function() {
        return new Date().getTime();
    },
    deClassify: function(string) {
        return string.replace('.', '');
    },
    deModify: function($el, className) {
        if (!site.defined(className)) className = 'is-active';
        var classnames = $el.attr('class');
        var pattern = new RegExp(className + "--[a-zA-Z\-0-9]+", "gi");
        classnames = classnames.replace(pattern, '');
        $el.attr('class', classnames);
    },
    ajax: {
        before:function(){},
        after:function(){},
        initialised: 0,
        requests: 0,
        forcehash: 0,
        back: 0,
        hash: '',
        selectedClass: 'is-active',
        handledClass: 'Link--ajax',
        ignoreClass: 'Ajax-link--ignore',
        protocol: window.location.protocol + '//',
        httpHost: window.location.hostname,
        initialPath: '/',
        remove: '/index.php',
        defaults: {
            transitionAfterXHR : false,
            transition: {
                out: 250,
                in : 1300
            },
            load: '.Site-body',
            back: '.Site-page'
        },
        rules: [],
        exampleRules: [{
            selectors: '.nav a',
            exclude: '.nav li.custom a',
            load: '.Site-body',
            find: '.Site-body',
            before: function(opts, callback) {
                alert('clicked nav a');
                callback()
            },
            after: function(opts, callback) {
                callback()
            }
        }, {
            selectors: '.Site-foot a',
            load: '.Site-body',
            before: function() {
                alert('clicked footer a')
            },
            after: function(opts, callback) {
                callback()
            }
        }],
        addRule: function(rule) {
            site.ajax.rules.push(rule);
        },
        exclude: [],
        nocache: [],
        cache: {
            pages: {},
            titles: {},
            opts: {}
        },
        cacheable: function(uri) {
            if (!site.ajax.nocache.length) return 1;
            for (var i in site.ajax.nocache) {
                var test = site.ajax.nocache[i];
                var r = new RegExp(test, "i");
                var match = uri.match(r);
                if (match != null) return 0;
            }
            return 1;
        },
        init: function() {
            if (!site.ajax.initialised) {
                site.ajax.initialised = 1;

                // 排除规则
                site.ajax.exclude.push('.' + site.ajax.handledClass);
                site.ajax.exclude.push('.' + site.ajax.ignoreClass);
                site.ajax.exclude.push('.' + site.externalLinkClass);
                // 只排除空 hash（Search / Close 按钮）和灯箱锚点
                // 不排除 #/work/ 这类路由链接，否则它们不会被 AJAX 接管
                site.ajax.exclude.push('a[href="#"]');
                site.ajax.exclude.push('a[href^="#lightbox"]');
                site.ajax.exclude.push('a[href$=".jpg"]');

                site.ajax.getNewLinks();

                if (site.ajax.forcehash) {
                    // hash 模式：监听 hashchange
                    window.addEventListener('hashchange', function() {
                        if (site.ajax.requests) {
                            site.ajax.back = 1;
                            site.ajax.initialiseStateFromUrl();
                        }
                    }, false);
                } else if (history.pushState) {
                    window.addEventListener('popstate', function(event) {
                        if (site.ajax.requests && event.state) {
                            site.ajax.back = 1;
                            site.ajax.initialiseStateFromUrl();
                        }
                    }, false);
                }
            }
        },
        uri: function() {
            return site.ajax.url.replace(/^(https?:\/\/[^\/]*)?\//, '').replace(site.ajax.remove, '');
        },
        lastUri: function() {
            return site.ajax.last_url.replace(/^(https?:\/\/[^\/]*)?\//, '').replace(site.ajax.remove, '');
        },
        segments: function(uri) {
            var requestURI = site.ajax.uri();
            var u = (!site.defined(uri)) ? requestURI : uri.replace(site.ajax.remove, '');
            u = u.replace(/^\//, '');
            return u.split('/');
        },
        segment: function(n) {
            return site.ajax.segments()[n]
        },
        lastSegments: function() {
            return site.ajax.lastUri().split('/');
        },
        lastSegment: function(n) {
            return site.ajax.lastSegments()[n];
        },
        currentLinks: function() {
            var uri = site.ajax.initialPath + site.ajax.uri();
            uri = uri.replace(/\/$/, '');
            var abs_uri = site.ajax.protocol + site.ajax.httpHost + uri;
            return $('a[href="' + uri + '"], a[href="' + abs_uri + '"], a[href="' + uri + '/"], a[href="' + abs_uri + '/?$"]');
        },
        parentLinks: function() {
            var uri = site.ajax.initialPath + site.ajax.uri();
            uri = uri.replace(/\/$/, '');
            segs = uri.split('/');
            var last = segs.pop();
            uri = segs.join('/');
            var abs_uri = site.ajax.protocol + site.ajax.httpHost + uri;
            return $('a[href="' + uri + '"], a[href="' + abs_uri + '"], a[href="' + uri + '/"], a[href="' + abs_uri + '/?$"]');
        },
        getNewLinks: function() {
            site.checkExternalLinks();
            site.checkHashLinks();

            for (var i in site.ajax.rules) {
                var rule = site.ajax.rules[i];
                if (typeof rule.exclude == 'undefined') rule.exclude = '';
                $(rule.selectors).not(rule.exclude).not(site.ajax.exclude.join(',')).each(function() {
                    var $link = $(this);
                    site.ajax.addClickEvent($link, rule);
                });
            }
        },
        addClickEvent: function($link, rule) {
            $link.addClass(site.ajax.handledClass);
            $link.attr('data-ajax-rule',rule.selectors);
            $link.click(function(ev) {
                ev.preventDefault();

                var find = (typeof rule.find == 'undefined') ? rule.load : rule.find;
                var before = rule.before;
                var after = rule.after;

                rule.link = $link;

                rule.load = rule.load;
                rule.before = before;
                rule.after = after;
                rule.find = find;

                site.ajax.getPage(rule);
            });
        },
        getPage: function(opts) {
            site.ajax.requests++;

            var $link = (typeof opts.link == 'undefined') ? [] : opts.link;

            if (typeof opts.load == 'undefined') opts.load = site.ajax.defaults.load
            if (typeof opts.find == 'undefined') opts.find = opts.load

            if (typeof opts.find == 'object' && opts.find.hasOwnProperty('attr')) {
                opts.find = (typeof opts.find.attr('id') != 'undefined') ? '#' + opts.find.attr('id') : '.' + opts.find.attr('class').replace(/(\s)/g, '.');
            }

            var $load = (typeof opts.load == 'string') ? $('' + opts.load) : opts.load;

            if(typeof opts.load == 'function') $load = opts.load({$tmp:[],$link:$link});

            var transition = (typeof opts.transition == 'undefined') ? site.ajax.defaults.transition : opts.transition;

            var url = ($link.length) ? $link.attr('href') : opts.url;

            if (typeof opts.cache == 'undefined') opts.cache = 1;
            if (typeof opts.setTitle == 'undefined') opts.setTitle = 1;
            if (typeof opts.setVisibleUri == 'undefined') opts.setVisibleUri = 1;
            if (typeof opts.updateLinks == 'undefined') opts.updateLinks = 1;
            if (typeof opts.updateGlobalUrl == 'undefined') opts.updateGlobalUrl = 1;
            if (typeof opts.continue == 'undefined') opts.continue = 1;
            if (typeof opts.back == 'undefined') opts.back = 0;
            if (typeof opts.replaceContent == 'undefined') opts.replaceContent = 1;

            if (opts.back) {
                url = site.ajax.lastUrl;
                opts.url = url;
            }

            if (opts.updateGlobalUrl) {
                site.ajax.lastUrl = site.ajax.url;
                site.ajax.url = url;
            }

            var uri = site.ajax.makeAjaxUrl(url);

            if (opts.updateLinks) {
                var $currentLinks = site.ajax.currentLinks();
                if ($currentLinks.length) {
                    $currentLinks.each(function() {
                        $(this).parents('ul').last().find('.' + site.ajax.selectedClass).removeClass(site.ajax.selectedClass);
                        $(this).parents('li').each(function() {
                            $(this).addClass(site.ajax.selectedClass).siblings().removeClass(site.ajax.selectedClass)
                        });
                    });
                }
                if ($link.length) $link.parents('li').addClass(site.ajax.selectedClass).siblings().removeClass(site.ajax.selectedClass);
            }

            opts.$link = $link;
            opts.$load = $load;
            opts.url = url;
            opts.transition = transition;
            opts.uri = uri;

            site.ajax.before({opts:opts});

            if (typeof opts.getPage == 'function') {
                if (opts.setVisibleUri) {
                      if (!site.ajax.back) site.ajax.setVisibleUri(uri);
                  }
                opts.getPage(opts, function() {
                    site.ajax.xhr(uri, opts);
                });
            } else {
                if (typeof opts.before == 'function'){
                  var cont = opts.before(opts);
                  if(cont === false) return false;
                }

                if (opts.setVisibleUri) {
                      if (!site.ajax.back) site.ajax.setVisibleUri(uri);
                  }

                if (opts.transition && opts.$load.length && opts.replaceContent) {
                    var transition = (typeof opts.transition == 'object') ? opts.transition.out : opts.transition;
                    if(transition){
                        if (typeof opts.find == 'string' || typeof opts.find == 'function') {
                            opts.$load.stop().animate({
                                opacity: 0
                            }, transition, function() {
                                site.ajax.xhr(uri, opts);
                            });
                        }else{
                          for (var i = 0; i < opts.find.length; i++) {
                            var $load = (typeof opts.find[i].load == 'string') ? $('' + opts.find[i].load) : opts.find[i].load;
                            if($load.length){
                              if(i == (opts.find.length - 1)){
                                $load.stop().animate({
                                opacity: 0
                            }, transition, function() {
                                site.ajax.xhr(uri, opts);
                            });
                              }else{
                                $load.stop().animate({
                                opacity: 0
                            }, transition, function() {
                            });
                              }
                            }
                        }
                    }
                    }else{
                      site.ajax.xhr(uri, opts);
                    }
                } else {
                    site.ajax.xhr(uri, opts);
                }
            }
        },
        refresh: 0,
        update: function(selector, opts) {
            site.ajax.refresh = 1;
            var finds = selector.split(',');
            var selectors = [];
            for (var i = 0; i < finds.length; i++) {
                var rule = {
                    find: finds[i],
                    load: finds[i]
                };
                selectors[i] = rule;
            }

            var $update = $(selector);

            var getOpts = {
                load: $update,
                find: selectors,
                setTitle: 0,
                updateGlobalUrl: 0,
                updateLinks: 0,
                url: window.location.pathname,
                replaceContent: 1,
                continue: 1
            }

            getOpts = $.extend(getOpts, opts);
            site.ajax.getPage(getOpts);
        },
        preloadUrls: [],
        queuePreload: function(url) {
            site.ajax.preloadUrls.push(url);
        },
        preload: function() {
            if (site.ajax.preloadUrls.length) {
                var url = site.ajax.preloadUrls.pop();
                url = site.ajax.makeAjaxUrl(url);
                site.ajax.xhr(url, [], {
                    continue: 0
                });
            }
        },
        startPreload: function() {
            setInterval(function() {
                site.ajax.preload();
            }, 800);
        },
        load: function(url, $load, opts) {
            var getOpts = {
                refresh: 1,
                load: $load,
                find: '.Site-body',
                setTitle: 0,
                updateGlobalUrl: 0,
                setVisibleUri: 0,
                updateLinks: 0,
                transition: 300,
                url: url,
                replaceContent: 1,
                continue: 1
            }

            getOpts = $.extend(getOpts, opts);

            site.ajax.refresh = getOpts.refresh;

            site.ajax.getPage(getOpts);
        },
        xhr: function(uri, opts) {
            if (site.ajax.cache.pages.hasOwnProperty(uri) && site.ajax.cacheable(uri) && (opts.cache == 1 || typeof opts.cache == 'undefined') && !site.ajax.refresh) {
                var response = site.ajax.cache.pages[uri];
                var title = site.ajax.cache.titles[uri];

                var $load = (typeof opts.load == 'string') ? $('' + opts.load) : opts.load;

                if (!!opts.continue) site.ajax.gotPage({
                    body: response,
                    title: title,
                    $target: $load,
                    opts: opts,
                    uri : uri,
                    title : title
                });
                else site.trigger('completedXHR', {
                    response: response,
                    uri : uri
                });
            } else {
                site.ajax.refresh = 0;

                $.get(uri, {}, function(response) {
                    // Strip scripts
                    response = response.replace(/<script\b[^<]*(?:(?!type="text\/javascript")) (?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

                    var $tmp = $("<div>").append(response);
                    var title = $tmp.find('title').html();

                    if (opts.setTitle && !!site.defined(title)) {
                        site.setTitle(title);
                    }

                    site.ajax.cache.pages[uri] = response;
                    site.ajax.cache.titles[uri] = title;
                    site.ajax.cache.opts[uri] = opts;
                    site.ajax.refresh = 0;

                    var $load = (typeof opts.load == 'string') ? $('' + opts.load) : opts.load;

                    if (!!opts.continue) site.ajax.gotPage({
                        body: response,
                        title: title,
                        $target: $load,
                        opts: opts,
                        uri : uri,
                        title : title
                    });
                    else site.trigger('completedXHR', {
                        response: response,
                        uri : uri
                    });
                });
            }
        },
        gotPage: function(responseObject) {
            var $tmp = $("<div>").append(responseObject.body);

            if (typeof responseObject.opts.find == 'string' || typeof responseObject.opts.find == 'function') {
                responseObject.opts.find = [{
                    find: responseObject.opts.find,
                    $load: $load,
                    load: responseObject.opts.load,
                    replaceContent: responseObject.opts.replaceContent
                }]
            }

            site.trigger('pageRequest', {
                response: responseObject.body,
                uri : responseObject.uri,
                title : responseObject.title
            });

            responseObject.opts.$tmp = $tmp;
            var $loadedInto = [];

            for (var i = 0; i < responseObject.opts.find.length; i++) {
                if(typeof responseObject.opts.find[i].find == 'function'){
                  var $found = responseObject.opts.find[i].find({$tmp:$tmp,$link:responseObject.opts.$link});
                  if($found.length) var filteredResponse = $found.html();
                }else{
                  var $found = $tmp.find(responseObject.opts.find[i].find);
                  if($found.length) var filteredResponse = $found.html();
                }

                if(typeof responseObject.opts.find[i].load == 'function'){
                  var $load = responseObject.opts.find[i].load({$tmp:$tmp,$link:responseObject.opts.$link});
                }else{
                  var $load = (typeof responseObject.opts.find[i].load == 'string') ? $('' + responseObject.opts.find[i].load) : responseObject.opts.find[i].load;
                }

                if($load.length){
                $loadedInto.push($load);

                var canLoad =  (!!site.defined(responseObject.opts.find[i].test)) ? responseObject.opts.find[i].test($load) : 1;

                if (!!site.defined(responseObject.opts.find[i].replaceContent) && responseObject.opts.find[i].replaceContent === 0) {
                    if(canLoad){
                      $load.append(filteredResponse);
                    }
                } else {
                    if(canLoad){
                        $load.html(filteredResponse);
                    }
                }

                        if(i == (responseObject.opts.find.length - 1)){
                          site.ajax.back = 0;
                          site.ajax.after(responseObject);
                          site.trigger('domChanged');
                          site.resize();
                          site.scroll();

                          if (typeof responseObject.opts.gotPage == 'function') {
                              responseObject.opts.gotPage(responseObject.opts, function() {
                                  site.ajax.getNewLinks();
                              });
                          } else {
                              site.ajax.getNewLinks();
                              if (typeof responseObject.opts.after == 'function') responseObject.opts.after(responseObject.opts);
                              if (responseObject.opts.replaceContent && responseObject.opts.transition && responseObject.$target.length) {
                                  var transition = (typeof responseObject.opts.transition == 'object') ? responseObject.opts.transition.in : (responseObject.opts.transition * 5)

                                  for (var l = 0; l < $loadedInto.length; l++) {
                                      $loadedInto[l].stop().animate({
                                          opacity: 1
                                      }, transition, 'easeOutExpo', function() {});
                                  }
                              }
                          }
                        }
                }
            }
        },
        initialiseStateFromUrl: function() {
            var url;

            if (site.ajax.forcehash) {
                // hash 模式：从 window.location.hash 取路由
                var hash = window.location.hash.replace(/^#/, '');
                url = hash || '/';
            } else {
                url = site.ajax.makeAjaxUrl(window.location);
            }

            var $load = $('.Site-body');
            var find = '.Site-body';

            site.ajax.getPage({
                url: url,
                load: $load,
                before: function() {},
                after: function() {},
                find: find,
                setVisibleUri: false,
                updateGlobalUrl: false,
                updateLinks: true,
                transition: {
                    out: 0,
                    in : 500
                }
            });
        },
        setVisibleUri: function(url) {
            var hashUrl = site.ajax.makeHashUrl(url);
            var ajaxUrl = site.ajax.makeAjaxUrl(url);

            if (site.ajax.forcehash) {
                // hash 模式：只改 hash，浏览器不会发起服务器请求
                var hashPart = hashUrl.split('#')[1] || '';
                window.location.hash = hashPart;
            } else if (history.pushState) {
                history.pushState({}, null, ajaxUrl);
            } else {
                window.location = hashUrl;
            }

            site.ajax.hash = hashUrl;
            var segments = site.ajax.segments(ajaxUrl);
            site.trigger("uriChanged", {
                uri: ajaxUrl,
                segments: segments
            });
        },
        makeHashUrl: function(url) {
            url = url.toString();
            url = url.replace(site.ajax.protocol, '');
            url = url.replace(site.ajax.httpHost + site.ajax.initialPath, "");
            var parsedUrl = (site.ajax.initialPath == '/') ? url : url.replace(site.ajax.initialPath, '');
            url = '/' + site.ajax.initialPath + "/#/" + parsedUrl;
            url = url.replace(/\/+/g, '/');

            if (history.pushState && !site.ajax.forcehash) {
                url = url.replace('/#/', '/');
            }

            return url;
        },
        makeAjaxUrl: function(url) {
            if (site.defined(url)) {
                url = url.toString();
                url = url + '/';
                url = url.replace(/^https?:\/\/[^\/]*\/?/, '');

                url = url.replace(site.ajax.protocol + site.ajax.httpHost + site.ajax.initialPath, "");
                var parsedUrl = (site.ajax.initialPath == '/') ? url : url.replace(site.ajax.initialPath, '');
                url = site.ajax.httpHost + '/' + site.ajax.initialPath + "/" + parsedUrl;

                url = url.replace(/^https?:\/\/[^\/]*\/?/, '');
                url = '/' + site.ajax.initialPath + "/" + parsedUrl;
                url = url.replace(/\/+/g, '/');

                return url;
            } else {
                return "";
            }
        }
    }
};

var BrowserDetect = {};

(function( undefined ){
    /* Apple Device Webkit Browsers */
    var isIdevice = /(iPhone|iPod|iPad).*AppleWebKit/i.test(navigator.userAgent);
    if (isIdevice){
        document.getElementsByTagName('html')[0].className += ' ud-iphone ud-ipod ud-ipad';
    }
    var isIphone = /(iPhone).*AppleWebKit/i.test(navigator.userAgent);
    if (isIphone){
        document.getElementsByTagName('html')[0].className += ' ud-iphone';
    }
    var isIpad = /(iPad).*AppleWebKit/i.test(navigator.userAgent);
    if (isIpad){
        document.getElementsByTagName('html')[0].className += ' ud-ipad';
    }
    var isIpod = /(iPod).*AppleWebKit/i.test(navigator.userAgent);
    if (isIpod){
        document.getElementsByTagName('html')[0].className += ' ud-ipod';
    }

BrowserDetect = {
    init: function () {
        this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
        this.version = this.searchVersion(navigator.userAgent)
            || this.searchVersion(navigator.appVersion)
            || "an unknown version";
        this.OS = this.searchString(this.dataOS) || "an unknown OS";
    },
    searchString: function (data) {
        for (var i=0;i<data.length;i++)    {
            var dataString = data[i].string;
            var dataProp = data[i].prop;
            this.versionSearchString = data[i].versionSearch || data[i].identity;
            if (dataString) {
                if (dataString.indexOf(data[i].subString) != -1)
                    return data[i].identity;
            }
            else if (dataProp)
                return data[i].identity;
        }
    },
    searchVersion: function (dataString) {
        var index = dataString.indexOf(this.versionSearchString);
        if (index == -1) return;
        return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
    },
    dataBrowser: [
        { string: navigator.userAgent, subString: "Chrome", identity: "Chrome" },
        { string: navigator.userAgent, subString: "OmniWeb", versionSearch: "OmniWeb/", identity: "OmniWeb" },
        { string: navigator.vendor, subString: "Apple", identity: "Safari", versionSearch: "Version" },
        { prop: window.opera, identity: "Opera", versionSearch: "Version" },
        { string: navigator.vendor, subString: "iCab", identity: "iCab" },
        { string: navigator.vendor, subString: "KDE", identity: "Konqueror" },
        { string: navigator.userAgent, subString: "Firefox", identity: "Firefox" },
        { string: navigator.vendor, subString: "Camino", identity: "Camino" },
        { string: navigator.userAgent, subString: "Netscape", identity: "Netscape" },
        { string: navigator.userAgent, subString: "MSIE", identity: "Explorer", versionSearch: "MSIE" },
        { string: navigator.userAgent, subString: "Gecko", identity: "Mozilla", versionSearch: "rv" },
        { string: navigator.userAgent, subString: "Mozilla", identity: "Netscape", versionSearch: "Mozilla" }
    ],
    dataOS : [
        { string: navigator.platform, subString: "Win", identity: "Windows" },
        { string: navigator.platform, subString: "Mac", identity: "Mac" },
        { string: navigator.userAgent, subString: "iPhone", identity: "iPhone/iPod" },
        { string: navigator.platform, subString: "Linux", identity: "Linux" }
    ]
};
BrowserDetect.init();
document.getElementsByTagName('html')[0].className +=  " os-"+BrowserDetect.OS.toLowerCase() +" ua-" + BrowserDetect.browser.toLowerCase() + " ua-"+ BrowserDetect.browser.toLowerCase() + "-" + BrowserDetect.version ;

})();


/* ============================================================
   全局数据变量
   ============================================================ */

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


/* ============================================================
   Handlebars helpers
   ============================================================ */

Handlebars.registerHelper('slugify', function (component, options) {
    var slug = component.replace(/[^\w\s]+/gi, '').replace(/ +/gi, '-');
    return slug.toLowerCase();
});

Handlebars.registerHelper('times', function(n, block) {
    var accum = '';
    for(var i = 0; i < n; ++i)
        block.data.index = i;
        block.data.first = i === 0;
        block.data.last = i === (n - 1);
        accum += block.fn(this);
    return accum;
});

Handlebars.registerHelper('ifLessThan4', function (index, options) {
   if((index + 1) < 4){
      return options.fn(this);
   } else {
      return options.inverse(this);
   }
});


/* ============================================================
   自定义函数
   ============================================================ */

function showLoader(){
  $('#loader1').stop().show().animate({width:'70%'},5000,'easeOutQuad');
}

function hideLoader(){
  $('#loader1').stop().animate({width:'100%'},500,'easeInExpo',function(){
    $('#loader1').animate({opacity:0},250,function(){
      $('#loader1').css({opacity:'',width:''});
    });
  });
}


/* ============================================================
   One-off click events
   ============================================================ */

$(document).ready(function(){

    site.on("#menuToggle.toggleOn", function() {
        $('#head').scrollTop(0);
    })

    $('.Navigation-item--search a,#logo a').click(function(ev){
        ev.preventDefault();

        $('.Navigation-item,#menuToggle').removeClass('is-active');
        site.$html.removeClass('when-Icon-is-active');

        if(site.$html.hasClass('Site--wallActive')){
            site.ui.wall.close();
        }else{
            $(this).parent().addClass('is-active');
            site.ui.wall.open();

            setTimeout(function(){
                if(!site.is('mobile')){
                    $('#query').focus();
                    $('#query').val('');
                }
            },700);
        }
    });

    // #home a 打开 Wall
    $('#home a').click(function(ev){
        ev.preventDefault();
        site.ui.wall.open();
    });

});


/* ============================================================
   Templates used
   ============================================================ */

var templates = {
    'wall' : '{{#each projects}}{{#if images.length }}<li class="List-item ui-masonry-item">\
          <article class="Item Item--wall ui-clickable " id="wallitem{{ id }}">\
              <div class="Item-media">\
              <span class="Image  ui-lazyImage  ui-keepRatio" data-id="{{ images.0.id }}" data-title="{{ title }}" data-src="{{ images.0.small }}"  data-ratio="{{ images.0.width }}:{{ images.0.height }}"></span>\
              </div>\
              <a class="Item-content ui-clickable-link" href="{{ url }}">\
                  <div class="Item-body">\
                      <div class="Content">\
                          <h3>{{ designer }}<br>{{ title }}{{#if year }}, {{ year }}{{/if}}</h3>\
                      </div>\
                  </div>\
              </a>\
          </article>\
      </li>{{/if}}{{#if ad }}<li class="List-item List-item--ad ui-masonry-item">\
          <article class="Item Item--wall ui-clickable " id="wallad{{ id }}">\
              <div class="Item-media">\
              <span class="Image  ui-lazyImage  ui-keepRatio" data-id="{{ ad.image.0.id }}" data-title="{{ ad.heading }}" data-src="{{ ad.image.0.small }}"  data-ratio="{{ ad.image.0.width }}:{{ ad.image.0.height }}"></span>\
              </div>\
              <a class="Item-content ui-clickable-link" href="{{ ad.url }}">\
                  <div class="Item-body">\
                      <div class="Content">\
                          <h3>{{ ad.heading }}<br>{{ ad.caption }}</h3>\
                      </div>\
                  </div>\
              </a>\
          </article>\
      </li>{{/if}}{{/each}}',
    'image' : '<img src="{ src }">'
}

var renderWall = Handlebars.compile(templates.wall.replace(/(?:\r\n|\r|\n)/g, '').replace(/[\s+]/g,' '));


/* ============================================================
   Load JSON data
   ============================================================ */

site.addUI('loadData',{
        gotData:0,
        onFind:function(){

        $.get('data.json',function(data){
        $.get('members.json',function(memberJSON){

            DATA_projects = data.projects;
            DATA_authors = data.authors;
            DATA_members = memberJSON;

            var projectsArray = toArray(DATA_projects);
            var memberArray = toArray(DATA_members);

            memberArray.forEach(function(member){
                var authored = DATA_authors['id_'+member.id];

                LIST_names.push(member.fullName.toLowerCase());
                INDEX_names_ids[member.fullName.toLowerCase()] = member.id;

                if(authored && authored.length){
                    member.projects = DATA_authors['id_'+member.id];
                    DATA_members['id_'+member.id].projects = DATA_authors['id_'+member.id];
                }
            });

            projectsArray = projectsArray.filter(function(project){
                return DATA_members.hasOwnProperty('id_'+project.author);
            })

            projectsArray.forEach(function(p,ix){
                var author = DATA_members['id_'+p.author];
                var country = (typeof author == 'undefined') ? 'Other' : author.nationalGroup;

                if(FILTER_countries.indexOf(country) == -1) FILTER_countries.push(country);
                projectsArray[ix].country = country;

                var sectorsArr = projectsArray[ix].sector;
                sectorsArr.forEach(function(sector){
                    if(FILTER_sectors.indexOf(sector) == -1) FILTER_sectors.push(sector);
                });

                var typesArr = projectsArray[ix].type;
                typesArr.forEach(function(type){
                    if(FILTER_types.indexOf(type) == -1) FILTER_types.push(type);
                });
            });

            ARR_projects = projectsArray;
            ARR_members = memberArray;

            site.trigger('gotData');
            site.ui.loadData.gotData = 1;

            $('#projects').click(function(){
                var html = '';
                projectsArray.propSort('title');
                projectsArray.forEach(function(project){
                        html += '<div><a href="#'+project.id+'" data-id="'+project.id+'" class="ui-loadImages">'+project.title+'</a> '+project.designer+'<div><em>'+project.images.length+' images</em></div><div class="images"></div></div>';
                });
                $('#content').html(html);
            });

            $('#shuffle').click(function(){
                var html = '';
                var keys = Object.keys(DATA_projects);
                keys = keys.shuffle();
                var items = keys.slice(0,50);
                items.forEach(function(k){
                    var project = DATA_projects[k];
                    if(project.images.length){
                        var image = project.images[0];
                        var ratio = image.height / image.width;
                        var h = Math.round(ratio * 100);
                        html += '<img src="'+image.small+'" title="'+project.title+' — '+project.designer+'" width="100" height="'+ h +'">';
                    }
                });
                $('#content').html(html);
            });

            $('#members').click(function(){
                var html = '';
                memberArray.propSort('lastName');
                memberArray.forEach(function(member){
                    var memberProjects = (DATA_authors.hasOwnProperty('id_'+member.id) && DATA_authors['id_'+member.id].length) ? DATA_authors['id_'+member.id] : [];
                    html += '<div><a href="#m_'+member.id+'" data-id="'+member.id+'" class="ui-loadProjects">'+member.fullName+'</a><div><em>'+member.nationalGroup+' — '+memberProjects.length+' projects</em></div><div class="projects"></div></div>';
                });
                $('#content').html(html);
            });

        });
        });
    }
});


/* ============================================================
   ui-templateHeight
   ============================================================ */

site.addUI('templateHeight',{
    init : function(){
        site.on('resize',function(){
            $template = $('.ui-templateHeight');
            if($template.length){
                if(site.is('mobile')){
                    $template.css({'min-height':site.windowHeight});
                }else{
                    var headHeight = $('#head').outerHeight();
                    var $tHead = $('.Template-head');
                    var $tBody = $('.Template-body');
                    var margin = 0;
                    if($tHead.length) margin = parseInt($tHead.css('margin-top'));
                    if($tBody.length) margin += parseInt($tBody.css('margin-bottom'));
                    var min = site.windowHeight - margin - headHeight;
                    $template.css({'min-height':min});
                }
            }
        });
    },
    onFind : function(){}
});


/* ============================================================
   ui-logger（GA 已删除，保留组件结构，deQueue 为空转发）
   ============================================================ */

site.addUI('logger',{
    queue : [],
    timer : 0,
    init : function(){
        site.ui.logger.timer = setInterval(function(){
            site.ui.logger.deQueue();
        },1000)
    },
    log : function(item){
        site.ui.logger.queue.push(item);
    },
    deQueue : function(){
        if(site.ui.logger.queue.length){
            var item = site.ui.logger.queue.shift();
            // GA 已删除。如需接入其他统计，在此处转发 item。
            // 例如：console.log('event', item.eventCategory, item.eventAction, item.eventLabel);
        }
    }
})


/* ============================================================
   ui-wall
   ============================================================ */

site.addUI('wall',{
    curPage : 1,
    perPage: 48,
    results : [],
    active:0,
    query : 0,
    hideTimer : 0,
    init : function(){
        site.getScrollY = function(){
            if(site.ui.wall.active){
                return 0;
            }else{
                return site.scrollTop;
            }
        }

        site.getScrollTop = function(){
            if(site.ui.wall.active){
                return $('#wallScroll').scrollTop()
            }else{
                return $(window).scrollTop();
            }
        }
    },
    onFind : function($el){
        $el.addClass('ui-wall--handled');

        if(!site.ui.loadData.gotData){
            site.on('gotData',function(){
                site.ui.wall.ready();
            });
        }else{
            site.ui.wall.ready();
        }

        if(!Modernizr.touch){
            $('#wall .Wall-head').hover(function(){
                if(site.ui.wall.hideTimer) clearTimeout(site.ui.wall.hideTimer);
                $('#wall .Wall-head').stop().animate({opacity:1});
            },function(){
                $('#wall .Wall-head').stop().animate({opacity:0});
            });
        }
    },
    hideSearch : function(){
        if(Modernizr.touch) return;
        if(site.ui.wall.hideTimer) clearTimeout(site.ui.wall.hideTimer);

        site.ui.wall.hideTimer = setTimeout(function(){
            if(!$('#wall input:focus').length && !$('#wall .Wall-head:hover').length) $('#wall .Wall-head').stop().animate({opacity:0});
        },3000);
    },
    open : function(){
      var $scroller = $('#wallScroll');
      $scroller.removeClass('is-hidden');

      $('#wall .Wall-head').css({opacity:1});
      $('#wallItems').addClass('ui-scrollPager--loading');

      site.$html.addClass('Site--wallActive');
      site.ui.wall.active = 1;

      site.trigger('resize');

      setTimeout(function(){
        site.$html.addClass('Site--showWall');
      },20);

      setTimeout(function(){
          var $wall = $('#wall');
          $wall.addClass('is-active').removeClass('is-inactive');
          site.ui.wall.autoScroll($scroller);
      },300);
    },
    close : function(){
        $('#wall').removeClass('is-active').addClass('is-inactive');
        site.$html.removeClass('Site--showWall');

        setTimeout(function(){
            site.$html.removeClass('Site--wallActive');
            var $scroller = $('#wallScroll');
            $scroller.stop(true,false);
            $scroller.addClass('is-hidden');
            site.ui.wall.active  = 0;
        },650);
    },
    ready : function(){
        var projects = ARR_projects;
        projects = projects.shuffle();
        site.ui.wall.results = projects;
        site.ui.wall.load();

        var options = {
          threshold: 0.3,
          location: 0,
          distance: 200,
          maxPatternLength: 32,
          minMatchCharLength: 1,
          keys: [
            {name:"title",weight:0.5},
            {name:"designer",weight:1},
            {name:"tags",weight:0.3},
            {name:"details",weight:0.3},
            {name:"client",weight:0.4},
            {name:"sector",weight:0.3},
            {name:"type",weight:0.3},
            {name:"year",weight:0.3},
          ]
        };

        SEARCH = new Fuse(projects, options);

        $('#queryForm').submit(function(ev){
            ev.preventDefault();
        });
        $('#query').keyup(function(e){
            e.preventDefault();
            e.stopPropagation();

            var q = $(this).val();

            site.ui.wall.query = (q != '');

            if(q != ''){
                var qLower = q.toLowerCase();

                var replace = "(^"+qLower+")|( "+qLower+")";
                var re = new RegExp(replace);

                var directMatches = LIST_names.filter(function(item){
                    return item.match(re);
                });

                if(q.length >= 4){
                    site.ui.logger.log({
                        eventCategory: 'Wall',
                        eventAction : 'search',
                        eventLabel : 'Wall Search For '+q
                    });
                }

                if(directMatches && directMatches.length){
                    var pObjs = [];
                    for(d=0;d<directMatches.length;d++){
                        var fullName = directMatches[d];
                        var memberId = INDEX_names_ids[fullName.toLowerCase()];
                        var projects = DATA_authors['id_'+memberId];
                        projects.forEach(function(pId){
                            if(typeof pId == 'string'){
                                var pObj = DATA_projects['id_'+pId];
                                pObjs.push(pObj);
                            }
                        });
                    }
                    var results = pObjs;
                }else{
                    var results = SEARCH.search(q);
                }

            }else{
                var results = ARR_projects;
            }

            site.ui.wall.reset();
            results.shuffle();
            site.ui.wall.results = results;
            site.ui.wall.load();
        });

        var $scroller = $('#wallScroll');
        $scroller.scroll(function(){
            site.scroll(1);
        });

        $scroller.bind("scroll mousedown DOMMouseScroll mousewheel keyup touchmove", function(e){
            if ( e.which > 0 || e.type === "mousedown" || e.type === "mousewheel" || e.type === "touchmove"){
                 $scroller.stop();
            }
        });

        if($('.Site--wallActive').length){
            site.ui.wall.active = 1;
            site.ui.wall.hideSearch();
        }
    },
    loading : 0,
    loadMore : function(uiScrollPagerCallback){
        if(site.ui.wall.loading) return;
        site.ui.wall.loading = 1;

        setTimeout(function(){
            var pages = site.ui.wall.pages();
            var curPage = site.ui.wall.curPage;
            var lastPage = (curPage < pages) ? 0 : 1;
            var append = 1;

            site.ui.wall.curPage++;
            var append = 1;
            site.ui.wall.load(append);

            site.ui.wall.loading = 0;

            uiScrollPagerCallback.call(window,lastPage);

            if(!lastPage) site.ui.scrollPager.reset($('#wallItems'));
        },100);
    },
    reset : function(){
        site.ui.wall.curPage = 1;
        site.ui.scrollPager.reset($('#wallItems'));
        $('#wallScroll').stop().scrollTop(0);
    },
    pages : function(){
        var total = site.ui.wall.results.length;
        var pages = Math.ceil(total / site.ui.wall.perPage);
        return pages;
    },
    paginate : function(results){
        var start = (site.ui.wall.curPage - 1) * site.ui.wall.perPage;
        var end = (site.ui.wall.curPage) * site.ui.wall.perPage;
        results = site.ui.wall.results.slice(start,end);
        return results;
    },
    load : function(append){
        var projects = site.ui.wall.paginate();
        var ads = $('#wall').data('wall-ads');

        if(!site.ui.wall.query && ads){
            var frequency = Math.round((site.ui.wall.perPage / ads.length));
            ads.forEach(function(ad,ix){
                var pIx = ix * frequency;
                var rand = Math.round(Math.random() * 5);
                pIx += rand;
                if(projects.length <= pIx) pIx = (projects.length-1);
                projects[pIx].ad = ad;
            })
        }

        $('#wallCount').html(site.ui.wall.results.length);

        var html = '';
        html = renderWall({'projects':projects});

        var append = (typeof append != 'undefined') ? append : 0;
        if(append){
            $('#wallList').append(html);
        }else{
            if($('#wallList').hasClass("ui-masonry--handled") && ( $('#wallList').data('isotope')) ){
                $('#wallList').isotope('destroy');
                $('#wallList').removeClass('ui-masonry--handled');
            }
            $('#wallList').html(html);
        }

        site.trigger('domChanged');
        site.trigger('resize');
        site.ajax.getNewLinks();

        if(site.ui.wall.query){
            $('#wallScroll').stop().scrollTop(0);
        }else{
            site.ui.wall.autoScroll($('#wallScroll'));
        }

        setTimeout(function(){
            $('#wall').addClass('is-active');
        },500);
    },
    autoScroll : function($scroller){
      var destination = Math.abs($scroller.scrollTop()) + $scroller.outerHeight();
      var speed = site.is('mobile') ? 20000 : 40000;
      $scroller.stop().animate({ scrollTop: destination },speed,'linear',function(){
        site.ui.wall.autoScroll($scroller);
      });
    }
});


/* ============================================================
   ui-projects
   ============================================================ */

site.addUI('projects',{
    curPage : 1,
    perPage: 52,
    curFilters : {},
    renderFilters : 0,
    renderResults : 0,
    defaultTitle : '',
    filterText : {},
    results : [],
    init: function(){},
    onFind : function($el){
        $el.addClass('ui-projects--handled');
        site.ui.projects.curFilters = $el.data('filters');

        if(!site.ui.loadData.gotData){
            site.on('gotData',function(){
                site.ui.projects.ready();
            });
        }else{
            site.ui.projects.ready();
        }
    },
    ready : function($el){
        site.ui.projects.curPage = 1;

        if(!site.ui.projects.renderFilters){
            var resultsTemplate = $('#results-template').html();
            var filterTemplate = $('#filter-template').html();

            site.ui.projects.renderFilters = Handlebars.compile(filterTemplate.replace(/(?:\r\n|\r|\n)/g, '').replace(/[\s+]/g,' '));
            site.ui.projects.renderResults = Handlebars.compile(resultsTemplate.replace(/(?:\r\n|\r|\n)/g, '').replace(/[\s+]/g,' '));
        }

        FILTER_countries.sort();
        FILTER_sectors.sort();
        FILTER_types.sort();

        var countryCols = FILTER_countries.chunkify(6,1);
        var sectorCols = FILTER_sectors.chunkify(6,1);
        var typeCols = FILTER_types.chunkify(6,1);

        var filterCols = {
            'countryCols' : countryCols,
            'sectorCols' : sectorCols,
            'typeCols' : typeCols,
        }

        var filterHTML = site.ui.projects.renderFilters(filterCols);
        $(filterHTML).insertAfter($('#filter-template'));

        site.ui.projects.defaultTitle = $('#filterTitle').html();

        site.trigger('domChanged');
        site.checkHashLinks();
        site.ajax.getNewLinks();

        site.ui.projects.selectCurFilters();
        site.ui.projects.reset();
        site.ui.projects.filter();
        site.ui.projects.sort();
        site.ui.projects.updateCount();
        site.ui.projects.load();

        $('#loadMore').click(function(){
            site.ui.projects.loadMore();
        });

        $('#showSelection').click(function(){
            $('#filterWork,#filterProjects').removeClass('is-active').asdClass('is-inactive');
            $('html').removeClass('when-Button-is-active');
        });

        $('#filterProjects .Link--filter').click(function(){
                setTimeout(function(){
                    site.ui.projects.reset();
                    site.ui.projects.filter();
                    site.ui.projects.updateCount();
                    site.ui.projects.load();
                },150);
        });

        $('#clearFilter').click(function(){
                setTimeout(function(){
                    site.ui.projects.reset();
                    site.ui.projects.filter();
                    site.ui.projects.sort();
                    site.ui.projects.updateCount();
                    site.ui.projects.load();
                },150);
        });

        $('#Drop-sortby .Drop-body .Button').click(function(){
            setTimeout(function(){
                site.ui.projects.reset();
                site.ui.projects.sort();
                site.ui.projects.load();
            },150);
        });
    },
    selectCurFilters : function(){
        $('#yearFilter .is-active').removeClass('is-active');
        if(site.ui.projects.curFilters.year){
            var years = (typeof site.ui.projects.curFilters.year == 'string') ? [site.ui.projects.curFilters.year] : site.ui.projects.curFilters.year;
            years.forEach(function(y){
                $('#yearFilter [data-slug="'+y.toLowerCase()+'"]').addClass('is-active');
            });
        }

        $('#sectorFilter .is-active').removeClass('is-active');
        if(site.ui.projects.curFilters.sector){
            var sectors = (typeof site.ui.projects.curFilters.sector == 'string') ? [site.ui.projects.curFilters.sector] : site.ui.projects.curFilters.sector;
            sectors.forEach(function(s){
                $('#sectorFilter [data-slug="'+s.toLowerCase()+'"]').addClass('is-active');
            });
        }

        $('#countryFilter .is-active').removeClass('is-active');
        if(site.ui.projects.curFilters.country){
            var countries = (typeof site.ui.projects.curFilters.country == 'string') ? [site.ui.projects.curFilters.country] : site.ui.projects.curFilters.country;
            countries.forEach(function(c){
                $('#countryFilter [data-slug="'+c.toLowerCase()+'"]').addClass('is-active');
            });
        }

        $('#disciplineFilter .is-active').removeClass('is-active');
        if(site.ui.projects.curFilters.discipline){
            var disciplines = (typeof site.ui.projects.curFilters.discipline == 'string') ? [site.ui.projects.curFilters.discipline] : site.ui.projects.curFilters.discipline;
            disciplines.forEach(function(d){
                $('#disciplineFilter [data-slug="'+d.toLowerCase()+'"]').addClass('is-active');
            });
        }
    },
    setUrl : function(){
        var url = '/work/';
        for(var i in site.ui.projects.curFilters){
            if(site.ui.projects.curFilters.hasOwnProperty(i)){
                var segs = site.ui.projects.curFilters[i];
                if(segs){
                    if(typeof segs == 'string') segs = [segs];
                    segs.forEach(function(seg){
                        url += i+'/'+seg+'/';
                    });
                }
            }
        }

        site.ajax.setVisibleUri(url);
        // GA 已删除（原：ga('send', 'pageview', {...})）
    },
    reset : function(){
        site.ui.projects.curPage = 1;
    },
    filter : function(){
        var filtered = [];
        site.ui.projects.filterText = {};

        $filterYears = $('#yearFilter .is-active');
        var filterYears = [];
        var minYear = 0;
        var maxYear = 0;

        site.ui.projects.curFilters.year = $filterYears.length ? [] : false;

        $filterYears.each(function(){
            var val = $(this).data('value');
            var slug = $(this).data('slug');
            site.ui.projects.curFilters.year.push(slug);

            var parts = val.split('-');
            var yFrom = parts[0];
            var yTo = parts[1];

            if(yTo == 'today') yTo = new Date().getFullYear() + '';

             yFrom = +yFrom
             yTo = +yTo;

             minYear = (minYear) ? Math.min(minYear,yFrom) : yFrom;
             maxYear = (maxYear) ? Math.max(maxYear,yTo) : yTo;

            var filterYear = {yFrom:yFrom,yTo:yTo};
            filterYears.push(filterYear);
        });

        if(minYear && maxYear){
            site.ui.projects.filterText['year'] = 'from '+minYear + ' to ' + maxYear;
        }

        $filterCountry = $('#countryFilter .is-active');
        var filterCountry = [];
        var countryItems = [];

        site.ui.projects.curFilters.country = $filterCountry.length ? [] : false;

        $filterCountry.each(function(){
            var val = $(this).data('value');
            var slug = $(this).data('slug');
            site.ui.projects.curFilters.country.push(slug);
            filterCountry.push(val);
            countryItems.push($(this).text());
        });

        if(countryItems.length) site.ui.projects.filterText['country'] = 'in '+site.ui.projects.filterTitleList(countryItems);

        $filterSector = $('#sectorFilter .is-active');
        var filterSector= [];
        var sectorItems = [];

        site.ui.projects.curFilters.sector = $filterSector.length ? [] : false;

        $filterSector.each(function(){
            var val = $(this).data('value');
            var slug = $(this).data('slug');
            site.ui.projects.curFilters.sector.push(slug)
            filterSector.push(val);
            sectorItems.push($(this).text());
        });

        if(sectorItems.length) site.ui.projects.filterText['sector'] = 'for use in '+site.ui.projects.filterTitleList(sectorItems);

        $filterType = $('#disciplineFilter .is-active');
        var filterType = [];
        var typeItems = [];

        site.ui.projects.curFilters.discipline = $filterType.length ? [] : false;

        $filterType .each(function(){
            var val = $(this).data('value');
            var slug = $(this).data('slug');
            site.ui.projects.curFilters.discipline.push(slug);
            filterType.push(val);
            typeItems.push($(this).text());
        });

        if(typeItems.length) site.ui.projects.filterText['type'] = site.ui.projects.filterTitleList(typeItems) + ' work';

        filtered = ARR_projects.filter(function(project){
            var matches = 0;

            if(filterYears.length){
                var y = +project.year;
                filterYears.forEach(function(val){
                    if((y >= val.yFrom) && (y <= val.yTo)) matches++;
                });
                if(!matches) return false;
            }

            matches = 0;

            if(filterCountry.length){
                filterCountry.forEach(function(val){
                    if(project.country == val) matches++;
                });
                if(!matches) return false;
            }

            matches = 0;

            if(filterSector.length){
                filterSector.forEach(function(val){
                    if(project.sector.indexOf(val) != -1) matches++;
                });
                if(!matches) return false;
            }

            matches = 0;

            if(filterType.length){
                filterType.forEach(function(val){
                    if((project.type.indexOf(val) != -1) || (project.details.indexOf(val) != -1) ) matches++;
                });
                if(!matches) return false;
            }

            return true;
        });

        site.ui.projects.results = filtered;
    },
    sort : function(){
        var filtered = site.ui.projects.results;
        var sortBy = $('#Drop-sortby a.is-active').data('value');

        switch(sortBy){
            case "project-year":
                filtered.propSort('year');
                break;
            case "designer":
                filtered.propSort('designer');
                break;
            case "country":
                filtered.propSort('country');
                break;
            default:
                filtered.shuffle();
        }

        site.ui.projects.results = filtered;
    },
    filterTitleList : function(array){
        var out = '';
        if(array.length > 1) array[array.length - 1] = '& ' + array[array.length - 1];
        out = array.join(', ');
        out = out.replace(', &',' &');
        return out;
    },
    updateTitle : function(){
        if(isEmptyObject(site.ui.projects.filterText)){
            var title = site.ui.projects.defaultTitle;
        }else{
            var typeText = (site.ui.projects.filterText.hasOwnProperty('type')) ? site.ui.projects.filterText['type'] : 'AGI Work';
            var yearText = (site.ui.projects.filterText.hasOwnProperty('year')) ? site.ui.projects.filterText['year'] : '';
            var sectorText = (site.ui.projects.filterText.hasOwnProperty('sector')) ? site.ui.projects.filterText['sector'] : '';
            var countryText = (site.ui.projects.filterText.hasOwnProperty('country')) ? site.ui.projects.filterText['country'] : '';
            var title = typeText + ' ' + yearText + ' ' + countryText + ' ' +sectorText;
        }
        $('#filterTitle').html(title);
    },
    updateCount : function(){
        site.ui.projects.updateTitle();
        $('#filterCount').html(site.ui.projects.results.length);

        var plural = (site.ui.projects.results.length == 1) ? '' : 's';
        $('#filterPlural').html(plural);
    },
    pages : function(){
        var total = site.ui.projects.results.length;
        var pages = Math.ceil(total / site.ui.projects.perPage);
        return pages;
    },
    paginate : function(){
        var results = site.ui.projects.results;
        var start = (site.ui.projects.curPage - 1) * site.ui.projects.perPage;
        var end = (site.ui.projects.curPage) * site.ui.projects.perPage;
        results = results.slice(start,end);
        return results;
    },
    loadMore : function(){
        var pages = site.ui.projects.pages();
        var curPage = site.ui.projects.curPage;
        var lastPage = (curPage < pages) ? 0 : 1;
        var append = 1;
        site.ui.projects.curPage++;
        site.ui.projects.load(append);
    },
    load : function(append){
        var results = site.ui.projects.paginate();
        var html = site.ui.projects.renderResults({'projects':results});

        if(typeof append != 'undefined' && append){
            $('#projectGrid').append(html);
        }else{
            $('#projectGrid').html(html);
        }

        site.ui.projects.setUrl();
        site.trigger('domChanged');
        site.checkHashLinks();
        site.ajax.getNewLinks();

        var pages = site.ui.projects.pages();
        var curPage = site.ui.projects.curPage;

        if(curPage < pages){
            $('#loadMore').show();
        }else{
            $('#loadMore').hide();
        }
    }
});


/* ============================================================
   ui-members
   ============================================================ */

site.addUI('members',{
    query:'',
    curPage : 1,
    perPage:100,
    isReady : 0,
    renderMembers : 0,
    results : [],
    init: function(){},
    onFind : function($el){
        $el.addClass('ui-members--handled');

        if(!site.ui.loadData.gotData){
            site.on('gotData',function(){
                site.ui.members.ready();
            });
        }else{
            site.ui.members.ready();
        }
    },
    ready : function(){
        site.ui.members.curPage = 1;
        site.ui.members.query = '';
        site.ui.members.isReady = 0;

        $members = $('#members-template');

        if($members.length){
        if(!site.ui.members.renderMembers){
            var membersTemplate = $members.html();
            site.ui.members.renderMembers = Handlebars.compile(membersTemplate.replace(/(?:\r\n|\r|\n)/g, '').replace(/[\s+]/g,' '));
        }

            site.ui.members.results = ARR_members;

            $('#memberSearch').keyup(function(e){
                e.preventDefault();
                e.stopPropagation();

                site.ui.members.curPage = 1;
                site.ui.members.query = $(this).val();

                if(site.ui.members.query.length >= 4){
                    site.ui.logger.log({
                        eventCategory: 'Members',
                        eventAction : 'search',
                        eventLabel : 'Member Search For '+site.ui.members.query
                    });
                }

                site.ui.members.update();
            });

            site.ui.members.filter();
            site.ui.members.sort();
            site.ui.members.load();

            site.ui.members.isReady = 1;
        }
    },
    filter : function(){
            var filtered = [];
            var query = site.ui.members.query;

            if(query != ''){
                filtered = ARR_members.filter(function(member){
                var matches = 0;
                        var pattern = query;
                        var regex = new RegExp(pattern,'i');
                        if(member.fullName.match(regex)) matches++;
                    if(!matches) return false;
                return true;
            });
            site.ui.members.results = filtered;
            return;
            }

            $filterNames = $('#groups .is-active');
            var filterNames= [];
            $filterNames.each(function(){
                var val = $(this).data('value');
                filterNames.push(val);
            });

            filtered = ARR_members.filter(function(member){
                var matches = 0;

                if(filterNames.length){
                    filterNames.forEach(function(val){
                        if(val == 'all') {
                            matches++;
                        }else{
                            var pattern = '^['+val+']';
                            var regex = new RegExp(pattern,'i');
                            if(member.lastName.match(regex)) matches++;
                        }
                    });
                    if(!matches) return false;
                }
                return true;
            });

            site.ui.members.results = filtered;
    },
    sort : function(){
        var filtered = site.ui.members.results;
        var sortBy = 'lastName';
        var dir = 'asc';

        var $sort = $('.ui-sortMembers.is-active');
        if($sort.length){
            sortBy  = $sort.data('sort-value');
            dir = $sort.data('sort-dir');
        }

        switch(sortBy){
            default:
                filtered.propSort(sortBy);
        }

        switch(dir){
            case 'desc':
                filtered.reverse();
        }

        site.ui.members.results = filtered;
    },
    pages : function(){
        var total = site.ui.members.results.length;
        var pages = Math.ceil(total / site.ui.members.perPage);
        return pages;
    },
    paginate : function(){
        var results = site.ui.members.results;
        var start = (site.ui.members.curPage - 1) * site.ui.members.perPage;
        var end = (site.ui.members.curPage) * site.ui.members.perPage;
        results = results.slice(start,end);
        return results;
    },
    update : function(){
        site.ui.members.curPage = 1;
        site.ui.members.filter();
        site.ui.members.sort();
        site.ui.members.load();
        site.ui.scrollPager.reset($('#membersScroller'));
    },
    loadMore : function(uiScrollPagerCallback){
        if(!site.ui.members.isReady) return;

        setTimeout(function(){
            if(site.ui.members.query != ''){
                uiScrollPagerCallback.call(window,1);
                return;
            }

            var pages = site.ui.members.pages();
            var curPage = site.ui.members.curPage;
            var lastPage = (curPage < pages) ? 0 : 1;
            var append = 1;
            site.ui.members.curPage++;
            site.ui.members.load(append);

            uiScrollPagerCallback.call(window,lastPage);
        },500)
    },
    load : function(append){
        var results = site.ui.members.paginate();
        var html = site.ui.members.renderMembers({'members':results});

        if(typeof append != 'undefined' && append){
            $('#memberList').append(html);
        }else{
            $('#memberList').html(html);
        }

        site.trigger('domChanged');
        site.checkHashLinks();
        site.ajax.getNewLinks();
    }
});


/* ============================================================
   ui-loadWork
   ============================================================ */

site.addUI('loadWork',{
    renderWork : 0,
    init: function(){},
    onFind : function($el){
        if(!site.ui.loadWork.renderWork){
            var workTemplate = $('#members-work-template').html();
            site.ui.loadWork.renderWork = Handlebars.compile(workTemplate.replace(/(?:\r\n|\r|\n)/g, '').replace(/[\s+]/g,' '));
        }

        $el.click(function(ev){
            var id = $(this).data('id');
            var $into = $('#loadWork_'+id);

            if($into.html() == ''){
                var data = DATA_members['id_'+id];
                var projects = DATA_authors['id_'+id];
                var pObjs = [];

                if(projects == undefined) {
                    for(var i = 0;i<3;i++) {
                        pObjs.push({ 'blank':true });
                    }
                } else {
                    projects.forEach(function(pId){
                        if(typeof pId == 'string'){
                            var pObj = DATA_projects['id_'+pId];
                            pObjs.push(pObj);
                        }
                    });

                    if(projects.length > 0){
                        var pDiff = 3 - projects.length;
                        if(pDiff > 0){
                            for(var i = 0;i < pDiff;i++){
                                pObjs.push({ 'blank':true });
                            }
                        }
                    }
                }

                data.projects = pObjs;
                var html = site.ui.loadWork.renderWork(data);
                $into.html(html);

                site.trigger('domChanged');
                site.checkHashLinks();
                site.ajax.getNewLinks();
            }else{
            }

            if(!$el.hasClass('is-active')){
                var $cur = $('.ui-loadWork.is-active');
                if($cur.length){
                    var curId = $cur.data('id');
                    $('#loadWork_'+curId).html('');
                    $cur.removeClass('is-active');
                    $cur.find('.Item-body').removeClass('is-expanded');
                }

                $el.addClass('is-active');
                $el.find('.Item-body').addClass('is-expanded');

                // GA 相关 logger 调用保留，但 logger 已不发送 GA
                var member = DATA_members['id_'+id];
                site.ui.logger.log({
                    eventCategory: 'Member',
                    eventAction : 'expand',
                    eventLabel : 'Expanded view for '+member.firstName+' '+member.lastName
                });
            }else{
                $into.html('');
                $el.removeClass('is-active');
                $el.find('.Item-body').removeClass('is-expanded');
            }
        });
    }
});


/* ============================================================
   ui-loadImages
   ============================================================ */

site.addUI('loadImages',function(){
    var $images = $(this).parent().find('.images');
    $(this).click(function(){
        var html = '';
        if($images.html() == ''){
            var id = $(this).data('id');
            var project = DATA_projects['id_'+id];
            var images = project.images;

            images.forEach(function(image){
                var ratio = image.height / image.width;
                var h = Math.round(ratio * 100);
                html += '<img src="'+image.small+'" width="100" height="'+ h +'">';
            });
        }
        $images.html(html);
    })
});


/* ============================================================
   ui-loadProjects
   ============================================================ */

site.addUI('loadProjects',function(){
    var $into = $(this).parent().find('.projects');
    $(this).click(function(){
        var html = '';
        if($into.html() == ''){
            var id = $(this).data('id');

            if(DATA_authors.hasOwnProperty('id_'+id) && DATA_authors['id_'+id].length){
                var pIds = DATA_authors['id_'+id];

                pIds.forEach(function(pId){
                    var project = DATA_projects['id_'+pId];
                    if(project.images.length){
                        var image = project.images[0];
                        var ratio = image.height / image.width;
                        var h = Math.round(ratio * 100);
                        html += '<img src="'+image.small+'" width="100" height="'+ h +'">';
                    }
                });
            }
        }
        $into.html(html);
    })
});


/* ============================================================
   ui-allProjects
   ============================================================ */

site.addUI('allProjects',{
        renderProjects : 0,
        init:function(){},
        onFind : function($el){
        if(!site.ui.allProjects.renderProjects){
            var allProjectsTemplate = $('#all-projects-template').html();
            site.ui.allProjects.renderProjects = Handlebars.compile(allProjectsTemplate.replace(/(?:\r\n|\r|\n)/g, '').replace(/[\s+]/g,' '));
        }

            $el.addClass('ui-allProjects--handled');

        if(!site.ui.loadData.gotData){
            site.on('gotData',function(){
                site.ui.allProjects.ready($el);
            });
        }else{
            site.ui.allProjects.ready($el);
        }
    },
    ready : function($el){
    var $into = $el;
    var id = $el.data('author-id');

        var html = '';

        if($into.html() == ''){
                var data = DATA_members['id_'+id];
                var projects = DATA_authors['id_'+id];
                var pObjs = [];

                if(projects != undefined) {
                projects.forEach(function(pId){
                    if(typeof pId == 'string'){
                        var pObj = DATA_projects['id_'+pId];
                        pObjs.push(pObj);
                    }
                });
                }

                data.projects = pObjs;
                var html = site.ui.allProjects.renderProjects(data);
                $into.html(html);

                site.trigger('domChanged');
                site.checkHashLinks();
                site.ajax.getNewLinks();
            }else{
            }
    }
});


/* ============================================================
   Init the site
   ============================================================ */

site.opts = {

  royalSlider : {
          imageScaleMode: "fit",
          imageScalePadding: 0,
          autoScaleSlider: true,
          imageAlignCenter: true,
          controlNavigation: 'none',
          arrowsNav: false,
          arrowsNavAutoHide: false,
          autoHeight:false,
          slidesSpacing: 0,
          loop: true,
          usePreloader : true,
          transitionType : 'move',
          navigateByClick:true,
          sliderDrag:false,
          keyboardNavEnabled:true,
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
              vimeoCode: '<iframe src="https://player.vimeo.com/video/%id%?byline=0&amp;portrait=0&amp;autoplay=1" frameborder="no" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe>'
            }
         }
  },

  breakPoints : {
      'Site--mobile':745,
      'Site--tablet':1024,
      'Site--desktop':1400
  }
}

/* GitHub Pages：强制 hash 模式 */
site.ajax.forcehash = 1;

/* ============================================================
   Ajax Rules
   ============================================================ */

site.ajax.exclude = ['#home a','#logo a','.Navigation-item--search a','.Navigation-item--more a, .Navigation-item--login a'];

site.ajax.addRule({
    selectors : '#memberProjectsGrid a, #allProjects,#infoProjects',
    exclude : '.Info a',
    find: '#project',
    load:'#project',
    transition: {in:1300,out:250},
    before: function() {
      site.scrollTo($('#project').offset().top );
    },
    after: function() {}
});

site.ajax.addRule({
    selectors : '#work_suggestions a',
    find: '.Template-body',
    load:'.Template-body',
    transition: {in:1300,out:250},
    before: function() {},
    after: function() {}
});

site.ajax.addRule({
    selectors:'.Site a',
    load:'.Site-body',
    exclude: '#loadMore',
    transition:{in:1300,out:250},
    before : function() {
      if(site.$html.hasClass('Site--wallActive')){
        site.ui.wall.close();
      }

      if(site.is('mobile')){
          $('html').removeClass('when-Icon-is-active');
          $('#menuToggle').removeClass('is-active');
      }
      showLoader();
      site.scrollToTop();
    },
    after: function(){
      hideLoader();
    }
});


/* ============================================================
   Away we go!
   ============================================================ */

site.init();


/* ============================================================
   核心组件（本地 UI 组件，非第三方）
   ============================================================ */

/* ui-showOnLoad */
site.addUI('showOnLoad',{
    init:function(){
        site.on('load',function(){
            site.ui.showOnLoad.run();
        });
    },
    run : function(){
        if(Modernizr.csstransitions){
            setTimeout(function(){$('.ui-showOnLoad').addClass('show');},200);
            setTimeout(function(){site.trigger('show')},500);
        }else{
            $('.ui-showOnLoad').delay(200).animate({opacity:1},1200,function(){
                site.trigger('show');
            });
        }
    }
});


/* ui-toggleState */
site.registerComponent('toggleState',{
  init : function(){},
  toggleOn : function (selector){
    $el = $(selector);
    site.ui.toggleState.activate($el);
  },
  toggleOff : function (selector){
    $el = $(selector);
    site.ui.toggleState.deactivate($el);
  },
  activate : function($el){
    var state = $el.data('state');
    if(!site.defined(state)) state = 'is-active';
    if(!$el.hasClass(state)) $el.trigger('click');
  },
  deactivate : function ($el){
    var state = $el.data('state');
    if(!site.defined(state)) state = 'is-active';
    if($el.hasClass(state)) $el.trigger('click');
  },
  onFind : function($el){
      var specificOffSelector =  $el.data('toggle-off-selector');
      var $specificOffSelector = [];

      if(!!site.defined(specificOffSelector)){
        $specificOffSelector = $el.find(specificOffSelector);
      }

      if($specificOffSelector.length){
        site.click($specificOffSelector,function(ev){
          var $parent = $specificOffSelector.closest('.ui-toggleState');
          $parent.data('toggle-locked',0);
          ev.stopPropagation();
          ev.preventDefault();
          $parent.trigger('click');
        })
      }

      site.click($el,function(){
        site.ui.toggleState.toggle($el);
      });

      if($el.hasClass('is-active') && $el.is(":visible")){
        $el.removeClass('is-active')
        site.ui.toggleState.toggle($el);
      }
  },
  toggle : function($el){
    var toggleFor = $el.data('toggle-for');
        var $check = $el;
        if(!!site.defined(toggleFor)){
          var $toggleFor = $(toggleFor);
          if($toggleFor.length) $check = $toggleFor;
        }

        var specificOffSelector =  $check.data('toggle-off-selector');

        var locked = $check.data('toggle-locked');
        if(!site.defined(locked)) locked = 0;

        var state = $check.data('state');
        if(!site.defined(state)) state = 'is-active';

        var offState = $check.data('off-state');
        if(!site.defined(offState)) offState = 'is-inactive';

        var informComponents = $check.data('toggle-inform-components');
        if(!site.defined(informComponents)){
          informComponents = '.'+site.siteClass;
          var $informComponents = site.$html;
        }else{
          var $informComponents = $(informComponents);
        }

        var $alsoToggle = [];
        var alsoToggle = $check.data('toggle-also');
        if(!site.defined(alsoToggle)){
          alsoToggle = $el.data('toggle-also');
        }
        if(!!site.defined(alsoToggle)){
          $alsoToggle = $(alsoToggle);
        }

        var componentName = $check.data('toggle-inform-components');
        if(!site.defined(componentName)) componentName = site.componentName($check);

        var informAs = $check.data('toggle-inform-as');
        if(!site.defined(informAs)){
          informAs = $el.data('toggle-inform-as');
        }

        if(!!site.defined(informAs)) informState = 'when-'+informAs+'-is-active'
        else var informState = $check.data('toggle-inform-state');

        if(!site.defined(informState)) informState = 'when-'+componentName+'-is-active';

        var deactivateOthers = $check.data('toggle-deactivate-others');

        if(!locked){
          if($check.hasClass(state)){
            $check.removeClass(state);
            $check.addClass(offState);
            if(!!site.defined(specificOffSelector)) $check.data('toggle-locked',0);
            site.trigger('toggleOff',{$el:$check});
            site.trigger('toggle',{$el:$check});

             if($informComponents.length) $informComponents.removeClass(informState);
             if($alsoToggle.length){
              $alsoToggle.removeClass(state);
              $alsoToggle.addClass(offState);
              site.trigger('toggleOff',{$el:$alsoToggle});
              site.trigger('toggle',{$el:$alsoToggle});
            }
          }else{
            if(!!site.defined(deactivateOthers)){
              $('.'+componentName+' > .'+state+',.'+componentName+'.'+state).each(function(){
                var $this = $(this);
                var deactivateAs = $this.data('toggle-inform-as');
                var deactivateComponentName = site.componentName($this);

                if(!!site.defined(deactivateAs)) deactivateState = 'when-'+deactivateAs+'-is-active'
                else var deactivateState = $this.data('toggle-inform-state');

                if(!site.defined(deactivateState)) deactivateState = 'when-'+deactivateComponentName+'-is-active';

                site.$html.removeClass(deactivateState);
                site.trigger('toggleOff',{$el:$this});
                site.trigger('toggle',{$el:$this});
                $this.removeClass(state).data('toggle-locked',0);
              });

              $check.siblings('.'+state).removeClass(state);
            }
            $check.addClass(state);
            $check.removeClass(offState);
            if($informComponents.length) $informComponents.addClass(informState);

            if(!!site.defined(specificOffSelector)) $el.data('toggle-locked',1);
            site.trigger('toggleOn',{$el:$check});
            site.trigger('toggle',{$el:$check});

            if($alsoToggle.length){
              $alsoToggle.addClass(state);
              $alsoToggle.removeClass(offState);
              site.trigger('toggleOn',{$el:$alsoToggle});
              site.trigger('toggle',{$el:$alsoToggle});
            }
          }
        }
  }
});


/* ui-hoverable */
site.addUI('hoverable',function($el){
  if(!Modernizr.touch){
      $el.hover(function(){
          $('.is-hover').removeClass('is-hover');
          $el.addClass('is-hover');
          $parent = $el.closest('.ui-hoverable-parent');
          if($parent.length) $parent.addClass('is-hover');
      },function(){
          $el.removeClass('is-hover');
          $parent = $el.closest('.ui-hoverable-parent');
          if($parent.length) $parent.removeClass('is-hover');
      });
  }else{
      var twoTap = $el.data('hoverable-two-tap');
      twoTap = (!!site.defined(twoTap)) ? twoTap : false;

      $el.click(function(ev){
          if(twoTap){
          if($el.hasClass('is-hover')){
              $el.removeClass('is-hover');
            $parent = $el.closest('.ui-hoverable-parent');
            if($parent.length) $parent.removeClass('is-hover');
          }else{
              ev.preventDefault();
              ev.stopPropagation();
              $('.is-hover').removeClass('is-hover');
            $el.addClass('is-hover');
            $parent = $el.closest('.ui-hoverable-parent');
            if($parent.length) $parent.addClass('is-hover');
          }
          }else{
              $el.addClass('is-hover');
          }
      });
  }
});


/* ui-siteClass */
site.registerComponent('siteClass',{
  classes : {'site' : []},
  informed : [],
  init : function(){
    site.on('domChanged',function(){
      var com = site.data('siteClass');
      if(!$('.ui-siteClass').length  && !$('.ui-siteClass-inherit').length) com.clearSiteClasses();
    });
  },
  applySiteClass : function(siteClass,group){
    if(!site.defined(group)) group = 'site';
    var com = site.data('siteClass');
    if(!com.classes.hasOwnProperty(group)) com.classes[group] = [];
    com.clearSiteClasses(group);
    com.addSiteClass(siteClass,group);
  },
  clearSiteClasses : function(group){
    if(!site.defined(group)) group = 'site';
    var com = site.data('siteClass');
    if(com.classes.hasOwnProperty(group)){
    if(!com.classes[group].length) return;
    var classList = com.classes[group].join(' ');
    site.$html.removeClass(classList);
    if(com.informed.length){
      for(i in com.informed){
        var $el = $(com.informed[i]);
        if($el.length) $el.removeClass(classList);
      }
    }
    }
  },
  addSiteClass : function(siteClass,group){
    if(!site.defined(group)) group = 'site';
    var siteClasses = siteClass.split(',');
    var com = site.data('siteClass');

    for(var i = 0;i < siteClasses.length;i++){
      var siteClass = siteClasses[i];
      siteClass = 'Site--'+siteClass;
      com.classes[group].push(siteClass);
      site.trigger('siteClass',{className:siteClass,group:group});
      site.$html.addClass(siteClass);
    }
  },
  addElementClass : function(selector,className){
    var com = site.data('siteClass');
    com.classes.push(className);
    com.informed.push(selector);
    var $el = $(selector);
    if($el.length) $el.addClass(className);
  },
  onUnhandled : function($el){
    var group = $el.attr('data-site-class-group');
    if(!site.defined(group)) group = 'site';
    var com = site.data('siteClass');
    if(!com.classes.hasOwnProperty(group)) com.classes[group] = [];
    com.clearSiteClasses(group);

    var siteClass = $el.attr('data-site-class');
    var inform = $el.attr('data-site-class-inform');

    if(site.defined(inform)){
        com.addElementClass(inform,siteClass);
    }else{
      if(site.defined(siteClass)) com.addSiteClass(siteClass,group);
     }
  }
});

site.addUI('siteClass-clickable',function($el){
  $el.click(function(){
    var group = $el.attr('data-site-class-group');
    if(!site.defined(group)) group = 'site';
    var com = site.data('siteClass');
    if(!com.classes.hasOwnProperty(group)) com.classes[group] = [];
    com.clearSiteClasses(group);

    var siteClass = $el.attr('data-site-class');
    var inform = $el.attr('data-site-class-inform');

    if(site.defined(inform)){
        com.addElementClass(inform,siteClass);
    }else{
      if(site.defined(siteClass)) com.addSiteClass(siteClass,group);
     }
  });
});


/* ui-clickable */
site.addUI('clickable',{
  init : function(){},
  clickify : function($el){
    var $link = $el.find('.ui-clickable-link:first');
    if(!$link.length) $link = $el.find('a:first');

    $link.click(function(ev){
        ev.stopPropagation();
    });

    $el.click(function(){
      if ($link.hasClass('Site-link--external')) {
        window.open($link.attr('href'));
      }
      else {
      if(Modernizr.touch){
        if($el.hasClass('hover')){
          $link.trigger('click');
        }else{
          $('.ui-clickable.hover').removeClass('hover');
          $el.addClass('hover');
        }
      }else{
        $link.trigger('click');
      }
    }
    });
  },
  onFind :function($el){
    site.ui.clickable.clickify($el);
  }
});


/* ui-lazyImage */
site.registerComponent('lazyImage',{
  _img: [],
  init : function(){
    site.on('scroll',function(){
      if(!site.windowLoaded){
            site.when(function(){
              return site.windowLoaded;
            },function(){site.ui.lazyImage.check()},0);
            return;
        }else{
            site.ui.lazyImage.check();
        }
    });

    site.on('domChanged',function(){
      site.ui.lazyImage.check();
    });
  },
  check : function(){
    var className = 'ui-lazyImage';
    var $items = $('.'+className);

    if($items.length){
      var vis = 0;
      $items.not('.'+className+'--seen').each(function(ix){
        var loading = $(site.loadingSelector).length;

        if(loading <= 15){
          if(!$(this).find('img').length){
            var force = $(this).data('force');
            force = (!!site.defined(force));

            if(force || site.isVisible($(this))){
              $(this).removeClass('not-visible').addClass('is-visible');
              vis++;
              var $img = $(this);
              $img.addClass(className+'--seen');
              setTimeout(function(){
                site.loadImage($img);
                site.ui.lazyImage.setImages($img);
                site.trigger('loadImage');
              },vis*200);
            }else{
              $(this).addClass('not-visible');
            }
          }
          else{
            console.log('nothing to load')
          }
        }
      });
    }
  },
  getImages: function (){
    return site.ui.lazyImage._img;
  },
  setImages: function (img){
    site.ui.lazyImage._img.push(img);
  }
});


/* ui-royalSlider */
site.registerComponent('royalSlider',{
$slider : [],
slider : {},
opts : {
    imageScaleMode: 'fill',
    imageAlignCenter: true,
    controlNavigation: 'none',
    arrowsNav: false,
    arrowsNavAutoHide: false,
    autoHeight:false,
    slidesSpacing: 0,
    loop: true,
    usePreloader : true,
    transitionType : 'move',
    autoPlay: {
      enabled: true,
      pauseOnHover: true
    }
  },
init: function(){
  site.on('startResize',function(){
    if(site.ui.royalSlider.exists()){
      site.ui.royalSlider.$elements.each(function(ix){
        var slider = $(this).data('royalSlider');
        slider.updateSliderSize(true);
      });
    }
  });
  site.on('stopResize',function(){
    if(site.ui.royalSlider.exists()){
      site.ui.royalSlider.$elements.each(function(ix){
        var slider = $(this).data('royalSlider');
        slider.updateSliderSize(true);
      });
    }
  });
},
onUnhandled : function($el){
  var opts = (site.opts.hasOwnProperty('royalSlider')) ? site.opts.royalSlider : site.ui.royalSlider.opts;

  $el.royalSlider(opts);

  var wrapperSelector = $el.data('royalslider-wrapper');

  if ( typeof wrapperSelector != "undefined" ) {
    var $wrapper = $el.closest(wrapperSelector);
  } else {
    var $wrapper = $el.parent();
  }

  site.ui.royalSlider.$slider = $el;
  var slider = $el.data('royalSlider');
  site.ui.royalSlider.slider = slider;

  var $slide = $(slider.currSlide.content);
    $wrapper.find('.ui-royalSlider-currentSlide').html(slider.currSlideId + 1);
    $wrapper.find('.ui-royalSlider-page').removeClass('is-active');
    $wrapper.find('.ui-royalSlider-page:eq('+ (slider.currSlideId)+')').addClass('is-active');

    var $caption = $slide.find('.ui-royalSlider-slideCaption');
    if( $caption.length ) {
      var $globalCaption = $('.ui-royalSlider-caption');
      if ( $globalCaption.length) {
        $globalCaption.html($caption.text());
      }
    }

  slider.ev.on('rsAfterContentSet', function(e, slideObject) {
    slider.updateSliderSize(true);
  });

  slider.ev.on('rsAfterSlideChange', function(event) {
    var $slide = $(slider.currSlide.content);
    $wrapper.find('.ui-royalSlider-currentSlide').html(slider.currSlideId + 1);
    $wrapper.find('.ui-royalSlider-page').removeClass('is-active');
    $wrapper.find('.ui-royalSlider-page:eq('+ (slider.currSlideId)+')').addClass('is-active');

    var $caption = $slide.find('.ui-royalSlider-slideCaption');
    if( $caption.length ) {
      var $globalCaption = $('.ui-royalSlider-caption');
      if ( $globalCaption.length) {
        $globalCaption.html($caption.text());
      }
    }

    site.trigger('domChanged');
    site.ajax.getNewLinks();
  });

  $wrapper.find('.ui-royalSlider-page:eq(0)').addClass('is-active');

  $wrapper.find('.ui-royalSlider-page').click(function(){
    var slider = $el.data('royalSlider');
    var ix = $(this).index();
    slider.goTo(ix);
    $wrapper.find('.ui-royalSlider-page').removeClass('is-active');
    $wrapper.find('.ui-royalSlider-page:eq('+ ix +')').addClass('is-active');
  });

  $wrapper.find('.ui-royalSlider-next').click(function(){
    var slider = $el.data('royalSlider');
    slider.next();
  });

  $wrapper.find('.ui-royalSlider-prev').click(function(){
    var slider = $el.data('royalSlider');
    slider.prev();
  });

  slider.updateSliderSize(true);
}
});


/* ui-slideDown */
site.addUI('slideDown', {
  elementHeight : {},
  $parent : {},

  init : function($el) {
    site.on('load', function() {
      var $items = $('.ui-slideDown');
      if($items.length){
        $items.each(function(){
          var $el = $(this);
          if($el.hasClass('is-expanded')) {
            $el.css('height', 'auto');
          }
        });
      }
    });

    site.on('startResize', function() {
      var $items = $('.ui-slideDown');
      if($items.length){
        $items.each(function(){
          var $el = $(this);
          if(!site.is('mobile')) {
            if($el.hasClass('is-expanded')) {
              $el.css('height', 'auto');
            }
          }
        });
      }
    });

    site.on('stopResize', function() {
        var $items = $('.ui-slideDown');
        if($items.length){
        $items.each(function(){
          var $el = $(this);
          if(!site.is('mobile')) {
            if($el.hasClass('is-expanded')) {
              $el.css('height', $el.outerHeight(true) );
            }
          }
        });
        }
    });
  },

  onFind : function($el) {
    if(site.ui.slideDown.exists()) {
      site.ui.slideDown.setHeight($el);
      site.ui.slideDown.classController($el);
    }
  },

  setHeight : function($el) {
    $el.css('height', '0');
  },

  classController : function($el) {
    var triggerSelector = $el.data('slidedown-trigger');
    $parent = $el.parent();
    var $trigger = $parent.find(triggerSelector);

      if(!$trigger.length) {
        $trigger = $(triggerSelector);
      }

      $trigger.click(function() {
          site.ui.slideDown.open($el);
      });
  },

  close: function($el) {
    var $toggle = [];
    var toggleSelector = $el.data('slidedown-toggle');

    if( typeof toggleSelector != 'undefined') {
      $toggle = $el.closest(toggleSelector);
      if(!$toggle.length ) {
        $toggle = $(toggleSelector);
      }
    }

    $el.css('height', '0');
    $el.removeClass('is-expanded');
    $el.addClass('is-not-expanded');
  },

  open : function($el) {
    var $toggle = [];
    var toggleSelector = $el.data('slidedown-toggle');

      if( typeof toggleSelector != 'undefined') {
        $toggle = $el.closest(toggleSelector);
        if(!$toggle.length ) {
          $toggle = $(toggleSelector);
        }
      }

      $el.addClass('no-transition');
      $el.css('height', 'auto');
      elementHeight = $el.outerHeight(true);

      if($('.Item-body').hasClass('is-expanded')) {
        site.ui.slideDown.closeOthers();
      }

      if(!$el.hasClass('is-expanded')) {
        $el.removeClass('no-transition');
        $el.height(elementHeight);
      } else {
        $el.height(elementHeight);
      }

      $el.addClass('is-expanded');
      $el.removeClass('is-not-expanded');

      if($toggle.length) $toggle.addClass('is-active').removeClass('is-inactive');
  },

  closeOthers : function() {
    $('.is-expanded').each(function() {
      var $parent = $(this).parent();
      var $toggle = $parent.closest($(this).data('slidedown-toggle'));
      $(this).css('height', '0');
      $(this).removeClass('is-expanded').addClass('is-not-expanded');
      $toggle.removeClass('is-active').addClass('is-inactive');
    });
  }
});


/* ui-isVisible */
site.registerComponent('isVisible',{
  init : function(){
    site.on('scroll',function(){
      if(!site.windowLoaded){
            site.when(function(){
              return site.windowLoaded;
            },function(){site.ui.isVisible.check()},0);
            return;
        }else{
            site.ui.isVisible.check();
        }
    });

    site.on('domChanged',function(){
      site.ui.isVisible.check();
    });
  },
  onFind : function($el) {
    $el.addClass('ui-isVisible--invisible');
  },
  check : function(){
    var className = 'ui-isVisible';
    var $items = $('.'+className);

    if($items.length){
        $items.not('.'+className+'--visible').each(function(ix){
        var $item = $(this);
        var itemLeft = $item.offset().left;
        var itemWidth = $item.outerWidth();
        var itemRight = itemLeft + itemWidth;

        if(itemLeft < site.windowWidth / 2 ) $item.addClass(className+'--left');
        if((itemRight - itemWidth / 2) > site.windowWidth / 2 ) $item.addClass(className+'--right');

        setTimeout(function(){
          if(Modernizr.touch || site.isVisible($item)){
           setTimeout(function(){$item.removeClass(className+'--invisible').addClass(className+'--visible');},10);
          }else{
            $item.addClass(className+'--invisible');
          }
        }, 10);
      });
    }
  },
  reset : function(){
    var className = 'ui-isVisible';
    var $items = $('.'+className);
    $items.removeClass(className+'--visible').addClass(className+'--invisible');
  }
});


/* ui-keepRatio */
site.registerComponent('keepRatio',{
  init : function(){
    site.on('resize',function(){
      var $items = $('.ui-keepRatio');
      if($items.length){
        $items.each(function(){
          var $el = $(this);
          site.ui.keepRatio.resize($el);
        });
      }
    });
  },
  onUnhandled : function($el){
    site.ui.keepRatio.resize($el);
  },
  resize : function($el){
    var ratio = $el.data('ratio');
    ratio = ratio.replace('x',':');
    var ratioArray = ratio.split(':');
    var w = ratioArray[0];
    var h = ratioArray[1];

    var factor = (h < w) ? h/w : w/h;
    factor = h/w;

    $el.data('factor',factor);

    var curW = $el.outerWidth();
    var dataW = $el.data('width');
    if(site.defined(dataW)) curW = dataW;

    if(curW){
      var newH = Math.round(curW * factor);
      $el.height(newH);
    }else{
      $el.height(0);
    }
  }
});


/* ui-ajax */
site.addUI('ajax',function($el){
    var $load = $el;
    var find = $el.data('ajax-find');
    var href = $el.data('ajax-href');

    $el.prepend('<div class="Loader  Loader--ajax"><div class="Loader-body">Loading...</div></div>');

    var transitionOut = $el.data('ajax-transition-out');
    var transitionIn = $el.data('ajax-transition-in');
    var transition = false;
    if(site.defined(transitionIn) || site.defined(transitionOut)){
      transition = {in:300,out:300};
    }

    if(site.defined(transitionOut)) transition.out = parseInt(transitionOut);
    if(site.defined(transitionIn)) transition.in = parseInt(transitionIn);

    if(site.windowLoaded){
      setTimeout(function(){site.ajax.load(href,$load,{transition:transition,$load:$el,find:find,async:true});},1000);
    }else{
      site.on('load',function(){
        setTimeout(function(){site.ajax.load(href,$load,{transition:transition,$load:$el,find:find,async:true});},2000);
      });
    }
});


/* ui-ajaxBack */
site.addUI('ajaxBack',function($el){
  site.click($el,function(ev){
        var loadSelector = $(this).data('ajax-load');
        if(!!site.defined(loadSelector)){
          var $load = $(loadSelector);
          if($load.length){
            var opts = {};
            opts.transition = site.ajax.defaults.transition;

            var transitionOut = $(this).data('ajax-transition-out');
            var transitionIn = $(this).data('ajax-transition-in');

            var find = $(this).data('ajax-find');
            var href = site.ajax.lastUrl;

            opts.find = find;
            if(site.defined(transitionOut)) opts.transition.out = transitionOut;
            if(site.defined(transitionIn)) opts.transition.in = transitionIn;

            site.ajax.load(href,$load,opts);
          }
        }
    });
});


/* ui-ajaxTeaser */
site.addUI('ajaxTeaser',function($el){
  site.click($el,function(ev){
        var loadSelector = $(this).data('ajax-load');
        if(!!site.defined(loadSelector)){
          var $load = $(loadSelector);
          if($load.length){
            var opts = {};
            opts.transition = site.ajax.defaults.transition;

            var transitionOut = $(this).data('ajax-transition-out');
            var transitionIn = $(this).data('ajax-transition-in');

            var find = $(this).data('ajax-find');
            var href = $(this).data('ajax-href');

            opts.find = find;
            opts.updateGlobalUrl = 1;
            if(site.defined(transitionOut)) opts.transition.out = transitionOut;
            if(site.defined(transitionIn)) opts.transition.in = transitionIn;

            site.ajax.load(href,$load,opts);
          }
        }
    });
});


/* ui-ajax-preload */
site.addUI('ajaxPreload',{
  init : function(){},
  preload : function($el){
      var href = $el.data('ajax-href');
      if(!site.defined(href)) href = $el.attr('href');
      site.ajax.queuePreload(href);
  },
  onFind : function($el){
    site.ui.ajaxPreload.preload($el)
  }
});


/* ui-autoFocus（checkField 和 ajaxForm 已删除） */
site.addUI('autoFocus',function($el){
  setTimeout(function() { $el.focus() }, 500);
});


/* ui-masonry */
site.addUI('masonry',{
ready:0,
resizing:0,
$grid : [],
isotope : {},
init: function(){
  site.on('resize',function(){
    site.trigger('masonryResize');
  });

  site.on('masonryResize',function(){
    if(site.ui.masonry.exists() && site.ui.masonry.ready){
        site.ui.masonry.resizing = 1;
          site.ui.masonry.$grid.isotope('layout');
      setTimeout(function(){
        site.ui.masonry.resizing = 0;
        site.trigger('scroll');
      },1000);
    }else{
      site.on('masonryReady',function(){
         site.ui.masonry.$grid.isotope('layout');
          site.trigger('scroll');
      });
    }
  });

  site.on('domChanged',function(){
    if(site.ui.masonry.exists() && site.ui.masonry.ready){
      site.ui.masonry.$elements.each(function(){
          var $el = $(this);
          var childCount = $el.data('childCount');
          var $added = $el.find('.ui-masonry-item').not('.ui-masonry-item--seen');
          if($added.length && $el.data('isotope')){
            $el.isotope('appended',$added);
            $el.isotope('layout');
            setTimeout(function(){
              $added.addClass('ui-masonry-item--seen');
              site.trigger('scroll');
            },50);
          }
      });
    }
  });
},
onFind : function($el){
  $el.css({opacity:0});
  site.ui.masonry.ready = 0;

  setTimeout(function(){
    var $children = $el.find('.ui-masonry-item');
    $children.addClass('ui-masonry-item--seen');
    $el.data('childCount',$children.length);

    $el.isotope({
      isResizable: false,
      isResizeBound:false,
      layoutMode: 'packery',
      itemSelector: '.ui-masonry-item'
    });

    site.ui.masonry.$grid = $el;
    site.ui.masonry.ready = 1;

    site.trigger('onMasonryReady');
    $el.animate({opacity:1});
  },300);
}
});


/* ui-scrollPager */
site.addUI('scrollPager',{
  loader:'<span class="Loader Loader--inline"><span class="Loader-body">Loading...</span><span class="Loader-spinner"></span></span>',
  init : function(){
    site.on('scroll',function(){
      site.ui.scrollPager.check();
    });
  },
  onFind : function($el){
    var offset = $el.offset().top;
    $el.data('offset',offset);

    var $loader = $(site.ui.scrollPager.loader);
    $loader.appendTo($el);
    $loader.css({opacity:0});

    var pagesId = $el.data('scrollpager-pages');
    $(pagesId).hide();
  },
  check : function(){
    $('.ui-scrollPager').each(function(){
      if(!$(this).hasClass('ui-scrollPager--loading')){
        var offset = $(this).data('offset');
        var h = $(this).outerHeight();
        if(h){
          var threshold = $(this).data('scrollpager-threshold');
          threshold = (typeof threshold != 'undefined') ? parseInt(threshold) : 0;

          var occupiedHeight = offset + h;
          var loadAt = occupiedHeight - site.windowHeight - threshold;
          var scrolled = site.getScrollTop();

          if (scrolled >= loadAt){
            site.ui.scrollPager.load($(this));
          }
        }
     }
    });
  },
  reset : function($scrollPager){
    $scrollPager.removeClass('ui-scrollPager--loading');
    $scrollPager.find('.Loader').stop().show().css({opacity:0});
  },
  finish : function($scrollPager){
    $scrollPager.find('.Loader').hide();
  },
  load : function($scrollPager){
     $scrollPager.addClass('ui-scrollPager--loading');
     $scrollPager.find('.Loader').animate({opacity:1});

     var call = $scrollPager.data('scrollpager-call');

     if(typeof call != 'undefined'){
       function executeFunctionByName(functionName, context /*, args */) {
            var args = Array.prototype.slice.call(arguments, 2);
            var namespaces = functionName.split(".");
            var func = namespaces.pop();
            for (var i = 0; i < namespaces.length; i++) {
                context = context[namespaces[i]];
            }
            return context[func].apply(context, args);
        }

        executeFunctionByName(call,window,function(lastPage){
            if(!lastPage){
                $scrollPager.removeClass('ui-scrollPager--loading');
                $scrollPager.find('.Loader').stop().animate({opacity:0});
            }else{
                $scrollPager.find('.Loader').hide();
            }
        });

       return;
     }

     var $next = $scrollPager.find('.ui-scrollPager-next');
     if(!$next.length) $scrollPager.find('.Loader').hide();
    setTimeout(function(){
      var $next = $scrollPager.find('.ui-scrollPager-next');

      if($next.length){
       var url = $next.attr('href');

       $.get(url,function(response){
         response = response.replace(/<script\b[^<]*(?:(?!type="text\/javascript")) (?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

        var $tmp = $("<div>").append(response);

        var listId = $scrollPager.data('scrollpager-append');
        var pagesId = $scrollPager.data('scrollpager-pages');

        var appendHTML = $tmp.find(listId).html();
        var pagesHTML = $tmp.find(pagesId).html();

        var $list = $(listId);

        $list.append(appendHTML);
        $(pagesId).html(pagesHTML);

        site.trigger('domChanged');
        site.trigger('resize');
        site.ajax.getNewLinks();
        $scrollPager.find('.Loader').stop().animate({opacity:0}, function(){
          var $next = $scrollPager.find('.ui-scrollPager-next');
        if($next.length){
          $scrollPager.removeClass('ui-scrollPager--loading');
        }
        });
       });
      }
    },500);
  }
});


/* ui-jumpLink */
site.addUI('jumpLink', {
    init: function() {
        site.vars.jumping = 0;
    },
    onFind: function($el) {
        $el.click( function() {
            var href = $(this).attr('href');
            var valid = !!href.match(/^[a-zA-Z0-9_#.\-]+$/);

            if (valid) {
                var $target = $($(this).attr('href'));
                var $scroller = $(this).data('jump-scroller');

                if(typeof $scroller != 'undefined') $scroller = $($scroller);

                var destination = $target.offset().top;

                site.vars.jumping = 1;
                site.trigger('jump', {
                    $el: $target
                });

                $('html,body').animate({scrollTop: destination},700,function()
                {
                    site.vars.jumping = 0;
                })
            }
        })
    }
});


/* ui-window */
site.addUI('window',{
  init:function(){
    site.on('resize',function(){
      site.ui.window.resize();
    });
  },
  onFind : function(){
      site.ui.window.resize();
  },
  resize : function(){
    if(site.ui.window.exists()){
        site.ui.window.$elements.each(function(){
          var excludeH = 0;

          $(this).css({
                      'height': 'auto',
                      'width':'',
                  });

          var exclude = $(this).data('window-exclude');
          if(!!site.defined(exclude)){
            var $exclude = $(exclude);
            if($exclude.length){
              $exclude.each(function(){
                var oh = $(this).outerHeight(true);
                excludeH += oh;
              });
            }
          }

          var h = site.windowHeight - excludeH;
          var w = site.windowWidth;

          var $exclude = $(this).find('.ui-window-exclude');
          if($exclude.length){
            h -= $exclude.outerHeight();
            w -= $exclude.outerWidth();
          }

          var autoWidth = $(this).data('window-autowidth');
          if(!!site.defined(autoWidth)){
            w = $(this).outerWidth();
          }

          var widthFrom = $(this).data('window-widthfrom');
          if(!!site.defined(widthFrom)){
            var $from = $(widthFrom);
            w = $from.outerWidth();
          }

          var oh = $(this).outerHeight();
          var winH = h;
          h = (oh > h) ? oh : h;

          var fixedHeight = $(this).data('window-fixedheight');
          h = (typeof fixedHeight == 'undefined') ? h : winH;

          var prop = (typeof fixedHeight == 'undefined') ? 'min-height' : 'height';

          var cssopts = {};
          cssopts[prop] = h;

          var heightOnly = $(this).data('window-heightonly');
          if(!site.defined(heightOnly)){
            cssopts['width'] = w;
          }

          $(this).css(cssopts);
        });
    }
  }
});


/* ui-shareable */
site.addUI('shareable',{
  shareUrls: {
        'facebook': 'http://www.facebook.com/sharer/sharer.php?s=100&p[title]={title}&p[summary]={desc}&p[url]={url}&p[images][0]={img}&',
        'facebook-app': 'https://www.facebook.com/dialog/share?app_id={app_id}&display=page&href={url}&redirect_uri={redirect_url}',
        'twitter': 'https://twitter.com/share?url={url}&text={title}&via={via}&hashtags={hashtags}',
        'google': 'https://plus.google.com/share?url={url}',
        'pinterest': 'https://pinterest.com/pin/create/bookmarklet/?media={img}&url={url}&is_video={is_video}&description={title}',
        'linkedin': 'http://www.linkedin.com/shareArticle?url={url}&title={title}',
        'buffer': 'http://bufferapp.com/add?text={title}&url={url}',
        'digg': 'http://digg.com/submit?url={url}&title={title}',
        'tumblr': 'http://www.tumblr.com/share/link?url={url}&name={title}&description={desc}',
        'reddit': 'http://reddit.com/submit?url={url}&title={title}',
        'stumbleupon': 'http://www.stumbleupon.com/submit?url={url}&title={title}',
        'delicious': 'https://delicious.com/save?v=5&provider={provider}&noui&jump=close&url={url}&title={title}',
        'email': 'mailto:?subject={title}&body={url}',
        'renren' : 'http://share.renren.com/share/buttonshare.do?link={url}&title={title}',
        'weibo' : 'http://service.weibo.com/share/share.php?url={url}&appkey={app_id}&title={title}&pic={img}&ralateUid=&language=zh_cn',
        'baidu' : 'http://like.baidu.com/set?buttontype=small&cb=bdShare.ajax._callbacks.bd4bb141b&index=0&url={url}'
    },
  init:function(){},
  onFind:function($el){
    var shareData = site.ui.shareable.shareData($el);
    $el.unbind('click');
    $el.attr('target','_blank');
    $el.attr('href',shareData.shareUrl);
    $el.click(function(ev) {
        site.trigger('share', shareData);
    });
  },
    shareData: function($item) {
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
        if (!site.defined(desc)) desc = ($desc.length) ? $desc.attr('content') : 'Shared from ' + window.location.hostname;
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

        shareUrl = shareUrl.replace('{url}', url).replace('{img}', img).replace('{title}', title).replace('{desc}', desc).replace('{app_id}', app_id).replace('{redirect_url}', url).replace('{via}', via).replace('{hashtags}', hashtags).replace('{provider}', provider).replace('{is_video}', is_video);

        if (via == '') shareUrl = shareUrl.replace('&via=', '');
        if (hashtags == '') shareUrl = shareUrl.replace('&hashtags=', '');

        var shareData = {
            item: $item,
            shareUrl : shareUrl,
            url: url,
            title: title,
            service: service
        }

        return shareData;
    }
});


/* ui-buttonClassSwitcher */
site.addUI('buttonClassSwitcher', {
  init : function() {
    site.on('resize', function() {
        var $items = $('.ui-buttonClassSwitcher')
        if($items.length ) {
          $items.each(function() {
            var $el = $(this);
            site.ui.buttonClassSwitcher.classSwitcher($el);
          });
        }
    });
  },
  onFind : function($el) {
    site.ui.buttonClassSwitcher.classSwitcher($el);
  },
  classSwitcher : function($el) {
    if( site.windowWidth <= site.opts.breakPoints['Site--tablet'] || site.windowWidth <= site.opts.breakPoints['Site--mobile'] ) {
      $el.removeClass('Button--default').addClass('Button--alt');
    } else {
      $el.removeClass('Button--alt').addClass('Button--default');
    }
  }
});


/* ui-toggleFilter */
site.addUI('toggleFilter', {
  onFind : function($el) {
    var $filterButtons = $('.ui-filterButton');
    var $filterBody = $('#filterBody');
    var $filterRegions =  $('.ui-filterButton-region');
    var filterSelector = $el.data('filter-selector');
    var $trigger = $(filterSelector);

    if(Modernizr.touch) {
      $el.on('click touchstart', function() {
        if($(this).hasClass('is-active')) {
          $filterButtons.removeClass('is-active').addClass('is-inactive')
          $filterRegions.removeClass('is-active').addClass('is-inactive');
          $trigger.addClass('is-inactive').removeClass('is-active');
          site.ui.selectors.go();
        }
    });
    } else {
      $el.click(function() {
        var $this = $(this);
        setTimeout(function(){
        if($this.hasClass('is-active')) {
          var $yearFilter = $('#yearFilter');
          var $yearButton = $('#year');
          $yearButton.addClass('is-active').removeClass('is-inactive');
          $yearFilter.addClass('is-active').removeClass('is-inactive');
          $filterRegions.addClass('is-inactive');
        } else {
          $filterButtons.removeClass('is-active').addClass('is-inactive')
          $filterRegions.removeClass('is-active').addClass('is-inactive');
          $trigger.addClass('is-inactive').removeClass('is-active');
          site.ui.selectors.go();
        }
        },20);
      });
    }
  }
});


/* ui-filterButton */
site.addUI('filterButton', {
  onFind : function($el) {
    var $filterButtons = $('.ui-filterButton');
    var $filterBody = $('#filterBody');
    var $filterWork = $('#filterWork');
    var $filterRegions =  $('.ui-filterButton-region');
    var filterSelector = $el.data('filter-selector');
    var $trigger = $(filterSelector);

    $el.click(function() {
      var $this = $(this);
      if($this.hasClass('is-active')) {
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


/* ui-selectors */
site.addUI('selectors', {
    selection: {
      year:[],
      country: [],
      discipline: [],
      sector: [],
      sort: []
    },
    baseUri:'',
    lastUri:'',
    onFind : function($el) {
        var $options = $('.ui-selectors-option');
        $options.each(function()
        {
          $(this).addClass('ui-selectors-option--handled');
          site.ui.selectors.toggleClasses($(this),$el);
          site.ui.selectors.updateButton($(this),$(this).data('button'));
        });

        var selector = $el.data('go');
        $(selector).click(function(e)
        {
          e.preventDefault();
          site.ui.selectors.go();
        });

         var reset = $el.data('reset');
          $(reset).click(function(e) {
             e.preventDefault();
             site.ui.selectors.clearSelection($el);
             site.ui.selectors.go();
          });

        site.ui.selectors.baseUri = $el.data('base-uri');
        site.ui.selectors.lastUri = site.ui.selectors.baseUri;
    },
    toggleClasses : function($option,$el) {
      var $elements = $option.find('li > ul > li');
      if(!$elements.length) $elements = $option.find('.ui-selectors-item');
      $elements.each(function() {
        $(this).click(function(){
          var $a = $(this).find('a');
          var auto = $option.data('auto');

          if($option.data('type') == 'radio')
          {
            $option.find('a').addClass('is-inactive').removeClass('is-active');
          }
            if(!$a.hasClass('is-active')) {
              $a.addClass('is-active').removeClass('is-inactive');
            } else {
              $a.addClass('is-inactive').removeClass('is-active');
            }

            site.ui.selectors.buildSelection($el);
            site.ui.selectors.updateButton($option,$option.data('button'));

            if(typeof auto != 'undefined'){
              site.ui.selectors.go();
            }
        });
      });
    },
    resetClasses : function($el){
      var $options = $('.ui-selectors-option');
      $options.each(function()
        {
          site.ui.selectors.resetClass($(this),$el);
          site.ui.selectors.updateButton($(this),$(this).data('button'));
        });
    },
    resetClass : function($option) {
      var $elements = $option.find('li > ul > li');
      if(!$elements.length) $elements = $option.find('.ui-selectors-item');
      $elements.each(function() {
          var $a = $(this).find('a');
          if($option.data('type') == 'radio')
          {
            $option.find('a').removeClass('is-active').addClass('is-inactive');
          }else{
           $a.removeClass('is-active is-inactive');
          }
      });
    },
    updateButton: function($el,buttonId)
    {
      var infoText;
      var active = $el.find('a.is-active').length;
      var $button = $('#' + buttonId);
      var $buttonText = $button.find('.Button-body');

      if($el.data('type') == 'checkbox') {
        if(active == 0) infoText = $button.data('title');
        else if(active == 1) infoText = '1 ' + $button.data('single');
        else infoText = active + ' ' + $button.data('plural');
        $buttonText.text(infoText);
      } else {
        if(active == 0) $buttonText.text($button.data('title'));
        else $buttonText.text($el.find('a.is-active').text());
      }
    },
    buildSelection: function($el)
    {
      site.ui.selectors.resetSelection();
      var $options = $('.ui-selectors-option');
      $options.each(function()
      {
          $(this).find('a.is-active').each(function()
          {
            var type = $(this).data('type');
            var value = $(this).data('value');
            if(site.ui.selectors.selection.hasOwnProperty(type))
            {
              site.ui.selectors.selection[type].push(value);
            }
          })
      });
    },
    go : function(){},
    goOld: function()
    {
      var doFilter = false;
      var uri = '';
      for( var i in site.ui.selectors.selection)
      {
          if(site.ui.selectors.selection[i].length) {
            doFilter = true;
            uri += i + '/';
            var myValues = [];
            for (var t = 0; t < site.ui.selectors.selection[i].length; t ++ )
            {
              myValues.push(site.ui.selectors.selection[i][t]);
            }
            uri += myValues.join(',') + '/';
          }
      }

      if(doFilter) uri = site.ui.selectors.baseUri + '/filter/' + uri;
      else uri = site.ui.selectors.baseUri + uri;

      if(uri == site.ui.selectors.lastUri) return;

      site.ui.selectors.lastUri = uri;

      $('.List--projectGrid').css(
        {
          'opacity':0.3,
          'pointer-events' : 'none'
      });

      var $load = $('.Project-list');
      var opts = {
          transition: 0,
          setVisibleUri: 1,
          find: [{find:'#projectList',load:'#projectList'},{find:'#filterTitle',load:'#filterTitle'},{find:'#filterCount',load:'#filterCount'}],
          load:'.Project-list',
          before: function(){
            showLoader();
          },
          after: function() {
              $('.Filter-itemCount').text($('.List--projectGrid').data('count') + ' items');
              hideLoader();
          }
      };
      site.ajax.load(uri, $load, opts);
    },
    resetSelection: function()
    {
      site.ui.selectors.selection = {
        year:[],
        country: [],
        discipline: [],
        sector: [],
        sort: []
      };
    },
    clearSelection: function($el)
    {
      site.ui.selectors.resetSelection();
      site.ui.selectors.resetClasses($el);
    }
});


/* ui-showHideNav */
site.addUI('showHideNav', {
    init : function() {
      site.on('scroll', function() {
        var $items = $('.ui-showHideNav');
          if($items.length) {
            $items.each(function() {
              var $el = $(this);
              if(Modernizr.touch) {
                return false;
              } else {
                site.ui.showHideNav.addClassOnScroll($el);
              }
            });
          }
      });
    },
    onFind : function($el) {
      if(Modernizr.touch) {
        return false;
      } else {
        site.ui.showHideNav.addClassOnScroll($el);
        site.ui.showHideNav.scrollDirection($el);
      }
    },
    addClassOnScroll : function($el) {
      var scrollTop = $(window).scrollTop();
      if(scrollTop > 200) {
        site.$html.addClass('Site--scrolled');
      } else {
        if(scrollTop == 0 ) {
          site.$html.removeClass('Site--scrolled');
          $el.removeClass('is-scrollingUp is-scrollingDown');
        }
        if($el.hasClass('is-scrollingUp')) {
        } else {
          site.$html.removeClass('Site--scrolled');
        }
      }
    },
    marginController : function($el) {
      var headH = $el.height();
      if(site.$html.hasClass('Site--scrolled')) {
        if($el.hasClass('is-scrollingUp')) {
          $el.css('margin-top', 0);
        } else {
          $el.css('margin-top', -headH);
        }
      } else {
        $el.css('margin-top', 0);
      }
    },
    scrollDirection : function($el) {
      var prevScroll = 0;
      $(window).scroll(function(event) {
        var currentScroll = $(this).scrollTop();

        if(site.$html.hasClass('Site--scrolled')) {
          if(currentScroll > prevScroll) {
              $el.addClass('is-scrollingDown').removeClass('is-scrollingUp');
          } else {
            $el.addClass('is-scrollingUp').removeClass('is-scrollingDown');
          }
        }
        prevScroll = currentScroll;
      });
    }
});


/* ui-accordion */
site.addUI('accordion', function($el) {
  var active = $el.data('accordion-active');
  if(typeof active == 'undefined') active = 0;
    $el.accordion({
        header: ".ui-accordion-trigger",
        active: active,
        beforeActivate: function( event, ui ) {
          setTimeout(function(){
            site.trigger('resize');
          },100);
        },
        activate: function( event, ui ) {
          setTimeout(function(){
            site.trigger('resize');
            site.trigger('stopResize');
          },100);
        },
        animate:{
            duration: 800,
            easing: "easeOutExpo"
        },
        collapsible:true,
        heightStyle:"content"
    });
});


/* ui-sortMembers */
site.addUI('sortMembers',{
  init : function(){},
  onFind : function($el){
    $el.click(function(){
       $('.ui-sortMembers.is-active').removeClass('is-active');
       $(this).addClass('is-active');
       site.ui.members.update();
    });
  }
});


/* ui-filterMembers */
site.addUI('filterMembers',{
  init : function(){},
  onFind : function($el){
    $el.click(function(){
       $('.ui-filterMembers.is-active').removeClass('is-active');
       $(this).addClass('is-active');
       site.ui.members.update();
    });
  }
});