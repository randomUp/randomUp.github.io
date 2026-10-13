/*!
 * site-touch-plugins.js
 * ----------------------
 * 本地 touch 插件集合，依赖 jQuery。
 * 包含：
 *   1. FastButton + clickbuster
 *   2. jQuery fastClick 事件
 *   3. Touchy（触摸手势）
 *   4. DoubleTap
 *
 * 这些库在 CDNJS 上没有对应版本，因此保留在本地。
 * 必须在 jquery.min.js 之后、site-core.js 之前加载。
 */

/* ============================================================
   1. FastButton + clickbuster
   From: http://code.this.com/mobile/articles/fast_buttons.html
   Also see: http://stackoverflow.com/questions/6300136/trying-to-implement-googles-fast-button
   ============================================================ */

(function() {
  /** For IE8 and earlier compatibility: https://developer.mozilla.org/en/DOM/element.addEventListener */
  function addListener(el, type, listener, useCapture) {
    if (el.addEventListener) {
      el.addEventListener(type, listener, useCapture);
      return {
        destroy: function() { el.removeEventListener(type, listener, useCapture); }
      };
    } else {
      // see: http://stackoverflow.com/questions/5198845/javascript-this-losing-context-in-ie
      var handler = function(e) { listener.handleEvent(window.event, listener); }
      el.attachEvent('on' + type, handler);

      return {
        destroy: function() { el.detachEvent('on' + type, handler); }
      };
    }
  }

  var isTouch = "ontouchstart" in window;

  /* Construct the FastButton with a reference to the element and click handler. */
  this.FastButton = function(element, handler, useCapture) {
    // collect functions to call to cleanup events
    this.events = [];
    this.touchEvents = [];
    this.element = element;
    this.handler = handler;
    this.useCapture = useCapture;
    if (isTouch)
      this.events.push(addListener(element, 'touchstart', this, this.useCapture));
    this.events.push(addListener(element, 'click', this, this.useCapture));
  };

  /* Remove event handling when no longer needed for this button */
  this.FastButton.prototype.destroy = function() {
    for (i = this.events.length - 1; i >= 0; i -= 1)
      this.events[i].destroy();
    this.events = this.touchEvents = this.element = this.handler = this.fastButton = null;
  };

  /* acts as an event dispatcher */
  this.FastButton.prototype.handleEvent = function(event) {
    switch (event.type) {
      case 'touchstart': this.onTouchStart(event); break;
      case 'touchmove': this.onTouchMove(event); break;
      case 'touchend': this.onClick(event); break;
      case 'click': this.onClick(event); break;
    }
  };

  /* Save a reference to the touchstart coordinate and start listening to touchmove and
   touchend events. Calling stopPropagation guarantees that other behaviors don’t get a
   chance to handle the same click event. This is executed at the beginning of touch. */
  this.FastButton.prototype.onTouchStart = function(event) {
    event.stopPropagation ? event.stopPropagation() : (event.cancelBubble=true);
    this.touchEvents.push(addListener(this.element, 'touchend', this, this.useCapture));
    this.touchEvents.push(addListener(document.body, 'touchmove', this, this.useCapture));
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
  };

  /* When /if touchmove event is invoked, check if the user has dragged past the threshold of 10px. */
  this.FastButton.prototype.onTouchMove = function(event) {
    if (Math.abs(event.touches[0].clientX - this.startX) > 10 || Math.abs(event.touches[0].clientY - this.startY) > 10) {
      this.reset(); //if he did, then cancel the touch event
    }
  };

  /* Invoke the actual click handler and prevent ghost clicks if this was a touchend event. */
  this.FastButton.prototype.onClick = function(event) {
    event.stopPropagation ? event.stopPropagation() : (event.cancelBubble=true);
    this.reset();
    // Use .call to call the method so that we have the correct "this": https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/call
    var result = this.handler.call(this.element, event);
    if (event.type == 'touchend')
      clickbuster.preventGhostClick(this.startX, this.startY);
    return result;
  };

  this.FastButton.prototype.reset = function() {
    for (i = this.touchEvents.length - 1; i >= 0; i -= 1)
      this.touchEvents[i].destroy();
    this.touchEvents = [];
  };

  this.clickbuster = function() {}

  /* Call preventGhostClick to bust all click events that happen within 25px of
   the provided x, y coordinates in the next 2.5s. */
  this.clickbuster.preventGhostClick = function(x, y) {
    clickbuster.coordinates.push(x, y);
    window.setTimeout(clickbuster.pop, 2500);
  };

  this.clickbuster.pop = function() {
    clickbuster.coordinates.splice(0, 2);
  };

  /* If we catch a click event inside the given radius and time threshold then we call
   stopPropagation and preventDefault. Calling preventDefault will stop links
   from being activated. */
  this.clickbuster.onClick = function(event) {
    for (var i = 0; i < clickbuster.coordinates.length; i += 2) {
      var x = clickbuster.coordinates[i];
      var y = clickbuster.coordinates[i + 1];
      if (Math.abs(event.clientX - x) < 25 && Math.abs(event.clientY - y) < 25) {
        event.stopPropagation ? event.stopPropagation() : (event.cancelBubble=true);
        event.preventDefault ? event.preventDefault() : (event.returnValue=false);
      }
    }
  };

  if (isTouch) {
    // Don't need to use our custom addListener function since we only bust clicks on touch devices
    document.addEventListener('click', clickbuster.onClick, true);
    clickbuster.coordinates = [];
  }
})(this);


