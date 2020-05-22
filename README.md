# DomShot

Take screenshots of the entire window or a particular DOM node.

Uses promises all around, thus more performant for massive pages.

## API

DOMShot provides ES Module for TS and JS.

### 1. Import DOMShot

(In your JS/TS File)

```javascript 
import {DOMShot} from "DOMShot";
```

### 2. Choose the node to take screenshot of

#### Method 1

```javascript
const shot = new DOMShot(document.documentElement); // takes screenshot of the entire page
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
