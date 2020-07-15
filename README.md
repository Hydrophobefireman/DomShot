# DomShot

Take screenshots of the entire window or a particular DOM node.

Uses promises all around, thus more performant for massive pages.

## Installation 

```npm i @hydrophobefireman/domshot```

## API

DOMShot provides ES Module for JS.

### 1. Import DOMShot

(In your JS File)

```javascript
import { DOMShot } from "DOMShot";
```

### 2. Choose the node to take screenshot of

#### Method 1

```javascript
const shot = new DOMShot(document.documentElement,options?); // takes screenshot of the entire page
```

#### Method 2

```javascript
const shot = new DOMShot().from(document.documentElement);
```

### 3. Take a screenshot

```javascript
await shot.screenshot();
// get as data URI
const dataURI = await shot.toDataUri(type, quality);
// get as blob
const blob = await shot.toBlob(type, quality);
```

As DomShot clones and stores your entire dom in memory (likely 100s of nodes), calling screenshot clears both your real dom
and the cloned nodes from memory. 

To take screenshot again:

```javascript
await shot.screenshot();
const dataURI = await shot.toDataUri(type, quality);
const blob = await shot.toBlob(type, quality);

shot.from(document.documentElement);
// do it all again

```

## Options

DomShot accepts the following options related to external image loading

```javascript
interface Options {
  drawImgTagsOnCanvas: boolean; // tries to inline <img/> tags by drawing them on a canvas
  timeout: number; // time (in ms) to wait for the external image to load defaults to 5 seconds
}
```

If you provide a large enough timeout value, DomShot will wait for all the images to load on the page.
So, it's advisable to use a small timeout on very heavy pages

## Todo

1. Move to Worker if possible
