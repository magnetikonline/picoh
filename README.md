# Picoh
Picoh is my take on the JavaScript frontend micro framework, providing event handling, DOM querying/manipulation, XMLHTTP requests and a handful of utility methods.

The focus is on a lean code footprint - minified and gzipped everything weighs in around **2.3KB**.

All methods are namespaced under `window.$` / `window.$$` with no modification of *any* object prototypes.

## What's supported?
- Picoh takes advantage of core methods available in more modern browsers (such as `document.querySelectorAll()`) avoiding heavy polyfills to keep the code footprint small.
- Designed for and tested against the usual suspects of Google Chrome, Firefox and OSX Safari. On the Microsoft front **IE9 and above** is supported.
	- The final revision supporting IE8 is [tagged here](https://github.com/magnetikonline/picoh/tree/ie8-final).
- Expects:
	- A `!DOCTYPE` that puts your pages into *standards mode*, with the [HTML5 doctype](https://w3c.github.io/html/syntax.html#the-doctype) a good selection. More a requirement for full IE compatibility (historically an IE8 gripe), where some core methods used by Picoh [won't make themselves available](https://caniuse.com/#feat=json) in 'quirks mode'. You *can* work around such edge cases, but the result is increased code footprint - exactly what I'm trying to avoid here.
	- Picoh loaded ideally from page `<head>` and executed asynchronously (e.g. `<script async src="/uri/to/picoh.js"></script>`).
	- Removal of both `margin` and `padding` from the `<body>` element to help cross browser consistency with some DOM methods, such as calculating [viewport](#domgetviewportsize) and [document](#domgetdocumentsize) sizes.

## Methods
- [General](#general)
	- [$(id)](#id)
	- [$.debounce(handler,delay)](#debouncehandlerdelay)
	- [$.each(collection,handler)](#eachcollectionhandler)
	- [$.nextTick(handler)](#nexttickhandler)
	- [$.reqAnimFrame(handler)](#reqanimframehandler)
- [Events](#events)
	- [$.Event.add(object,type,handler)](#eventaddobjecttypehandler)
	- [$.Event.remove(object,type,handler)](#eventremoveobjecttypehandler)
	- [$.Event.getTarget(event)](#eventgettargetevent)
	- [$.Event.isMouseEnterLeave(event,element)](#eventismouseenterleaveeventelement)
	- [$.Event.getMousePosition(event)](#eventgetmousepositionevent)
- [DOM](#dom)
	- [$$(query) / $$(element,query)](#query--elementquery)
	- [$.DOM.ready(handler)](#domreadyhandler)
	- [$.DOM.create(name[,attributeList][,childElementList])](#domcreatenameattributelistchildelementlist)
	- [$.DOM.insertBefore(element,referenceElement)](#dominsertbeforeelementreferenceelement)
	- [$.DOM.insertAfter(element,referenceElement)](#dominsertafterelementreferenceelement)
	- [$.DOM.replace(element,oldElement)](#domreplaceelementoldelement)
	- [$.DOM.remove(element)](#domremoveelement)
	- [$.DOM.removeChildAll(element)](#domremovechildallelement)
	- [$.DOM.hasClass(element,name)](#domhasclasselementname)
	- [$.DOM.addClass(element,name)](#domaddclasselementname)
	- [$.DOM.removeClass(element,name)](#domremoveclasselementname)
	- [$.DOM.setStyle(element,styleList)](#domsetstyleelementstylelist)
	- [$.DOM.getData(element,key)](#domgetdataelementkey)
	- [$.DOM.getOffset(element[,toParent])](#domgetoffsetelementtoparent)
	- [$.DOM.getPageScroll()](#domgetpagescroll)
	- [$.DOM.getViewportSize()](#domgetviewportsize)
	- [$.DOM.getDocumentSize()](#domgetdocumentsize)
- [Animation/transition end DOM events](#animationtransition-end-dom-events)
	- [$.DOM.Anim.onAnimationEnd(element,handler[,data])](#domanimonanimationendelementhandlerdata)
	- [$.DOM.Anim.cancelAnimationEnd(element)](#domanimcancelanimationendelement)
	- [$.DOM.Anim.onTransitionEnd(element,handler[,data])](#domanimontransitionendelementhandlerdata)
	- [$.DOM.Anim.cancelTransitionEnd(element)](#domanimcanceltransitionendelement)
- [XMLHTTP](#xmlhttp)
	- [$.request(url[,method][,handler][,parameterCollection])](#requesturlmethodhandlerparametercollection)
- [Miscellaneous](#miscellaneous)
	- [*Has JavaScript?* CSS class hook](#has-javascript-css-class-hook)
	- [Attachment of Picoh to alternative object](#attachment-of-picoh-to-alternative-object)

### General

#### $(id)
Returns a single DOM element from the `id` given. Just a wrapper around `document.getElementByID()` we all know and love.

#### $.debounce(handler,delay)
- Wraps the given `handler` in a debounce routine that will be called only after `delay` milliseconds have elapsed since last call to the routine was made.
- A `clear()` method allows for the reset of the current debounce timeout in progress.

Example:

```js
function callMe() {

	console.log('Called');
}

var debounceMe = $.debounce(callMe,500);

// log message will only display once, though debounceMe() is called three times
debounceMe();
debounceMe();
debounceMe();

// to clear a current debounce timeout
//debounceMe.clear();
```

#### $.each(collection,handler)
- Iterate over the given `collection`, calling `handler` for each item.
- Collection can be of type `array`, `HtmlCollection`, `NodeList` or `object`.
- `handler` passed arguments of `value` and `index` for types `array`, `HtmlCollection` and `NodeList`.
- `handler` passed arguments of `value`, `key` name and `iteration` count for type `object`.
- Returning `false` from `handler` will halt the iteration immediately.

Example:

```js
function handlerArray(value,index) {

	console.log([value,index].join(' - '));
}

$.each(
	[1,2,3,4],
	handlerArray
);

function handlerObject(value,key,iteration) {

	console.log([value,key,iteration].join(' - '));

	if (key == 'key3') {
		// exit right away
		return false;
	}
}

$.each(
	{ key1: 'value1',key2: 'value2',key3: 'value3',key4: 'value4' },
	handlerObject
);
```

**Note:** For evaluating `HTMLCollection`/`NodeList` types, `$.each()` uses [Duck typing](https://en.wikipedia.org/wiki/Duck_typing), looking for `item` and `length` properties.

#### $.nextTick(handler)
- Emulation of Node.js [`process.nextTick()`](https://nodejs.org/api/process.html#process_process_nexttick_callback_args) method.
- Produces a faster and [more efficient](https://dbaron.org/log/20100309-faster-timeouts) callback on the next event loop vs. `window.setTimeout(function() {},0)`.
- Implemented using `window.postMessage()` under the hood.

#### $.reqAnimFrame(handler)
- Wrapper for `window.requestAnimationFrame`, a more efficient method of processing animation frames versus traditional `window.setTimeout()` use.
- Handles cross browser API prefixing between browser vendors.
- A fallback `window.setTimeout()` polyfill is provided for unsupported browsers which will be called approximately once every 16ms to give a *close to* 60fps fire rate.

### Events

#### $.Event.add(object,type,handler)
- Attach an event `handler` to the given `object` of the given `type`.
- Event `type` can be given as a space separated list for attaching multiple events to a single `object`.

Example:

```js
function clickTouchHandler(event) {

	console.log('Clicked or touched!');
	console.log(this);
	console.log(event);
}

$.Event.add($('domelement'),'click touchstart',clickTouchHandler);
```

#### $.Event.remove(object,type,handler)
- Remove an event `handler` from the given `object` of the given `type`.
- Event `type` can be given as a space separated list for removing multiple events from a single `object`.

#### $.Event.getTarget(event)
- Returns the DOM element that the given `event` was dispatched on.
- Handles the edge case with older versions of Safari where a [text node would be incorrectly returned](https://bugs.jquery.com/ticket/5539).

#### $.Event.isMouseEnterLeave(event,element)
Emulates behavior of the mighty handy and IE only (**note:** Chrome 30+ and Firefox 10+ also natively support) event types of [mouseenter](https://developer.mozilla.org/en-US/docs/Web/Events/mouseenter) and [mouseleave](https://developer.mozilla.org/en-US/docs/Web/Events/mouseleave).

Example:

```html
<div id="watchme">
	<span>Child element</span>
	<span>Another child element</span>
</div>
```

```js
function mouseEnterHandler(event) {

	if ($.Event.isMouseEnterLeave(event,this)) {
		console.log('mouseenter!');
	}
}

function mouseLeaveHandler(event) {

	if ($.Event.isMouseEnterLeave(event,this)) {
		console.log('mouseleave!');
	}
}

var watchMeEl = $('watchme');
$.Event.add(watchMeEl,'mouseover',mouseEnterHandler);
$.Event.add(watchMeEl,'mouseout',mouseLeaveHandler);
```

With above example messages will only log messages when mouse pointer *enters* or *leaves* `<div id="watchme">`, ignoring all mouseover/mouseout child events fired from `<span>` elements.

#### $.Event.getMousePosition(event)
- Returns the current mouse x/y pixel coordinates from the given `event`.
- Data will be returned as an object with the structure of `{ x: 123,y: 456 }`.
- **Note:** At time of writing IE10 (and possibly other browser vendors going forward) can/will return mouse coordinates with a sub-pixel resolution, `getMousePosition()` will round down to whole pixel units.

### DOM

#### $$(query) / $$(element,query)
- A wrapper for [`querySelectorAll()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll), returning DOM elements for the given CSS `query`.
- In the first form the query will be based from `document` (entire page), otherwise in the second form from the given `element`.
- In the instance `query` is matching elements containing one or more classes _only_ (e.g. `.apple.orange.banana`) the function will use [`getElementsByClassName()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByClassName) in place of `querySelectorAll()` for query speed advantage.
- Returned DOM elements will be provided as an array, rather than a `NodeList`.
- **Note:** `querySelectorAll()` will only support queries based upon the browsers CSS implementation and it's capabilities.

#### $.DOM.ready(handler)
- Will call the given `handler` upon firing of the `document.DOMContentLoaded` event.
- Can be called with multiple `handler` functions, each of which be called in turn at the point of DOM load completion.
- If called *after* DOM has already loaded, the given `handler` will execute immediately via [$.nextTick(handler)](#nexttickhandler).

#### $.DOM.create(name[,attributeList][,childElementList])
- Creates a new DOM element with the given node `name`.
- Optional attributes given as a key/value object `attributeList`.
	- Keys are to be given as DOM element properties (e.g. `class="myclass"` as `{ className: 'myclass' }`.
- Optional child DOM elements automatically appended given as an array `childElementList`.
	- Child elements of type `string` will be appended as a new `TextNode`.

Example:

```js
var myCreatedDOMEl = $.DOM.create(
	'div',{ className: 'myclass' },
	[
		$.DOM.create('span',false,['My span text']),
		$.DOM.create('a',{ href: '/link/to/item' },['Click me']),
		'Another line of text'
	]
);

// append the following tag structure to end of the document
/*
<div class="myclass">
	<span>My span text</span>
	<a href="/link/to/item">Click me</a>
	Another line of text
</div>
*/

document.documentElement.appendChild(myCreatedDOMEl);
```

#### $.DOM.insertBefore(element,referenceElement)
Insert the given `element` before `referenceElement` within the current document.

#### $.DOM.insertAfter(element,referenceElement)
Insert the given `element` after `referenceElement` within the current document.

#### $.DOM.replace(element,oldElement)
Replace the given `oldElement` within the current document with `element`. Returns `oldElement`.

#### $.DOM.remove(element)
Remove the given `element` from the DOM, returning `element`.

#### $.DOM.removeChildAll(element)
Remove all child DOM elements from the given `element`, returning an array of removed elements.

#### $.DOM.hasClass(element,name)
Returns `true` if `element` has the given CSS class `name` assigned, otherwise return `false`.

#### $.DOM.addClass(element,name)
- Add one or more CSS classes of the given `name` to `element` - providing multiple CSS class names space separated.
- CSS classes already present on `element` will be silently ignored.

#### $.DOM.removeClass(element,name)
- Remove one or more CSS classes of the given `name` from `element`.
- Provide multiple CSS class names for removal space separated.

#### $.DOM.setStyle(element,styleList)
- Set the given inline CSS `styleList` (as a key/value object) to `element`. Essentially an easier way to set multiple inline element style attributes at once.
- Internally uses a simplistic `element.style.[styleKey] = value` assignment, therefore `styleList` key(s) must be given using camel cased style names (e.g. `backgroundColor`).

Example:

```js
var myCreatedDOMEl = $.DOM.create('div',false,['Content']);
$.DOM.setStyle(
	myCreatedDOMEl,
	{
		backgroundColor: '#f00',
		left: '10px',
		position: 'absolute',
		top: '40px'
	}
);

// myCreatedDOMEl contains
/*
<div style="background-color:#f00;left:10px;position:absolute;top:40px">
	Content
</div>
*/
```

#### $.DOM.getData(element,key)
- Returns the value of the [HTML5 data attribute](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Using_data_attributes) `key` associated to `element`.
- If the given `key` does not exist returns `null`.

#### $.DOM.getOffset(element[,toParent])
- Returns the left/top pixel offset of the given `element` to either the top left corner of the document, or if `toParent` is `true` - to the element's parent.
- Data will be returned as an object with the structure of `{ left: 123,top: 456 }`.

#### $.DOM.getPageScroll()
- Returns the x/y pixel scroll offset from the top left corner of the document.
- Data will be returned as an object with the structure of `{ x: 123,y: 456 }`.

#### $.DOM.getViewportSize()
- Returns the pixel width and height of the browser viewport.
- Data will be returned as an object with the structure of `{ width: 123,height: 456 }`.

#### $.DOM.getDocumentSize()
- Returns the pixel width and height of the document.
- Data will be returned as an object with the structure of `{ width: 123,height: 456 }`.
- Uses the techniques suggested by [Ryan Van Etten](https://ryanve.com/lab/dimensions/#document).

### Animation/transition end DOM events
For the background behind these methods and their use, refer to the [cssanimevent](https://github.com/magnetikonline/cssanimevent) library. The following methods have been integrated here.

#### $.DOM.Anim.onAnimationEnd(element,handler[,data])
- Calls the given `handler` upon completion of a [CSS3 animation](https://developer.mozilla.org/en/docs/Web/CSS/animation) applied to `element`. Lifetime of the handler is *one* animation end event.
- For browsers that do not support CSS3 animations, `handler` will be called instantaneously.
- Handler will be passed arguments of `element` and optional `data`.

#### $.DOM.Anim.cancelAnimationEnd(element)
Cancel a pending handler assigned to `element` by a previous call to `$.DOM.Anim.onAnimationEnd()`.

#### $.DOM.Anim.onTransitionEnd(element,handler[,data])
Identical in functionality to `$.DOM.Anim.onAnimationEnd()`, but for [CSS3 transitions](https://developer.mozilla.org/en/docs/Web/CSS/transition).

#### $.DOM.Anim.cancelTransitionEnd(element)
Identical in functionality to `$.DOM.Anim.cancelAnimationEnd()`, but for CSS3 transitions.

### XMLHTTP

#### $.request(url[,method][,handler][,parameterCollection])
- Execute a `XMLHttpRequest()` call to the given `url`, returning `true` if the call was successful made by the browser (e.g. supports `XMLHttpRequest()`).
- The `method` can be one of `GET` or `POST`, with `false`/`undefined` defaulting to `GET`.
- Optional `handler` will be executed at completion of the URL call (success or fail). Handler will be passed a single parameter of the return status/response as an object with the following keys:
	- `ok:` Set `true` if the call returned successfully, otherwise `false`.
	- `status:` Numeric HTTP status code returned.
	- `text:` The response body as a string upon success, otherwise empty string.
	- `JSON:` If response body is JSON data and could be successfully parsed, will contain a JavaScript object of this data, otherwise an empty object.
- Optional `parameterCollection` given as key/value pairs with be passed either:
	- On the query string with HTTP `GET`.
	- Form data of content type `application/x-www-form-urlencoded` with HTTP `POST`.

Example:

```js
function myHandler(data) {

	if (data.ok) {
		console.log('HTTP status: ' + data.status);
		console.log('Response text: ' + data.text);
		console.dir(data.JSON);

	} else {
		// handle error
	}
}

// make a POST request to /xmlhttp/endpoint with parameters "key1=value,key2=value"
$.request(
	'/xmlhttp/endpoint',
	'POST',
	myHandler,
	{
		key1: 'value',
		key2: 'value'
	}
);
```

### Miscellaneous

#### *Has JavaScript?* CSS class hook
- Placing a class attribute of `<html class="nojs">` on a document's `<html>` element will be automatically replaced with `<html class="js">` upon load of Picoh.
- Used as a CSS styling hook for no/has JavaScript scenarios.

#### Attachment of Picoh to alternative object
- By default Picoh is attached to the global `window` object, providing access to it's methods via `window.$` and `window.$$()` respectively, or simply `$` and `$$()`.
- Alternatively, Picoh can be attached to an isolated object to avoid namespace clashes, by modification of the library's [IIFE](https://en.wikipedia.org/wiki/Immediately-invoked_function_expression) arguments.

Example:

```js
var attachHere = {};

// start of Picoh
(function(win,doc,picohAttach,undefined) {

	// SNIP
})(window,document,attachHere);
```

Picoh will be accessible at `attachHere.$`/`attachHere.$$()`.
