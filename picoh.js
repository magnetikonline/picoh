(function(win,doc,undefined) {

	'use strict';

	var TRIM_REGEXP = /^\s+|\s+$/g,
		picoh = function(id) {

			return doc.getElementById(id);
		},

		// picoh.trim(),picoh.Event.add()/remove()/getRelatedTarget(),picoh.DOM.hasClass()/setOpacity()/getPageScroll() aliases for minification
		docEl = doc.documentElement,
		trimString,
		eventAdd,eventRemove,getRelatedTarget,
		hasClass,setOpacity,getPageScroll,

		// if (realEventModel == false) then Internet Explorer < 9 event model used
		realEventModel = !!win.addEventListener;

	picoh.debounce = function(handler,delay) {

		var timeout,
			debounce = function() {

				if (timeout !== undefined) clearTimeout(timeout);
				timeout = setTimeout(handler,delay);
			};

		debounce.clear = function() {

			if (timeout !== undefined) clearTimeout(timeout);
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
			// collection is an array or DOM HtmlCollection/NodeList (duck typing)
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

			return !el.contains(getRelatedTarget(event));
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

				// convert nodeList to an array
				for (var index = 0,length = nodeList.length;index < length;index++) {
					elList.push(nodeList[index]);
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
									// call to docEl.doScroll() failed, lets try again after delay
									return setTimeout(doScrollCheck,IE_DOM_SCROLL_CHECK_DELAY);
								}

								// docEl.doScroll() success, DOM is now ready
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

		method.hasClass = hasClass = function(el,name,className) {

			if (className === undefined) className = el.className;

			return (
				(hasClassRegExpCollection[name])
					? hasClassRegExpCollection[name]
					: hasClassRegExpCollection[name] = RegExp('(^| )' + name + '( |$)')
			).test(className);
		};

		method.addClass = function(el,name) {

			var classNameList = name.split(' '),
				newClassName = el.className;

			while (classNameList.length) {
				var className = classNameList.pop();
				if (!hasClass(undefined,className,newClassName)) newClassName += ' ' + className;
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

		method.getData = function(el,key) {

			return el.getAttribute('data-' + key);
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

		method.getPageScroll = getPageScroll = (win.pageXOffset !== undefined)
			? function() {

				return {
					x: win.pageXOffset,
					y: win.pageYOffset
				};
			}
			: function() {

				// Internet Explorer < 9
				return {
					x: docEl.scrollLeft || 0,
					y: docEl.scrollTop || 0
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

			var CLASS_NAME_ANIM_ACTIVE = ' cssanimactive',
				IS_OPERA_EVENT_TYPE_REGEXP = /^o[AT]/,
				HANDLER_LIST_INDEX_ANIMATION = 0,
				HANDLER_LIST_INDEX_TRANSITION = 1,
				method = {},
				isDetected,
				animationSupport,
				animationEventTypeEnd,
				transitionSupport,
				transitionEventTypeEnd,
				handlerList = [undefined,undefined];

			function detect() {

				// if already detected support then exit
				if (isDetected) return;
				isDetected = true;

				// list of animation/transition style properties per browser engine and matching DOM event names
				// the non-prefixed properties are intentionally checked first
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

			function getElHandlerListIndex(handlerIndex,el) {

				var seekList = handlerList[handlerIndex];
				if (seekList !== undefined) {
					for (var index = seekList.length - 1;index >= 0;index--) {
						if (seekList[index][0] == el) {
							// found element in handler list
							return index;
						}
					}
				}

				// not found
				return false;
			}

			function removeElHandlerItem(handlerIndex,el,index) {

				// if index to remove has been given, don't call getElHandlerListIndex()
				if (index === undefined) index = getElHandlerListIndex(handlerIndex,el);

				if (index !== false) {
					// found element in list, remove from handler list array
					handlerList[handlerIndex].splice(index,1);

					// drop the 'animation active' class from element
					el.className = trimString(
						(' ' + el.className + ' ').
						replace(CLASS_NAME_ANIM_ACTIVE + ' ',' ')
					);
				}
			}

			function onEndProcess(hasSupport,eventTypeEnd,handlerIndex,el,handler,data) {

				if (!hasSupport) {
					// no CSS animation/transition support, call handler right away
					setTimeout(function() { handler(el,data); });

				} else {
					if (!handlerList[handlerIndex]) {
						// setup end handler
						handlerList[handlerIndex] = [];
						addDocElEvent(eventTypeEnd,function(event) {

							// ensure event returned the target element
							if (!event || !event.target) return;

							// get the element handler list index - skip over event if not found
							var targetEl = event.target,
								index = getElHandlerListIndex(handlerIndex,targetEl);

							if (index !== false) {
								// execute handler then remove from handler list
								var handlerItem = handlerList[handlerIndex][index];
								removeElHandlerItem(handlerIndex,targetEl,index);
								handlerItem[1](targetEl,handlerItem[2]);
							}
						});
					}

					// remove (possible) existing end handler
					removeElHandlerItem(handlerIndex,el);

					// add element to handler list and a 'animation active' class identifier
					handlerList[handlerIndex].push([el,handler,data]);
					el.className = trimString(el.className + CLASS_NAME_ANIM_ACTIVE);
				}
			}

			method.onAnimationEnd = function(el,handler,data) {

				detect();
				onEndProcess(
					animationSupport,animationEventTypeEnd,
					HANDLER_LIST_INDEX_ANIMATION,
					el,handler,data
				);
			};

			method.cancelAnimationEnd = function(el) {

				removeElHandlerItem(HANDLER_LIST_INDEX_ANIMATION,el);
			};

			method.onTransitionEnd = function(el,handler,data) {

				detect();
				onEndProcess(
					transitionSupport,transitionEventTypeEnd,
					HANDLER_LIST_INDEX_TRANSITION,
					el,handler,data
				);
			};

			method.cancelTransitionEnd = function(el) {

				removeElHandlerItem(HANDLER_LIST_INDEX_TRANSITION,el);
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
