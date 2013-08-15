(function(win,doc,undefined) {

	'use strict';

	var TRIM_REGEXP = /^\s+|\s+$/g,
		picoh = function(id) {

			return doc.getElementById(id);
		},

		// picoh.trim(),picoh.Event.add()/remove()/getRelatedTarget(),picoh.DOM.isChildOf()/hasClass()/setOpacity()/getPageScroll() aliases for minification
		docEl = doc.documentElement,
		trimString,
		eventAdd,eventRemove,getRelatedTarget,
		isChildOf,hasClass,setOpacity,getPageScroll,

		// if (realEventModel == false) then Internet Explorer < 9 event model used
		realEventModel = !!win.addEventListener;

	picoh.debounce = function(handler,delay) {

		var timeout,
			debounce = function() {

				if (timeout) clearTimeout(timeout);
				timeout = setTimeout(handler,delay);
			};

		debounce.clear = function() {

			if (timeout) clearTimeout(timeout);
			timeout = undefined;
		};

		return debounce;
	};

	picoh.each = function(collection,handler) {

		var index = 0;

		if (
			(collection instanceof Array) ||
			((collection.item !== undefined) && (collection.length !== undefined))
		) {
			// collection is an array or DOM HtmlCollection/NodeList (using Duck typing for this test, should be reliable)
			for (var length = collection.length;index < length;index++) {
				// if handler returns false, bail early
				if (handler(collection[index],index) === false) return;
			}

		} else {
			// otherwise, collection is an object
			for (var key in collection) {
				// if handler returns false, bail early
				if (handler(collection[key],key,index++) === false) return;
			}
		}
	};

	picoh.trim = trimString = function(value) {

		return value.replace(TRIM_REGEXP,'');
	};

	picoh.Event = function() {

		var method = {},
			eventList = [],
			reqAnimFrameNative =
				win.requestAnimationFrame ||
				win.mozRequestAnimationFrame ||
				win.oRequestAnimationFrame ||
				win.webkitRequestAnimationFrame,
			reqAnimFrameFauxLastTime = 0;

		method.add = eventAdd = (realEventModel)
			? function(obj,type,handler) { obj.addEventListener(type,handler,false); }
			: function(obj,type,handler) {

				// Internet Explorer < 9 event handler
				// - fix 'this' upon event handler call
				// - event tracking [eventList] for leaky memory cleanup upon document unload
				obj[type + handler] = function(event) { handler.call(obj,event); };
				obj.attachEvent('on' + type,obj[type + handler]);
				eventList.push([obj,type,handler]);
			};

		method.remove = eventRemove = (realEventModel)
			? function(obj,type,handler) { obj.removeEventListener(type,handler,false); }
			: function(obj,type,handler) {

				// Internet Explorer < 9 - reverse steps in Event.add() and unassociate handler wrapper to release memory (we hope - this is IE after all)
				obj.detachEvent('on' + type,obj[type + handler]);
				obj[type + handler] = null;
			};

		method.preventDefault = (realEventModel)
			? function(event) { event.preventDefault(); }
			: function(event) { event.returnValue = false; };

		method.stopPropagation = (realEventModel)
			? function(event) { event.stopPropagation(); }
			: function(event) { event.cancelBubble = true; };

		method.getTarget = function(event) {

			// W3 / Internet Explorer target
			var el = event.target || event.srcElement;

			// defeat Safari browser bug (target element should not be a text node)
			return (el && (el.nodeType == 3)) ? el.parentNode : el;
		};

		method.getRelatedTarget = getRelatedTarget = (realEventModel)
			? function(event) { return event.relatedTarget; }
			: function(event) {

				// Internet Explorer relatedTarget
				return (event.type == 'mouseover')
					? event.fromElement
					: ((event.type == 'mouseout') ? event.toElement : null);
			};

		method.isMouseEnterLeave = function(event,el) {

			var relEl = getRelatedTarget(event);
			return !(!relEl || isChildOf(el,relEl));
		};

		// getMousePosition() returns the mouse position relative to the document, not the browser viewport
		// note: event.pageX/event.pageY is mis-reported (behaves like event.clientX/event.clientY) with IE10 10.0.9200.16384, but fixed in 10.0.9200.16484 - http://bugs.jquery.com/ticket/12343
		method.getMousePosition = (realEventModel)
			? function(event) {

				// using Math.round() as IE10 (and other vendors may follow in future) can/will report fractional coordinates due to sub-pixel rendering
				// http://blogs.msdn.com/b/ie/archive/2012/02/17/sub-pixel-rendering-and-the-css-object-model.aspx
				return {
					x: Math.round(event.pageX || 0),
					y: Math.round(event.pageY || 0)
				};
			}
			: function(event) {

				if (event.clientX || event.clientY) {
					// include the current page x/y scroll positions into document to mimic event.pageX/event.pageY
					var pageScroll = getPageScroll();

					return {
						x: (event.clientX || 0) + pageScroll.x,
						y: (event.clientY || 0) + pageScroll.y
					};
				}

				return { x: 0,y: 0 };
			};

		method.reqAnimFrame = (reqAnimFrameNative !== undefined)
			? function(handler) { reqAnimFrameNative(handler); }
			: function(handler) {

				// faux window.requestAnimationFrame() method
				var curTime = new Date().getTime(),
					timeToCall = Math.max(0,16 - (curTime - reqAnimFrameFauxLastTime));

				setTimeout(handler,timeToCall);
				reqAnimFrameFauxLastTime = curTime + timeToCall;
			};

		if (!realEventModel) {
			// Internet Explorer < 9 event memory cleanup routine
			win.attachEvent('onunload',function() {

				// cycle eventList and remove all events created
				for (var index = 0,eventItem;eventItem = eventList[index];index++) {
					eventRemove(eventItem[0],eventItem[1],eventItem[2]);
				}
			});
		}

		return method;
	}();

	picoh.DOM = function() {

		var READY_STATE_REGEXP = /^(loade|c)/,
			DOM_CONTENT_LOADED_EVENT = 'DOMContentLoaded',
			ON_READY_STATE_CHANGE_EVENT = 'onreadystatechange',
			IE_DOM_SCROLL_CHECK_DELAY = 50,
			method = {},
			hasClassRegExpCollection = {},
			readyHandlerList,
			DOMIsReady = READY_STATE_REGEXP.test(doc.readyState);

		// DOM querySelectorAll() method wrapper in global namespace
		win.$$ = function() {

			var elList = [];

			if (doc.querySelectorAll) {
				var elGiven = (arguments.length - 1),
					nodeList = ((elGiven) ? arguments[0] : doc).querySelectorAll(arguments[elGiven]);

				// convert returned nodeList to an array
				for (var index = 0,nodeItem;nodeItem = nodeList[index];index++) {
					elList.push(nodeItem);
				}
			}

			return elList;
		};

		// DOM ready handler
		method.ready = function(handler) {

			// if DOM ready call handler right away
			if (DOMIsReady) return handler();

			if (!readyHandlerList) {
				// init events
				if (realEventModel) {
					eventAdd(doc,DOM_CONTENT_LOADED_EVENT,readyHandler);
					eventAdd(win,'load',readyHandler);

				} else {
					// Internet Explorer event model - but not via $.Event.add() to keep lightweight, 'this' correction/etc. is overkill here
					doc.attachEvent(ON_READY_STATE_CHANGE_EVENT,readyHandler);
					win.attachEvent('onload',readyHandler);

					// doScroll() hack for Internet Explorer < 9, (it should) fire earlier than 'onreadystatechange'
					// this will fail (badly) if used inside an iframe - so don't
					if (docEl.doScroll) {
						(function doScrollCheck() {

							if (!DOMIsReady) {
								try {
									docEl.doScroll('left');

								} catch(e) {
									return setTimeout(doScrollCheck,IE_DOM_SCROLL_CHECK_DELAY);
								}

								DOMIsReady = true;
								readyHandler();
							}
						})();
					}
				}

				readyHandlerList = [];
			}

			// add handler to stack
			readyHandlerList.push(handler);
		};

		function readyHandler(event) {

			if (realEventModel || DOMIsReady || (event.type == 'load') || (READY_STATE_REGEXP.test(doc.readyState))) {
				// detach events
				if (realEventModel) {
					eventRemove(doc,DOM_CONTENT_LOADED_EVENT,readyHandler);
					eventRemove(win,'load',readyHandler);

				} else {
					doc.detachEvent(ON_READY_STATE_CHANGE_EVENT,readyHandler);
					win.detachEvent('onload',readyHandler);
				}

				// process handler stack
				while (readyHandlerList.length) readyHandlerList.shift()();
				DOMIsReady = true;
			}
		}

		method.create = function(name,attributeList,childElList) {

			var createEl = doc.createElement(name);

			if (attributeList) {
				for (var index in attributeList) {
					createEl[index] = attributeList[index];
				}
			}

			if (childElList) {
				for (var index = 0,length = childElList.length;index < length;index++) {
					var childEl = childElList[index];
					createEl.appendChild((typeof childEl == 'string') ? doc.createTextNode(childEl) : childEl);
				}
			}

			return createEl;
		};

		method.insertBefore = function(el,refEl) {

			refEl.parentNode.insertBefore(el,refEl);
		};

		method.insertAfter = function(el,refEl) {

			refEl.parentNode.insertBefore(el,refEl.nextSibling);
		};

		method.replace = function(el,oldEl) {

			// return oldEl
			return oldEl.parentNode.replaceChild(el,oldEl);
		};

		method.remove = function(el) {

			// return el
			return el.parentNode.removeChild(el);
		};

		method.removeChildAll = function(el) {

			while (el.firstChild) el.removeChild(el.firstChild);
		};

		method.isChildOf = isChildOf = function(parentEl,childEl) {

			if (!childEl) return false;
			if (parentEl === childEl) return true;

			// call isChildOf() recursively
			return isChildOf(parentEl,childEl.parentNode);
		};

		method.hasClass = hasClass = function(el,name,className) {

			return (
				(hasClassRegExpCollection[name])
					? hasClassRegExpCollection[name]
					: hasClassRegExpCollection[name] = new RegExp('(^| )' + name + '( |$)')
			).test(className || el.className);
		};

		method.addClass = function(el,name) {

			var classNameList = name.split(' '),
				newClassName = el.className;

			while (classNameList.length) {
				var className = classNameList.pop();
				if (!hasClass(0,className,newClassName)) newClassName += ' ' + className;
			}

			el.className = trimString(newClassName);
		};

		method.removeClass = function(el,name) {

			var classNameList = name.split(' '),
				newClassName = ' ' + el.className + ' ';

			while (classNameList.length) {
				newClassName = newClassName.replace(' ' + classNameList.pop() + ' ',' ');
			}

			el.className = trimString(newClassName);
		};

		method.setOpacity = setOpacity = function(el,opacity) {

			// ensure opacity is between 0.00 and 1.00
			opacity = Math.round(Math.max(0,Math.min(1,opacity)) * 100) / 100;

			var style = el.style;
			style.opacity = opacity;

			// Internet Explorer < 9
			if (!realEventModel) {
				style.filter = 'alpha(opacity=' + Math.round(opacity * 100) + ')';
				style.zoom = 1; // trigger hasLayout
			}
		};

		method.setStyle = function(el,styleList) {

			for (var index in styleList) {
				var value = styleList[index];
				if (index == 'opacity') {
					setOpacity(el,value);

				} else {
					el.style[index] = value;
				}
			}
		};

		method.getOffset = function(el,toParent) {

			var left = 0,
				top = 0;

			while (el.offsetParent) {
				left += el.offsetLeft;
				top += el.offsetTop;

				if (toParent) break;
				el = el.offsetParent;
			}

			return {
				left: left,
				top: top
			};
		};

		method.getPageScroll = getPageScroll = function() {

			// docEl.scrollLeft/docEl.scrollTop for IE10 and below
			return {
				x: win.scrollX || docEl.scrollLeft || 0,
				y: win.scrollY || docEl.scrollTop || 0
			};
		};

		method.getViewportSize = function() {

			return {
				width: docEl.clientWidth || win.innerWidth || 0,
				height: win.innerHeight || docEl.clientHeight || 0
			}
		};

		method.getDocumentSize = function() {

			return {
				width: Math.max(docEl.clientWidth,docEl.offsetWidth,docEl.scrollWidth),
				height: Math.max(docEl.clientHeight,docEl.offsetHeight,docEl.scrollHeight)
			};
		};

		method.Anim = function() {

			var CLASS_NAME_ANIM_ACTIVE_KEY = ' cssanimactive cssanim',
				CLASS_NAME_ANIMID_REGEXP = new RegExp(CLASS_NAME_ANIM_ACTIVE_KEY + '([0-9]+)( |$)'),
				IS_OPERA_EVENT_TYPE_REGEXP = /^o[AT]/,
				method = {},
				isDetected,
				animationSupport,
				animationEventTypeEnd,
				animationEndHandlerCollection,
				transitionSupport,
				transitionEventTypeEnd,
				transitionEndHandlerCollection,
				nextAnimId = 0;

			function detect() {

				// if already detected support then exit
				if (isDetected) return;
				isDetected = true;

				// collection of animation/transition style properties per browser engine and matching DOM events
				// non-prefixed properties are intentionally checked first
				var ANIMATION_DETECT_LIST = [
						['animation','animationend'],
						['MozAnimation','mozAnimationEnd'],
						['OAnimation','oAnimationEnd'],
						['webkitAnimation','webkitAnimationEnd']
					],
					TRANSITION_DETECT_LIST = [
						['transition','transitionend'],
						['MozTransition','mozTransitionEnd'],
						['OTransition','oTransitionEnd'],
						['webkitTransition','webkitTransitionEnd']
					];

				function detectHandle(detectList,handler) {

					while (detectList.length) {
						var item = detectList.shift();
						if (docEl.style[item[0]] !== undefined) {
							// found property - deligate to handler
							return handler(item[1]);
						}
					}
				}

				// animation support
				detectHandle(ANIMATION_DETECT_LIST,function(item) {

					animationSupport = true;
					animationEventTypeEnd = item;
				});

				// transition support
				detectHandle(TRANSITION_DETECT_LIST,function(item) {

					transitionSupport = true;
					transitionEventTypeEnd = item;
				});
			}

			function addDocElEvent(type,handler) {

				docEl.addEventListener(type,handler,false);
				if (IS_OPERA_EVENT_TYPE_REGEXP.test(type)) {
					// some earlier versions of Opera (Presto) need lowercased event names
					docEl.addEventListener(type.toLowerCase(),handler,false);
				}
			}

			function getElAnimId(el) {

				// look for animation ID class identifier
				var match = CLASS_NAME_ANIMID_REGEXP.exec(' ' + el.className);
				return (match) ? (match[1] * 1) : false; // cast as integer
			}

			function removeElAnimId(el,animId) {

				// remove animation ID class identifer from element
				el.className = trimString(
					(' ' + el.className + ' ').
					replace(CLASS_NAME_ANIM_ACTIVE_KEY + animId + ' ',' ')
				);
			}

			function removeAnimItem(handlerCollection,el) {

				// DOM element has an animation ID?
				var animId = getElAnimId(el);
				if (animId === false) return;

				// remove animation ID from element and handler collection
				removeElAnimId(el,animId);
				delete handlerCollection[animId];
			}

			function onEndProcess(hasSupport,eventTypeEnd,handlerCollection,el,handler,data) {

				if (!hasSupport) {
					// no CSS animation/transition support, call handler right away
					setTimeout(function() { handler(el,data); });

				} else {
					if (!handlerCollection) {
						// setup end handler
						handlerCollection = {};
						addDocElEvent(eventTypeEnd,function(event) {

							// ensure event returned the target element
							if (!event || !event.target) return;

							// get element animation id - exit if not found
							var targetEl = event.target,
								animId = getElAnimId(targetEl);

							if (animId === false) return;
							removeElAnimId(targetEl,animId);

							// execute handler then remove from collection
							var item = handlerCollection[animId];
							if (item) item[0](item[1],item[2]);

							delete handlerCollection[animId];
						});
					}

					// remove possible existing transition end handler and setup new end handler
					removeAnimItem(handlerCollection,el);

					// add animation ID class identifer to element
					el.className = trimString(el.className + CLASS_NAME_ANIM_ACTIVE_KEY + nextAnimId);

					// add item to handler collection
					handlerCollection[nextAnimId++] = [handler,el,data];
				}

				// important handlerCollection is returned since we create a new object for the collection in this function
				return handlerCollection;
			}

			method.onAnimationEnd = function(el,handler,data) {

				detect();
				animationEndHandlerCollection = onEndProcess(
					animationSupport,animationEventTypeEnd,
					animationEndHandlerCollection,
					el,handler,data
				);
			};

			method.cancelAnimationEnd = function(el) {

				removeAnimItem(animationEndHandlerCollection,el);
			};

			method.onTransitionEnd = function(el,handler,data) {

				detect();
				transitionEndHandlerCollection = onEndProcess(
					transitionSupport,transitionEventTypeEnd,
					transitionEndHandlerCollection,
					el,handler,data
				);
			};

			method.cancelTransitionEnd = function(el) {

				removeAnimItem(transitionEndHandlerCollection,el);
			};

			return method;
		}();

		// if found, remove the 'nojs' class from the <html> element and add 'js'
		docEl.className = docEl.className.replace('nojs','js');

		return method;
	}();

	picoh.request = (function() {

		var REQUEST_HEADER_CONTENT_TYPE_POST = 'application/x-www-form-urlencoded';

		function buildParameters(list) {

			if (list) {
				var parameters = '';
				for (var index in list) {
					parameters += index + '=' + encodeURIComponent(list[index]) + '&';
				}

				// drop final '&'
				return parameters.slice(0,-1);
			}
		}

		function parseJSON(responseText) {

			var JSONdata = {};

			if (win.JSON) {
				// if text starts/ends with '{' and '}' then assume it's JSON data
				responseText = trimString(responseText);

				if (
					(responseText.slice(0,1) == '{') &&
					(responseText.slice(-1) == '}')
				) {
					// attempt to parse
					try {
						JSONdata = JSON.parse(responseText);
					} catch(e) {}
				}
			}

			return JSONdata;
		}

		return function(url,method,handler,parameterList) {

			if (win.XMLHttpRequest) {
				var xhr = new XMLHttpRequest(),
					isPost = (method == 'POST'),
					parameters = buildParameters(parameterList);

				xhr.open(method || 'GET',url + ((!isPost && parameters) ? '?' + parameters : ''),true);

				if (handler) {
					// setup response handler
					xhr.onreadystatechange = function() {

						if (xhr.readyState == 4) {
							var isOk = ((xhr.status >= 200) && (xhr.status < 300)),
								responseText = xhr.responseText;

							handler({
								ok: isOk,
								status: xhr.status,
								text: (isOk) ? responseText : '',
								JSON: (isOk) ? parseJSON(responseText) : {}
							});
						}
					};
				}

				if (isPost && parameters) {
					xhr.setRequestHeader('Content-type',REQUEST_HEADER_CONTENT_TYPE_POST);
				}

				// send request and return success
				xhr.send((isPost && parameters) ? parameters : undefined);
				return true;
			}
		};
	})();

	win.$ = picoh;
})(window,document);