/* ============================================================
   2. jQuery fastClick 事件
   ============================================================ */

(function($) {
  $.event.special.fastClick = {
    setup: function () {
      $(this).data('fastClick', new FastButton(this, $.event.special.fastClick.handler));
    },
    teardown: function () {
      $(this).data('fastClick').destroy();
      $(this).removeData('fastClick');
    },
    handler: function (e) {
      // convert native event to jquery event
      e = $.event.fix(e);
      e.type = 'fastClick';

      /*
      event.handle is deprecated and removed as of version 1.9
      use event.dispatch instead,
      $.event.handle.apply(this, arguments);
      */
      $.event.dispatch.apply(this, arguments);
    }
  };

  $.fn.fastClick = function(fn) {
    return $(this).each(function() {
      return fn ? $(this).bind("fastClick", fn) : $(this).trigger("fastClick");
    });
  };
}(jQuery));


/* ============================================================
   3. Touchy : a jQuery plugin for managing touch events
   version: 1.1
   requires jQuery 1.4.2+
   ============================================================ */

(function($){

  // public jQuery properties
  $.touchyOptions = {
    useDelegation: false,
    longpress: { // the user touches the element and hold his or her finger on the element for a specifed amount of time.
      preventDefault: {
        start: true,
        move: true,
        end: true
      },
      requiredTouches: 1,
      msThresh: 800,
      triggerStartPhase: false,
      data: {
        startDate: null
      },
      proxyEvents: ["TouchStart", "TouchEnd"]
    },
    drag: { // the user touches the element and then moves his or her finger across the screen
      preventDefault: {
        start: true,
        move: true,
        end: true
      },
      requiredTouches: 1,
      msHoldThresh: 100,
      data: {
        startPoint: null,
        startDate: null,
        movePoint: null,
        moveDate: null,
        held: false
      },
      proxyEvents: ["TouchStart", "TouchMove", "TouchEnd"]
    },
    pinch: { // the user puts two fingers on the element and then either increases or decreases the distance between them.
      preventDefault: {
        start: true,
        move: true,
        end: true
      },
      requiredTouches: 2,
      pxThresh: 0,
      data: {
        startPoint: null,
        startDate: null,
        movePoint: null,
        moveDate: null
      },
      proxyEvents: ["TouchStart", "TouchMove", "GestureChange", "TouchEnd"]
    },
    rotate: { // the user attempts to rotate the element within the x/y plane.  may require one or two fingers.
      preventDefault: {
        start: true,
        move: true,
        end: true
      },
      requiredTouches: 1,
      data: {},
      proxyEvents: ["TouchStart", "TouchMove", "GestureChange", "TouchEnd"]
    },
    swipe: { // the user touches the screen, then rapidly drags his or her finger(s), then stops touching the screen, all in a "flicking" or "swiping" motion.  may require up to four fingers.
      preventDefault: {
        start: true,
        move: true,
        end: true
      },
      requiredTouches: 1,
      velocityThresh: 1,
      triggerOn: "touchmove",
      data: {
        startPoint: null,
        startDate: null,
        movePoint: null,
        moveDate: null
      },
      proxyEvents: ["TouchStart", "TouchMove", "TouchEnd"]
    }
  };


  // private proxy event handlers

  var proxyHandlers = {

      handleTouchStart: function (e) {

        var eventType = this.context,
          $target = getTarget(e, eventType);

        if ($target) {
          var event = e.originalEvent,
            touches = event.targetTouches,
            camelDataName = 'touchy' + eventType.charAt(0).toUpperCase() + eventType.slice(1),
            data = $target.data(camelDataName),
            settings = data.settings;

          if (settings.preventDefault.start) {
            event.preventDefault();
          }

          if (touches.length === settings.requiredTouches) {
            switch (eventType) {

              //////////////// DRAG ////////////////
              case 'drag':
                updateDragData(data, touches, e.timeStamp);
                var startPoint = data.startPoint;
                $target.trigger('touchy-drag', ['start', $target, {
                  "movePoint":     startPoint,
                  "lastMovePoint": startPoint,
                  "startPoint":    startPoint,
                  "velocity":      0
                }]);
                break;

              //////////////// SWIPE ////////////////
              case 'swipe':
                updateSwipeData(data, touches, e.timeStamp);
                break;

              //////////////// PINCH ////////////////
              case 'pinch':
                var points = getTwoTouchPointData(e);
                if(points){
                  data.startPoint = {
                    "x": points.centerX,
                    "y": points.centerY
                  }
                  data.startDistance = Math.sqrt( Math.pow( (points.x2 - points.x1), 2 ) + Math.pow( (points.y2 - points.y1), 2 ) );
                }
                break;

              //////////////// LONGPRESS ////////////////
              case 'longpress':
                data.startPoint = {
                  "x": touches[0].pageX,
                  "y": touches[0].pageY
                };
                data.startDate = e.timeStamp;
                if (settings.triggerStartPhase) {
                  $target.trigger('touchy-longpress', ['start', $target]);
                }
                data.timer = setTimeout($.proxy(function(){
                  $target.trigger('touchy-longpress', ['end', $target]);
                }, this), settings.msThresh);
                break;

              //////////////// ROTATE ////////////////
              case 'rotate':
                if (touches.length === 1) {
                  ensureSingularStartData(data, touches, e.timeStamp);
                }
                else {
                  var points = getTwoTouchPointData(e);
                  data.startPoint = {
                    "x": points.centerX,
                    "y": points.centerY
                  };
                  data.startDate = e.timeStamp;
                }
                var startPoint = data.startPoint;
                $target.trigger('touchy-rotate', ['start', $target, {
                  "startPoint": startPoint,
                  "movePoint": startPoint,
                  "lastMovePoint": startPoint,
                  "velocity": 0,
                  "degrees": 0
                }]);
                break;
            }
          }
        }
      },

      handleTouchMove: function (e) {
        var eventType = this.context,
          $target = getTarget(e, eventType);

        if ($target) {
          var event = e.originalEvent,
            touches = event.targetTouches,
            camelDataName = 'touchy' + eventType.charAt(0).toUpperCase() + eventType.slice(1),
            data = $target.data(camelDataName),
            settings = data.settings;

          if(typeof settings.preventDefault != 'undefined'){
            if (settings.preventDefault.move) {
              event.preventDefault();
            }
          }

          if (touches.length === settings.requiredTouches) {
            switch (eventType) {

              //////////////// DRAG ////////////////
              case 'drag':
                updateDragData(data, touches, e.timeStamp);
                var movePoint = data.movePoint,
                  lastMovePoint = data.lastMovePoint,
                  distance = movePoint.x === lastMovePoint.x && movePoint.y === lastMovePoint.y ? 0 : Math.sqrt( Math.pow( (movePoint.x - lastMovePoint.x), 2 ) + Math.pow( (movePoint.y - lastMovePoint.y), 2 ) ),
                  ms = data.moveDate - data.lastMoveDate,
                  velocity = ms === 0 ? 0 : distance / ms;
                if (data.held) {
                  $target.trigger('touchy-drag', ['move', $target, {
                    "movePoint":     movePoint,
                    "lastMovePoint": lastMovePoint,
                    "startPoint":    data.startPoint,
                    "velocity":      velocity
                  }]);
                }
                break;

              //////////////// SWIPE ////////////////
              case 'swipe':
                updateSwipeData(data, touches, e.timeStamp);

                if (!data.swipeExecuted && data.swiped && settings.triggerOn === 'touchmove') {
                  data.swipeExecuted = true;
                  triggerSwipe(data, $target);
                  $.extend(data, {
                    "startPoint": null,
                    "startDate": null,
                    "movePoint": null,
                    "moveDate": null,
                    "lastMovePoint": null,
                    "lastMoveDate": null,
                    "swiped": false,
                    "swipeExecuted": false
                  });
                }
                break;

              //////////////// PINCH ////////////////
              case 'pinch':
                var points = getTwoTouchPointData(e);
                if(points){
                  data.currentPoint = {
                    "x": points.centerX,
                    "y": points.centerY
                  };
                  if (!hasGestureChange()) {
                    var moveDistance = Math.sqrt( Math.pow( (points.x2 - points.x1), 2 ) + Math.pow( (points.y2 - points.y1), 2 ) ),
                      previousScale = data.previousScale = data.scale || 1,
                      startDistance = data.startDistance,
                      scale = data.scale = moveDistance / startDistance,
                      currentDistance = scale * startDistance;

                    if(currentDistance > settings.pxThresh){
                      $target.trigger('touchy-pinch', [$target, {
                        "scale":         scale,
                        "previousScale": previousScale,
                        "currentPoint":  data.currentPoint,
                        "startPoint":    data.startPoint,
                        "startDistance": startDistance
                      }]);
                    }
                  }
                }
                break;

              //////////////// ROTATE ////////////////
              case 'rotate':
                var lastMovePoint,
                  lastMoveDate,
                  movePoint,
                  moveDate,
                  lastMoveDate,
                  distance,
                  ms,
                  velocity,
                  targetPageCoords,
                  centerCoords,
                  radians,
                  degrees,
                  lastDegrees,
                  degreeDelta;

                lastMovePoint = data.lastMovePoint = data.movePoint || data.startPoint;
                lastMoveDate = data.lastMoveDate = data.moveDate || data.startDate;
                movePoint = data.movePoint = {
                  "x": touches[0].pageX,
                  "y": touches[0].pageY
                };
                moveDate = data.moveDate = e.timeStamp;

                if (touches.length === 1) {
                  targetPageCoords = data.targetPageCoords = data.targetPageCoords || getViewOffset(e.target);
                  centerCoords = data.centerCoords = data.centerCoords || {
                    "x": targetPageCoords.x + ($target.width() * 0.5),
                    "y": targetPageCoords.y + ($target.height() * 0.5)
                  };
                }
                else {
                  var points = getTwoTouchPointData(e);
                  centerCoords = data.centerCoords = {
                    "x": points.centerX,
                    "y": points.centerY
                  };
                  if (hasGestureChange()) {
                    break;
                  }

                }
                radians = Math.atan2(movePoint.y - centerCoords.y, movePoint.x - centerCoords.x);
                lastDegrees = data.lastDegrees = data.degrees;
                degrees = data.degrees = radians * (180 / Math.PI);
                degreeDelta = lastDegrees ? degrees - lastDegrees : 0;
                ms = moveDate - lastMoveDate;
                velocity = data.velocity = ms === 0 ? 0 : degreeDelta / ms;

                $target.trigger('touchy-rotate', ['move', $target, {
                  "startPoint": data.startPoint,
                  "startDate": data.startDate,
                  "movePoint": movePoint,
                  "lastMovePoint": lastMovePoint,
                  "centerCoords": centerCoords,
                  "degrees": degrees,
                  "degreeDelta": degreeDelta,
                  "velocity": velocity
                }]);
                break;
            }
          }
        }
      },

      handleGestureChange: function (e) {
        var eventType = this.context,
          $target = getTarget(e, eventType);

        if ($target) {
          var $target = $(e.target),
            event = e.originalEvent,
            touches = event.touches,
            camelDataName = 'touchy' + eventType.charAt(0).toUpperCase() + eventType.slice(1),
            data = $target.data(camelDataName);
          if(typeof data.preventDefault != 'undefined'){
            if (data.preventDefault.move) {
              event.preventDefault();
            }
          }

          switch (eventType) {

            //////////////// PINCH ////////////////
            case 'pinch':
              var previousScale = data.previousScale = data.scale || 1,
                scale = data.scale = event.scale,
                startPoint = data.startPoint,
                currentPoint = data.currentPoint || startPoint,
                startDistance = data.startDistance,
                currentDistance = scale * startDistance;

              if(currentDistance > data.settings.pxThresh){
                $target.trigger('touchy-pinch', [$target, {
                  "scale": scale,
                  "previousScale": previousScale,
                  "currentPoint": currentPoint,
                  "startPoint": startPoint,
                  "startDistance": startDistance
                }]);
              }
              break;

            //////////////// ROTATE ////////////////
            case 'rotate':
              var lastDegrees = data.lastDegrees = data.degrees,
                degrees = data.degrees = event.rotation,
                degreeDelta = lastDegrees ? degrees - lastDegrees : 0,
                ms = data.moveDate - data.lastMoveDate,
                velocity = data.velocity = ms === 0 ? 0 : degreeDelta / ms;
              $target.trigger('touchy-rotate', ['move', $target, {
                "startPoint": data.startPoint,
                "startDate": data.startDate,
                "movePoint": data.movePoint,
                "lastMovePoint": data.lastMovePoint,
                "centerCoords": data.centerCoords,
                "degrees": degrees,
                "degreeDelta": degreeDelta,
                "velocity": velocity
              }]);
              break;
          }
        }
      },

      handleTouchEnd: function (e) {
        var eventType = this.context,
          $target = getTarget(e, eventType);

        if ($target) {
          var event = e.originalEvent,
              camelDataName = 'touchy' + eventType.charAt(0).toUpperCase() + eventType.slice(1),
              data = $target.data(camelDataName),
              settings = data.settings;

          if (settings.preventDefault.end) {
            event.preventDefault();
          }

          switch (eventType) {

            //////////////// DRAG ////////////////
            case 'drag':
              if (data.held) {
                // note: not updating data for end phase
                var movePoint = data.movePoint || data.startPoint,
                  lastMovePoint = data.lastMovePoint || data.startPoint,
                  distance = movePoint.x === lastMovePoint.x && movePoint.y === lastMovePoint.y ? 0 : Math.sqrt( Math.pow( (movePoint.x - lastMovePoint.x), 2 ) + Math.pow( (movePoint.y - lastMovePoint.y), 2 ) ),
                  ms = data.moveDate - data.lastMoveDate,
                  velocity = ms === 0 ? 0 : distance / ms;
                $target.trigger('touchy-drag', ['end', $target, {
                  "movePoint":     movePoint,
                  "lastMovePoint": lastMovePoint,
                  "startPoint":    data.startPoint,
                  "velocity":      velocity
                }]);
              }
              $.extend(data, {
                "startPoint": null,
                "startDate": null,
                "movePoint": null,
                "moveDate": null,
                "lastMovePoint": null,
                "lastMoveDate": null,
                "held": false
              });
              break;

            //////////////// SWIPE ////////////////
            case 'swipe':
              // note: not updating data for end phase
              if (data.swiped && settings.triggerOn === 'touchend') {
                triggerSwipe(data, $target);
              }
              $.extend(data, {
                "startPoint": null,
                "startDate": null,
                "movePoint": null,
                "moveDate": null,
                "lastMovePoint": null,
                "lastMoveDate": null,
                "swiped": false,
                "swipeExecuted": false
              });
              break;

            //////////////// PINCH ////////////////
            case 'pinch':
              $.extend(data, {
                "startPoint": null,
                "startDistance": 0,
                "currentPoint": null,
                "pinched": false,
                "scale": 1,
                "previousScale": null
              });
              break;

            //////////////// LONGPRESS ////////////////
            case 'longpress':
              clearTimeout(data.timer);
              $.extend(data, {
                "startDate":null
              });
              break;

            //////////////// ROTATE ////////////////
            case 'rotate':
              var degreeDelta = data.lastDegrees ? data.degrees - data.lastDegrees : 0;
              $target.trigger('touchy-rotate', ['end', $target, {
                "startPoint": data.startPoint,
                "startDate": data.startDate,
                "movePoint": data.movePoint,
                "lastMovePoint": data.lastMovePoint,
                "degrees": data.degrees,
                "degreeDelta": degreeDelta,
                "velocity": data.velocity
              }]);
              $.extend(data, {
                "startPoint":null,
                "startDate":null,
                "movePoint":null,
                "moveDate":null,
                "lastMovePoint":null,
                "lastMoveDate":null,
                "targetPageCoords":null,
                "centerCoords":null,
                "degrees":null,
                "lastDegrees":null,
                "velocity":null
              });
              break;
          }
        }
      }

    },


  // event-specific methods

    updateDragData = function (data, touches, timeStamp) {
      ensureSingularStartData(data, touches, timeStamp);
      var lastMoveDate = data.moveDate || data.startDate,
        moveDate = timeStamp;
      if ( data.held || (moveDate - lastMoveDate) > data.settings.msHoldThresh ){
        $.extend(data, {
          held: true,
          lastMoveDate: lastMoveDate,
          lastMovePoint: data.movePoint && data.movePoint.x ? data.movePoint : data.startPoint,
          moveDate: moveDate,
          movePoint: {
            "x": touches[0].pageX,
            "y": touches[0].pageY
          }
        });
      }
      else {
        $.extend(data, {
          held: false,
          lastMoveDate: 0,
          lastMovePoint: data.startPoint,
          moveDate: 0,
          movePoint: data.startPoint
        });
      }
    },

    updateSwipeData = function (data, touches, timeStamp) {
      ensureSingularStartData(data, touches, timeStamp);
      var settings = data.settings,
          startDate = data.startDate,
          startPoint = data.startPoint,
          lastMoveDate = data.moveDate || data.startDate,
          moveDate = timeStamp,
          movePoint = {
            "x": touches[0].pageX,
            "y": touches[0].pageY
          },
          hDistance = movePoint.x - startPoint.x, // positive is right
          vDistance = movePoint.y - startPoint.y,  // positive is down
          ms = moveDate - lastMoveDate;
      $.extend(data, {
        lastMoveDate: lastMoveDate,
        lastMovePoint: data.movePoint && data.movePoint.x ? data.movePoint : data.startPoint,
        moveDate: moveDate,
        movePoint: movePoint,
        hDistance: hDistance,
        vDistance: vDistance
      });

      if (!data.swiped && ( Math.abs(hDistance) / ms > settings.velocityThresh || Math.abs(vDistance) / ms > settings.velocityThresh )) {
        data.swiped = true;
      }
    },

    triggerSwipe = function (data, $target) {
      var movePoint = data.movePoint,
          lastMovePoint = data.lastMovePoint,
          distance = movePoint.x === lastMovePoint.x && movePoint.y === lastMovePoint.y ? 0 : Math.sqrt( Math.pow( (movePoint.x - lastMovePoint.x), 2 ) + Math.pow( (movePoint.y - lastMovePoint.y), 2 ) ),
          ms = data.moveDate - data.lastMoveDate,
          velocity = ms === 0 ? 0 : distance / ms,
          hDistance = data.hDistance,
          vDistance = data.vDistance,
          direction;
      if (velocity > data.settings.velocityThresh) {
        if (Math.abs(hDistance) > Math.abs(vDistance)) {
          direction = hDistance > 0 ? 'right' : 'left';
        }
        else {
          direction = vDistance > 0 ? 'down' : 'up';
        }
        $target.trigger('touchy-swipe', [$target, {
          "direction":     direction,
          "movePoint":     movePoint,
          "lastMovePoint": lastMovePoint,
          "startPoint":    data.startPoint,
          "velocity":      velocity
        }]);
      }
    },


  // other private methods

    ensureSingularStartData = function (data, touches, timeStamp) {
      if (!data.startPoint) {
        data.startPoint = {
          "x": touches[0].pageX,
          "y": touches[0].pageY
        }
      }
      if (!data.startDate) {
        data.startDate = timeStamp;
      }
    },

    hasGestureChange = function () {
      return (typeof window.ongesturechange == "object");
    },

    getTwoTouchPointData = function(e){ // could become multitouch point data for any number of touches?
      var points = false,
          touches = e.originalEvent.touches;
      if(touches.length === 2){
        points = {
          x1: touches[0].pageX,
          y1: touches[0].pageY,
          x2: touches[1].pageX,
          y2: touches[1].pageY
        }
        points.centerX = (points.x1 + points.x2) / 2;
        points.centerY = (points.y1 + points.y2) / 2;
        return points;
      }
      return points;
    },

    getTarget = function(e, eventType){
      var $delegate,
          $target = false,
          i = 0,
          len = boundElems[eventType].length
      if ($.touchyOptions.useDelegation) {
        for (; i < len; i += 1) {
          $delegate = $(boundElems[eventType][i]).has(e.target);
          if ($delegate.length > 0){
            $target = $delegate;
            break;
          }
        }
      }
      else if (boundElems[eventType] && boundElems[eventType].index(e.target) != -1) {
        $target = $(e.target)
      }
      return $target;
    },

  // get pageX and pageY of an element
  // from: http://ecmanaut.blogspot.com/2010/06/elementpagex-and-elementpagey.html
    getViewOffset = function (node, singleFrame) {

      function addOffset(node, coords, view) {
        var p = node.offsetParent;
        coords.x += node.offsetLeft - (p ? p.scrollLeft : 0);
        coords.y += node.offsetTop - (p ? p.scrollTop : 0);

        if (p) {
          if (p.nodeType == 1) {
            var parentStyle = view.getComputedStyle(p, '');
            if (parentStyle.position != 'static') {
              coords.x += parseInt(parentStyle.borderLeftWidth);
              coords.y += parseInt(parentStyle.borderTopWidth);

              if (p.localName == 'TABLE') {
                coords.x += parseInt(parentStyle.paddingLeft);
                coords.y += parseInt(parentStyle.paddingTop);
              }
              else if (p.localName == 'BODY') {
                var style = view.getComputedStyle(node, '');
                coords.x += parseInt(style.marginLeft);
                coords.y += parseInt(style.marginTop);
              }
            }
            else if (p.localName == 'BODY') {
              coords.x += parseInt(parentStyle.borderLeftWidth);
              coords.y += parseInt(parentStyle.borderTopWidth);
            }

            var parent = node.parentNode;
            while (p != parent) {
              coords.x -= parent.scrollLeft;
              coords.y -= parent.scrollTop;
              parent = parent.parentNode;
            }
            addOffset(p, coords, view);
          }
        }
        else {
          if (node.localName == 'BODY') {
            var style = view.getComputedStyle(node, '');
            coords.x += parseInt(style.borderLeftWidth);
            coords.y += parseInt(style.borderTopWidth);

            var htmlStyle = view.getComputedStyle(node.parentNode, '');
            coords.x -= parseInt(htmlStyle.paddingLeft);
            coords.y -= parseInt(htmlStyle.paddingTop);
          }

          if (node.scrollLeft)
            coords.x += node.scrollLeft;
          if (node.scrollTop)
            coords.y += node.scrollTop;

          var win = node.ownerDocument.defaultView;
          if (win && (!singleFrame && win.frameElement))
            addOffset(win.frameElement, coords, win);
        }
      }

      var coords = {
        x: 0,
        y: 0
      };
      if (node)
        addOffset(node, coords, node.ownerDocument.defaultView);

      return coords;
    },

    boundElems = {},
    contexts = {};

  /* The following is a metaprogramming loop, and thus it's ugly. */
  $.each($.touchyOptions, function(key, value){
    if (key !== 'useDelegation') {
      var capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);

      boundElems[key] = $([]);
      contexts[key] = new (function () {this.context = key;})();

      $.event.special["touchy-" + key] = {
        setup: function (data, namespaces, eventHandle) {
          boundElems[key] = boundElems[key].add( this );
          $(this).data('touchy' + capitalizedKey, $.extend({}, $.touchyOptions[key].data));
          $(this).data('touchy' + capitalizedKey).settings = $.extend({}, $.touchyOptions[key]);
          delete $(this).data('touchy' + capitalizedKey).settings.data;
          if ( boundElems[key].length === 1 ) {
            $.each($.touchyOptions[key].proxyEvents, function(i, proxyEvent){
              $(document).bind(proxyEvent.toLowerCase() + '.touchy.' + key, $.proxy(proxyHandlers['handle' + proxyEvent], contexts[key]));
            });
          }

        },
        teardown: function (namespaces) {
          boundElems[key] = boundElems[key].not( this );
          $(this).removeData('touchy' + capitalizedKey);
          if ( boundElems[key].length === 0 ) {
            $.each($.touchyOptions[key].proxyEvents, function(i, proxyEvent){
              $(document).unbind(proxyEvent.toLowerCase() + '.touchy.' + key);
            });
          }
        },
        add: function (handleObj) {
          $.extend($(this).data('touchy' + capitalizedKey).settings, handleObj.data);
          var old_handler = handleObj.handler;
          handleObj.handler = function (event) {
            return old_handler.apply(this, arguments);
          };
        }
      };
    }
  });

})(jQuery);


/* ============================================================
   4. jQuery DoubleTap
   ============================================================ */

(function($){
 
var hasTouch = /android|iphone|ipad/i.test(navigator.userAgent.toLowerCase()),
    eventName = hasTouch ? 'touchend' : 'click';
 
/**
 * Bind an event handler to the "double tap" JavaScript event.
 * @param {function} doubleTapHandler
 * @param {number} [delay=300]
 */
$.fn.doubletap = function(doubleTapHandler, delay){
    delay = (delay == null) ? 300 : delay;
 
    this.bind(eventName, function(event){
        var now = new Date().getTime();
 
        // the first time this will make delta a negative number
        var lastTouch = $(this).data('lastTouch') || now + 1;
        var delta = now - lastTouch;
        if(delta < delay && 0 < delta){
            // After we detct a doubletap, start over
            $(this).data('lastTouch', null);
 
            if(doubleTapHandler !== null && typeof doubleTapHandler === 'function'){
                doubleTapHandler(event);
            }
        }else{
            $(this).data('lastTouch', now);
        }
    });
};
 
})(jQuery);