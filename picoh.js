(function(win,doc,picohAttach,undefined) {

	'use strict';

	var SPLIT_ON_SPACES_REGEXP = / +/,
		NEXT_TICK_MESSAGE_NAME = 'picoh-tick',
		REQUEST_ANIMATION_FRAME_FAUX_DELAY = 16,
		picoh = function(id) {

			return doc.getElementById(id);
		},

		// aliases for minification:
		// - document.documentElement,
		// - picoh.nextTick()
		// - picoh.Event.add()/remove()
		documentElement = doc.documentElement,
		nextTick,
		eventAdd,eventRemove,

		nextTickHandlerList = [],
		reqAnimFrameNative =
			win.requestAnimationFrame ||
			win.mozRequestAnimationFrame ||
			win.webkitRequestAnimationFrame,
		reqAnimFrameFauxLastTime = 0;

	// determine object to attach Picoh to - if undefined attached to window
	picohAttach = picohAttach || win;

	function splitOnSpaces(value) {

		return value.trim().split(SPLIT_ON_SPACES_REGEXP);
	}

	picoh.debounce = function(handler,delay) {

		var timeout,
			debounce = function() {

				if (timeout !== undefined) {
					clearTimeout(timeout);
				}

				timeout = setTimeout(handler,delay);
			};

		debounce.clear = function() {

			if (timeout !== undefined) {
				clearTimeout(timeout);
			}

			timeout = undefined;
		};

		return debounce;
	};

	picoh.each = function(collection,handler) {

		var index = 0;

		if (
			(Array.isArray(collection)) ||
			((collection.item !== undefined) && (collection.length !== undefined))
		) {
			// collection is array or HtmlCollection/NodeList (duck typing)
			for (var length = collection.length;index < length;index++) {
				// if handler returns false, bail early
				if (handler(collection[index],index) === false) {
					return;
				}
			}

		} else {
			// otherwise, collection is assumed an object
			var propertyList = Object.keys(collection);
			while (propertyList.length) {
				// if handler returns false, bail early
				if (handler(
					collection[propertyList[0]],
					propertyList.shift(), // remove item from property key list
					index++
				) === false) {
					return;
				}
			}
		}
	};

	picoh.nextTick = nextTick = function(handler) {

		// add handler to next tick stack and post message
		nextTickHandlerList.push(handler);
		win.postMessage(NEXT_TICK_MESSAGE_NAME,'*');
	};

	// setup nextTick() message handler function
	win.addEventListener(
		'message',
		function(event) {

			if ((event.source == win) && (event.data == NEXT_TICK_MESSAGE_NAME)) {
				// received tick
				event.stopPropagation();

				if (nextTickHandlerList.length) {
					// remove single handler from stack and call it
					nextTickHandlerList.shift()();
				}
			}
		},
		true // note: using capture here
	);

	picoh.reqAnimFrame = (reqAnimFrameNative !== undefined)
		? function(handler) { reqAnimFrameNative(handler); }
		: function(handler) {

			// note: can remove faux handler in place of all native once IE10 is base support level
			// faux window.requestAnimationFrame() method
			// call approximately every REQUEST_ANIMATION_FRAME_FAUX_DELAY milliseconds
			var currentTime = Date.now(),
				timeoutDelay = Math.max(0,REQUEST_ANIMATION_FRAME_FAUX_DELAY - (currentTime - reqAnimFrameFauxLastTime));

			setTimeout(handler,timeoutDelay);
			reqAnimFrameFauxLastTime = currentTime + timeoutDelay;
		};

	picoh.Event = function() {

		var method = {};

		method.add = eventAdd = function(obj,type,handler) {

			var typeList = splitOnSpaces(type);
			while (typeList.length) {
				obj.addEventListener(typeList.pop(),handler,false);
			}
		};

		method.remove = eventRemove = function(obj,type,handler) {

			var typeList = splitOnSpaces(type);
			while (typeList.length) {
				obj.removeEventListener(typeList.pop(),handler,false);
			}
		};

		method.getTarget = function(event) {

			var el = event.target;

			// defeat Safari browser bug (target element should not be a text node)
			return (el && (el.nodeType == 3)) ? el.parentNode : el;
		};

		method.isMouseEnterLeave = function(event,el) {

			var relEl = event.relatedTarget;
			return (relEl && !el.contains(relEl));
		};

		// getMousePosition() returns the mouse position relative to the document, not the browser viewport
		// note: event.pageX/event.pageY is mis-reported (behaves like event.clientX/event.clientY) with IE10 10.0.9200.16384, but fixed in 10.0.9200.16484 - http://bugs.jquery.com/ticket/12343
		method.getMousePosition = function(event) {

			// using Math.round() as IE10 (and other vendors may follow in future) can/will report fractional coordinates due to sub-pixel rendering
			// http://blogs.msdn.com/b/ie/archive/2012/02/17/sub-pixel-rendering-and-the-css-object-model.aspx
			return {
				x: Math.round(event.pageX || 0),
				y: Math.round(event.pageY || 0)
			};
		};

		return method;
	}();

	picoh.DOM = function() {

		var DOM_QUERY_CLASS_ONLY_REGEXP = /^(\.[^.#> ]+)+$/, // match sequences of [.classname01.classname02]
			DOM_QUERY_CLASS_ONLY_DOT_REPLACE_REGEXP = /\./g,
			DOM_CONTENT_LOADED_EVENT_NAME = 'DOMContentLoaded',
			method = {},
			DOMIsReady,
			DOMReadyHandlerList,
			hasClassRegExpCollection = {};

		// DOM querySelectorAll() method wrapper in global namespace
		picohAttach.$$ = function() {

			var queryArgIndex = (arguments.length - 1),
				rootEl = (queryArgIndex) ? arguments[0] : doc,
				query = arguments[queryArgIndex],
				elHTMLCollection = (DOM_QUERY_CLASS_ONLY_REGEXP.test(query))
					? rootEl.getElementsByClassName(query.replace(DOM_QUERY_CLASS_ONLY_DOT_REPLACE_REGEXP,' ').trim())
					: rootEl.querySelectorAll(query);

			// convert HTMLCollection to array
			return Array.prototype.slice.call(elHTMLCollection);
		};

		// DOM ready handler
		method.ready = function(handler) {

			// if DOM ready, call handler right away
			// note: document.readyState property - https://developer.mozilla.org/en/docs/Web/API/Document/readyState
			if (DOMIsReady || (doc.readyState == 'complete')) {
				DOMIsReady = true;
				return nextTick(handler);
			}

			if (DOMReadyHandlerList === undefined) {
				// init DOM ready event handlers
				DOMReadyHandlerList = [];

				// window.load required as fallback because if:
				// - Picoh successfully loaded after 'DOMContentLoaded' fired
				// - ...but before (doc.readyState == 'complete')
				// - handlers would be pushed onto DOMReadyHandlerList - but never get actioned
				eventAdd(doc,DOM_CONTENT_LOADED_EVENT_NAME,DOMReadyHandler);
				eventAdd(win,'load',DOMReadyHandler);
			}

			// add handler to stack
			DOMReadyHandlerList.push(handler);
		};

		function DOMReadyHandler() {

			// detach events and process handler stack
			DOMIsReady = true;
			eventRemove(doc,DOM_CONTENT_LOADED_EVENT_NAME,DOMReadyHandler);
			eventRemove(win,'load',DOMReadyHandler);

			while (DOMReadyHandlerList.length) {
				DOMReadyHandlerList.shift()();
			}
		}

		method.create = function(name,attributeList,childElList) {

			var createEl = doc.createElement(name);

			if (attributeList) {
				var propertyList = Object.keys(attributeList);

				while (propertyList.length) {
					createEl[propertyList[0]] = attributeList[propertyList.shift()];
				}
			}

			if (childElList) {
				for (var index = 0,length = childElList.length;index < length;index++) {
					var childEl = childElList[index];
					createEl.appendChild(
						(typeof childEl == 'string')
							? doc.createTextNode(childEl)
							: childEl
					);
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

			// return removed el
			return el.parentNode.removeChild(el);
		};

		method.removeChildAll = function(el) {

			var removedElList = [];
			while (el.firstChild) {
				removedElList.push(el.firstChild);
				el.removeChild(el.firstChild);
			}

			return removedElList;
		};

		method.hasClass = function(el,name) {

			return (
				(hasClassRegExpCollection[name])
					? hasClassRegExpCollection[name]
					: hasClassRegExpCollection[name] = RegExp('(^| )' + name + '( |$)')
			).test(el.className);
		};

		// note: can remove addClass()/removeClass() methods using el.classList.add()/remove() instead once IE10 is base support level
		method.addClass = function(el,name) {

			// merge current and to be added class names into a single list
			var addClassNameList = splitOnSpaces(el.className).concat(splitOnSpaces(name)),
				updateClassNameList = [];

			while (addClassNameList.length) {
				// add class only if not already part of the update class name list
				var addClassName = addClassNameList.shift();
				if (updateClassNameList.indexOf(addClassName) < 0) {
					updateClassNameList.push(addClassName);
				}
			}

			el.className = updateClassNameList.join(' ');
		};

		method.removeClass = function(el,name) {

			var currentClassNameList = splitOnSpaces(el.className),
				removeClassNameList = splitOnSpaces(name),
				updateClassNameList = [];

			while (currentClassNameList.length) {
				// keep class only if not found in updateClassNameList already (de-dupe) or removeClassNameList
				var currentClassname = currentClassNameList.shift();

				if (
					(updateClassNameList.indexOf(currentClassname) < 0) &&
					(removeClassNameList.indexOf(currentClassname) < 0)
				) {
					updateClassNameList.push(currentClassname);
				}
			}

			el.className = updateClassNameList.join(' ');
		};

		method.setStyle = function(el,styleList) {

			var propertyList = Object.keys(styleList);

			while (propertyList.length) {
				el.style[propertyList[0]] = styleList[propertyList.shift()];
			}
		};

		method.getData = function(el,key) {

			// emulates what el.dataset can offer in IE11+
			// note: using el.hasAttribute() check due to this - https://developer.mozilla.org/en-US/docs/Web/API/Element.getAttribute#Notes
			key = 'data-' + key;
			return (el && el.hasAttribute(key))
				? el.getAttribute(key)
				: null;
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

		method.getPageScroll = function() {

			return {
				x: win.pageXOffset || 0,
				y: win.pageYOffset || 0
			};
		};

		method.getViewportSize = function() {

			return {
				width: documentElement.clientWidth || win.innerWidth || 0,
				height: win.innerHeight || documentElement.clientHeight || 0
			}
		};

		method.getDocumentSize = function() {

			return {
				width: Math.max(
					documentElement.clientWidth,
					documentElement.offsetWidth,
					documentElement.scrollWidth
				),
				height: Math.max(
					documentElement.clientHeight,
					documentElement.offsetHeight,
					documentElement.scrollHeight
				)
			};
		};

		method.Anim = function() {

			var ELEMENT_HANDLER_ID_ATTRIBUTE = 'picohCSSAnimID',
				CLASS_NAME_ANIM_ACTIVE = 'cssanimactive',
				HANDLER_TYPE_INDEX_ANIMATION = 0,
				HANDLER_TYPE_INDEX_TRANSITION = 1,
				HANDLER_ID_LENGTH = 3,
				HANDLER_ID_START_CHAR = 97, // character 'a'
				HANDLER_ID_END_CHAR = 122, // character 'z'
				method = {},
				isDetected,
				animationEventTypeEnd,
				transitionEventTypeEnd,
				handlerCollection = [undefined,undefined];

			function detectCapabilities() {

				// if already detected support then exit
				if (isDetected) {
					return;
				}

				isDetected = true;

				// list of animation/transition style properties per browser engine and matching event names
				// note: non-prefixed properties are intentionally checked first
				var ANIMATION_DETECT_COLLECTION = {
						animation: 'animationend',
						webkitAnimation: 'webkitAnimationEnd'
					},
					TRANSITION_DETECT_COLLECTION = {
						transition: 'transitionend',
						webkitTransition: 'webkitTransitionEnd'
					};

				function detectEventType(detectCollection) {

					var styleNameList = Object.keys(detectCollection);

					while (styleNameList.length) {
						var styleNameItem = styleNameList.shift()
						if (documentElement.style[styleNameItem] !== undefined) {
							// found capability
							return detectCollection[styleNameItem];
						}
					}

					// no match
				}

				// determine if animation and transition support available
				animationEventTypeEnd = detectEventType(ANIMATION_DETECT_COLLECTION);
				transitionEventTypeEnd = detectEventType(TRANSITION_DETECT_COLLECTION);
			}

			function getElHandlerCollectionID(handlerTypeIndex,el) {

				// look for ID as a custom property of the DOM element
				var handlerID = el[ELEMENT_HANDLER_ID_ATTRIBUTE];

				return (
					(handlerID !== undefined) &&
					(handlerCollection[handlerTypeIndex][handlerID] !== undefined)
				)
					// found handler ID in collection
					? handlerID
					// not found
					: false;
			}

			function removeElHandlerItem(handlerTypeIndex,el,handlerID) {

				// if handlerID already given, no need to find again for element
				handlerID = handlerID || getElHandlerCollectionID(handlerTypeIndex,el);

				if (handlerID !== false) {
					// found element in collection, now remove
					delete handlerCollection[handlerTypeIndex][handlerID];
					delete el[ELEMENT_HANDLER_ID_ATTRIBUTE];

					el.className = (
						(' ' + el.className + ' ').
						replace(' ' + CLASS_NAME_ANIM_ACTIVE + ' ',' ')
					).trim();
				}
			}

			function onEndProcess(eventTypeEnd,handlerTypeIndex,el,handler,data) {

				if (!eventTypeEnd) {
					// no animation/transition support - call handler right away
					return nextTick(function() { handler(el,data); });
				}

				if (!handlerCollection[handlerTypeIndex]) {
					// setup end handler
					handlerCollection[handlerTypeIndex] = {};
					eventAdd(documentElement,eventTypeEnd,function(event) {

						// ensure event returned a target element
						if (event.target) {
							// get the element handler list ID - skip over if not found
							var targetEl = event.target,
								handlerID = getElHandlerCollectionID(handlerTypeIndex,targetEl);

							if (handlerID !== false) {
								// execute handler then remove from handler list
								var handlerItem = handlerCollection[handlerTypeIndex][handlerID];
								removeElHandlerItem(handlerTypeIndex,targetEl,handlerID);
								handlerItem[0](targetEl,handlerItem[1]);
							}
						}
					});
				}

				// remove possible existing end handler associated to element
				removeElHandlerItem(handlerTypeIndex,el);

				// generate new, unique handler ID
				var handlerID;
				while (!handlerID || handlerCollection[handlerTypeIndex][handlerID]) {
					handlerID = '';
					while (handlerID.length < HANDLER_ID_LENGTH) {
						// append characters between [a-z] to a total of HANDLER_ID_LENGTH
						handlerID += String.fromCharCode(
							Math.floor(Math.random() * (HANDLER_ID_END_CHAR - HANDLER_ID_START_CHAR)) +
							HANDLER_ID_START_CHAR
						);
					}
				}

				// add element to handler list and a 'animation active' class identifier to the target element
				el[ELEMENT_HANDLER_ID_ATTRIBUTE] = handlerID;
				handlerCollection[handlerTypeIndex][handlerID] = [handler,data];
				el.className = el.className.trim() + ' ' + CLASS_NAME_ANIM_ACTIVE;
			}

			method.onAnimationEnd = function(el,handler,data) {

				detectCapabilities();

				onEndProcess(
					animationEventTypeEnd,
					HANDLER_TYPE_INDEX_ANIMATION,
					el,handler,data
				);
			};

			method.cancelAnimationEnd = function(el) {

				removeElHandlerItem(HANDLER_TYPE_INDEX_ANIMATION,el);
			};

			method.onTransitionEnd = function(el,handler,data) {

				detectCapabilities();

				onEndProcess(
					transitionEventTypeEnd,
					HANDLER_TYPE_INDEX_TRANSITION,
					el,handler,data
				);
			};

			method.cancelTransitionEnd = function(el) {

				removeElHandlerItem(HANDLER_TYPE_INDEX_TRANSITION,el);
			};

			return method;
		}();

		// if found, remove the 'nojs' class from the <html> element and add 'js'
		documentElement.className = documentElement.className.replace('nojs','js');

		return method;
	}();

	picoh.request = (function() {

		var REQUEST_HEADER_CONTENT_TYPE_POST = 'application/x-www-form-urlencoded';

		function buildParameters(parameterCollection) {

			if (parameterCollection) {
				var propertyList = Object.keys(parameterCollection),
					URIItemList = [];

				while (propertyList.length) {
					URIItemList.push(
						propertyList[0] + '=' +
						encodeURIComponent(parameterCollection[propertyList.shift()])
					);
				}

				// return joined parameters
				return URIItemList.join('&');
			}
		}

		function parseJSON(responseText) {

			var JSONdata = {};

			if (win.JSON) {
				// if text starts/ends with '{' and '}' then assume it's JSON data
				responseText = responseText.trim();

				if ((
					(responseText[0] || '') +
					(responseText[responseText.length - 1] || '')
				) == '{}') {
					// attempt to parse
					try {
						JSONdata = JSON.parse(responseText);
					} catch(e) {}
				}
			}

			return JSONdata;
		}

		return function(url,method,handler,parameterCollection) {

			var xhr = new XMLHttpRequest(),
				isPost = (method == 'POST'),
				parameters = buildParameters(parameterCollection);

			xhr.open(
				method || 'GET',
				url + ((!isPost && parameters) ? '?' + parameters : ''),
				true
			);

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

			// send request
			xhr.send((isPost && parameters) ? parameters : undefined);
		};
	})();


	// expose library
	picohAttach.$ = picoh;
})(window,document);
