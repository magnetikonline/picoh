# picoh.js
Picoh is my take on the JavaScript frontend micro framework, providing event handling, DOM querying/manipulation, XMLHTTP requests and a handful of utility methods.

The focus is on a lean code footprint - minified and gzipped everything weighs in at around the **2.5KB** mark. This will further drop once global usage of IE8 drops to a level where public opinion says support is no longer required.

All methods are namespaced under `window.$` / `window.$$` with no messing of *any* object prototypes.

## What's supported?
- Picoh takes advantage of several core methods available in more modern browsers (such as `document.querySelectorAll()`) avoiding heavy/slow polyfills to keep the code footprint small.
- Designed for and tested against the usual suspects of Google Chrome, Firefox, Safari and Opera (Presto). On the Microsoft front IE8 and above is supported.
- Expecting a `!DOCTYPE` that puts your pages into *standards mode*, with the [HTML5 doctype](http://www.w3.org/html/wg/drafts/html/master/syntax.html#the-doctype) a good selection. More a requirement for full IE8 compatibility, where some core methods used by Picoh [won't make themselves available](http://caniuse.com/json) in quirks mode. You could work around such edge cases, but the result is increased code footprint - exactly what I'm trying to avoid here.
- Finally it's a smart idea to zero out both `margin` and `padding` from the `<body>` element to help with cross browser consistency with some of the DOM methods, such as calculating [viewport](#domgetviewportsize) and [document](#domgetdocumentsize) sizes.

## Methods
- [General](#general)
- [Events](#events)
- [DOM](#dom)
- [Animation/transition end DOM events](#animationtransition-end-dom-events)
- [XMLHTTP](#xmlhttp)

### General

#### $(id)
Returns a single DOM element from the `id` given. Just a wrapper around the `document.getElementByID()` we all know and love.

#### $.debounce(handler,delay)
- Wraps the given `handler` in a debounce routine that will be called only after `delay` milliseconds have elapsed since last call to the routine was made.
- A `clear()` method allows for the reset of the current debounce timeout in progress.

Example usage:

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
- Handler passed parameters of item value and numeric index for collection types `array`, `HtmlCollection` and `NodeList`.
- Handler passed parameters of item value, key name and iteration count for collection type `object`.
- Returning `false` from the handler will short-circuit the `$.each()` loop immediately.

Example usage:

```js
var myArray = [1,2,3,4];
function handlerArray(value,index) {

	console.log(value + ' - ' + index);
}

$.each(myArray,handlerArray);

var myObject = { 'key1': 'value1','key2': 'value2','key3': 'value3','key4': 'value4' };
function myHandler(value,key,iteration) {

	console.log(value + ' - ' + key + ' - ' + iteration);

	if (key == 'key3') {
		// exit right away
		return false;
	}
}

$.each(myObject,myHandler);
```

**Note:** For evaluating `HTMLCollection`/`NodeList` collections, `$.each()` uses [Duck typing](http://en.wikipedia.org/wiki/Duck_typing), looking for `.item` and `.length` keys which should (hopefully) be reliable enough.

#### $.trim(string)
Trim leading/trailing whitespace from the given `string` and return the result.

#### *Has JavaScript?* CSS class hook
- Not a method per se, but placing an attribute of `<html class="nojs">` on a document's `<html>` element will be automatically replaced with `<html class="js">` upon load of the library.
- Used as a CSS styling hook for no/has JavaScript scenarios.

### Events

#### $.Event.add(object,type,handler)
- Attach an event `handler` to the given `object` of the given `type`.
- **Note:** For IE8 and below implements `attachEvent()`, correction of `this` and event cleanup upon document unload to (hopefully) avoid memory leakage.

Example usage:

```js
function clickHandler(event) {

	console.log('Clicked!');
	console.log(this);
	console.log(event);
}

$.Event.add($('domelement'),'click',clickHandler);
```

#### $.Event.remove(object,type,handler)
Remove an event `handler` from the given `object` of the given `type`.

#### $.Event.preventDefault(event)
Cancels the default action of an `event` and prevents further propagation.

#### $.Event.stopPropagation(event)
Prevents further propagation of the given `event`.

#### $.Event.getTarget(event)
Returns the DOM element that the given `event` was dispatched on.

#### $.Event.getRelatedTarget(event)
Returns the secondary DOM element for the given `event`, only useful for the mouse events `mouseover` and `mouseout`.

#### $.Event.isMouseEnterLeave(event,element)
Emulates behaviour of the mighty handy and IE only event types of [mouseenter](http://msdn.microsoft.com/en-us/library/ie/ms536945\(v=vs.85\).aspx) and [mouseleave](http://msdn.microsoft.com/en-us/library/ie/ms536946\(v=vs.85\).aspx).

Example usage:

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

Messages will only log when the mouse pointer enters/leaves `<div id="watchme">`, ignoring events fired when entering/leaving the child `<span>` DOM elements.

#### $.Event.getMousePosition(event)
- Returns the current mouse x/y pixel coordinates from the given `event`.
- Data will be returned as an object with the structure of `{ x: 123,y: 456 }`.
- **Note:** At time of writing IE10 (and possibly other browser vendors going forward) can/will return mouse coordinates with a sub-pixel resolution, `getMousePosition()` will round down to whole pixel units.

#### $.Event.reqAnimFrame(handler)
- Wrapper for `window.requestAnimationFrame`, a more efficient method of running animation routines versus the traditional `window.setTimeout()` method.
- Handles cross browser API prefixing between browser vendors.
- A fallback `window.setTimeout()` polyfill is provided for unsupported browsers which will be called approximately once every 16ms to give a *close to* 60fps fire rate.

### DOM

#### $$(query) / $$(element,query)
- A wrapper for `querySelectorAll()`, supported by recent browsers including IE8 and above, returning DOM elements for the given CSS `query`.
- In the first form the query will be based from `document` (entire page), otherwise in the second form from the given `element`.
- Returned DOM elements will be provided in an array, rather than a `NodeList` for ease of use.
- **Note:** `querySelectorAll()` will only support queries based on the browsers CSS implementation. In the case of IE8 this limits use to CSS 2.1 selector types.

#### $.DOM.ready(handler)
- Will call the given `handler` upon firing of the `DOMContentLoaded` event, using polyfills for unsupported browsers.
- Can be called multiple times with multiple `handler` functions, each will be called in turn at the point of the document DOM loading.
- If called after the DOM has loaded, the given `handler` will execute immediately.
- Based upon the standalone DOM ready method presented in the following [gist](https://gist.github.com/magnetikonline/5270265).

#### $.DOM.create(name[,attributeList][,childElementList])
- Creates a new DOM element with the given tagname `name`.
- Optional attributes given as a key/value object `attributeList`. Keys are to be given as DOM Element properties, a few will be converted from their HTML names automatically:
	- `class` will be injected as `className`
	- `colspan` injected as `colSpan`
	- `for` injected as `htmlFor`
- Optional child DOM elements automatically appended given as an array `childElementList`.
	- Child elements given as strings will be appended as a DOM `TextNode`.

Example usage:

```js
var myCreatedDOMEl = $.DOM.create(
	'div',{ 'class': 'myclass' },
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
Replace the given `oldElement` within the current document with `element`, returning `oldElement`.

#### $.DOM.remove(element)
Remove the given `element` from the DOM, returning `element`.

#### $.DOM.removeChildAll(element)
Remove all child DOM elements from given `element`.

#### $.DOM.isChildOf(parentElement,childElement)
Returns `true` if the given `childElement` is a child (either direct or descendant) of `parentElement`, otherwise return `false`.

#### $.DOM.hasClass(element,name)
Returns `true` if `element` has the given CSS class `name` assigned, otherwise return `false`.

#### $.DOM.addClass(element,name)
- Add one or more CSS classes of the given `name` to `element`.
- Provide multiple CSS class names space separated.
- CSS class names already present for the `element` will be silently ignored and not duplicated.

#### $.DOM.removeClass(element,name)
- Remove one or more CSS classes of the given `name` from `element`.
- Provide multiple CSS class name removals space separated.

#### $.DOM.setOpacity(element,opacity)
- Set the given `element` a new `opacity` level.
- For IE8 and below:
	- Sets the alternative `filter: alpha(opacity=LEVEL))` syntax.
	- Adds the CSS property `zoom: 1` to help correct IE rendering issues.
- Given `opacity` is rounded to a maximum of two decimal places, otherwise it all just becomes a bit silly.

#### $.DOM.setStyle(element,styleList)
- Set the given inline CSS `styleList` (as a key/value object) to `element`. Essentially an easier way to set multiple inline element style attributes at once.
- Internally uses a simplistic `element.style.[styleKey] = value` assignment, therefore `styleList` key(s) must be given using camel cased style names (e.g. `backgroundColor`).
- Setting inline CSS `opacity` will apply the same IE8 and below alternatives as outlined in `$.DOM.setOpacity()` above.

Example usage:

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

#### $.DOM.getOffset(element[,toParent])
- Returns the left/top pixel offset of the given `element` to either the top left corner of the document, or if `toParent` is provided and set `true`, to the element's parent.
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
- Uses the techniques suggested by [Ryan Van Etten](http://responsejs.com/labs/dimensions/#document).

### Animation/transition end DOM events
For the background behind these methods and their uses you can refer to my [cssanimevent](https://github.com/magnetikonline/cssanimevent) JavaScript library. The following methods have been lifted and integrated from here.

#### $.DOM.Anim.onAnimationEnd(element,handler[,data])
- Calls the given `handler` upon completion of a CSS3 animation applied to `element`. Lifetime of the callback will be for exactly *one* animation end event only.
- For browsers that do not support CSS3 animations, `handler` will be called instantaneously.
- Handler will be passed a reference to `element` when called.
- Optional `data` can be given, which will be passed to `handler` upon execution as a second parameter.

#### $.DOM.Anim.cancelAnimationEnd(element)
Cancel a pending handler assigned to `element` by a previous call to `onAnimationEnd()`.

#### $.DOM.Anim.onTransitionEnd(element,handler[,data])
Identical in functionality to `$.DOM.Anim.onAnimationEnd()`, but for CSS3 transitions.

#### $.DOM.Anim.cancelTransitionEnd(element)
Identical in functionality to `$.DOM.Anim.cancelAnimationEnd()`, but for CSS3 transitions.

### XMLHTTP

#### $.request(url[,method][,handler][,parameterList])
- Execute a `XMLHttpRequest()` call to the given `url`, returning `true` if the call was successful made by the browser (e.g. supports `XMLHttpRequest()`).
- The `method` can be one of `GET` or `POST`, with `false` defaulting the method to `GET`.
- Optional `handler` will be executed at completion of the URL call (success or fail). Handler will be passed a single parameter of the return status/response as an object with the following keys:
	- `ok:` Set `true` if the call returned successfully, otherwise `false`.
	- `status:` Numeric HTTP status code returned.
	- `text:` The response body as a string upon success, otherwise empty string.
	- `JSON:` If response body is JSON data and could be successfully parsed, will contain a JavaScript object of this data, otherwise an empty object.
		- **Note:** Uses `JSON.parse()` for the parsing which requires standards mode for IE8.
- An optional `parameterList` given as a key/value object with be passed on the query string using `GET`, or as form data when using `POST`.

Example usage:

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
