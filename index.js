/** @type {ArrayConstructor['from']} */

const ArrayFrom =
  Array.from ||
  function (iterable) {
    return [].slice.call(iterable);
  };

const $unescape = window.unescape || ((x) => x);

const _callback =
  window.requestAnimationFrame ||
  Promise.prototype.then.bind(Promise.resolve()) ||
  queueMicrotask; //?

const callback = (fn) => _callback(() => _callback(fn));

function createEventPromise(obj, event) {
  return new Promise((resolve) =>
    obj.addEventListener(event, resolve, { once: true })
  );
}

class DOMToSVG {
  /** @param {HTMLElement} sourceNode */
  constructor(sourceNode) {
    /** @type {HTMLImageElement} the svg encoded to base64 */

    this._img = null;

    /** @type {Promise<Event>} */

    this._imgReadyForCanvas = null;

    /** @type {number} offsetWidth of `sourceNode` */

    this._width = null;

    /** @type {number offsetHeight} of `sourceNode` */

    this._height = null;

    /** @type {string} DOM to svg string */

    this._svg = null;

    /** @type {HTMLCanvasElement} the canvas to get a rendered JPEG from */

    this._canvas = document.createElement("canvas");

    /** @type {CanvasRenderingContext2D} */

    this._canvasContext = this._canvas.getContext("2d");

    /** @type {0|1} */

    this._canvasState = null;

    /** @type {HTMLElement} the node to clone */

    this._sourceNode = null;

    /** @type {HTMLElement} cloned this._sourceNode */

    this._clonedNode = null;

    /** @type {HTMLElement[]} children of the source node `sourceNode.querySelectorAll('*')` */

    this._sourceChildren = null;

    /** @type {HTMLElement[]} children of the clone node `clonedNode.querySelectorAll('*')` */

    this._clonedChildren = null;

    if (sourceNode) {
      this.from(sourceNode);
    }
    this._xmlSerializer = new XMLSerializer();
  }
  /**
   *
   * @param {HTMLElement} source Node to copy CSS from
   * @param {HTMLElement} target Node to copy CSS to
   */

  static cloneStyle(source, target) {
    const computed = getComputedStyle(source);

    const css = [];

    for (let i = 0; i < computed.length; i++) {
      const style = computed[i];
      const value = computed.getPropertyValue(style);
      if (!value) continue;
      css.push(`${style}:${value};`);
    }

    target.style.cssText = css.join("");
  }

  /** @param {HTMLElement} node */

  _clone(node) {
    const cloned = node.cloneNode(true);
    return cloned;
  }
  /**
   * @param {HTMLElement} node sets the new source node
   *  @returns {DOMToSVG}
   */

  from(node) {
    this._width = this._height = 0;

    this._canvasState = DOMToSVG.DRAW_PENDING;

    this._sourceNode = node;

    this._clonedNode = this._clone(this._sourceNode);

    this._sourceChildren = ArrayFrom(this._sourceNode.querySelectorAll("*"));

    this._clonedChildren = ArrayFrom(this._clonedNode.querySelectorAll("*"));

    return this;
  }

  _cloneChildNodeStyle() {
    const clonedChildren = this._clonedChildren;

    const nodeChildren = this._sourceChildren;

    for (let i = 0; i < clonedChildren.length; i++) {
      const sourceChild = nodeChildren[i];

      const cloneChild = clonedChildren[i];

      DOMToSVG.cloneStyle(sourceChild, cloneChild);
    }
  }

  _removeTags() {
    const clonedChildren = this._clonedChildren;

    for (let i = 0; i < clonedChildren.length; i++) {
      const child = clonedChildren[i];
      if (
        child.tagName === "SCRIPT" ||
        child.tagName === "STYLE" ||
        child.style.display === "none" ||
        child.tagName === "HEAD" ||
        child.tagName === "NOSCRIPT"
      ) {
        child.remove();
      }
    }
  }

  _cleanMargin() {
    [
      "margin",
      "marginLeft",
      "marginTop",
      "marginBottom",
      "marginRight",
    ].forEach((prop) => (this._clonedNode.style[prop] = ""));
  }

  _generateSVG() {
    const sourceNode = this._sourceNode;

    const clonedNode = this._clonedNode;

    const width = sourceNode.offsetWidth;

    const height = sourceNode.offsetHeight;

    clonedNode.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    const xml = this._xmlSerializer.serializeToString(clonedNode);

    this._svg = `<?xml version='1.0' encoding='UTF-8' ?><svg
    xmlns="http://www.w3.org/2000/svg"
      width="${width}"
      height="${height}">
      <foreignObject width="100%" height="100%" x="0" y="0">${xml}</foreignObject>
    </svg>
   `;

    this._img = new Image(width, height);

    this._imgReadyForCanvas = createEventPromise(this._img, "load");

    this._img.crossOrigin = "anonymous"; // ?

    this._img.src = `data:image/svg+xml;charset=utf-8;base64,${btoa(
      $unescape(encodeURIComponent(this._svg))
    )}`;

    this._width = width;

    this._height = height;
  }

  _generateCanvas() {
    if (this._canvasState === DOMToSVG.DRAWN) return;

    const canvas = document.createElement("canvas");

    const ctx = canvas.getContext("2d");

    canvas.height = this._height;

    canvas.width = this._width;

    this._canvas = canvas;
    this._canvasContext = ctx;
  }

  _fillCanvas() {
    if (this._canvasState === DOMToSVG.DRAWN) return;

    const ctx = this._canvasContext;

    const img = this._img;

    ctx.drawImage(img, 0, 0);

    this._canvasState = DOMToSVG.DRAWN;

    this._imgReadyForCanvas = null;
    this._clonedChildren = null;
    this._sourceChildren = null;
    this._clonedChildren = null;
    this._sourceNode = null;
    this._clonedNode = null;
  }

  /** @returns {Promise<DOMToSVG>} */

  screenshot() {
    return new Promise((resolve) =>
      callback(() => {
        if (!this._clonedNode)
          throw new Error("No source node has been specified");

        this._cloneChildNodeStyle();

        this._removeTags();

        DOMToSVG.cloneStyle(this._sourceNode, this._clonedNode);

        this._cleanMargin();

        this._generateSVG();
        this._imgReadyForCanvas.then(() => {
          this._imgReadyForCanvas = null;
          this._generateCanvas();

          this._fillCanvas();

          resolve(this);
        });
      })
    );
  }

  /** @returns {Promise<DOMToSVG>} */

  drawImage() {
    return new Promise((resolve) =>
      callback(() => {
        this._fillCanvas();
        return resolve(this);
      })
    );
  }
  /**
   * @returns {Promise<string>}
   * @param {string} type
   * @param {number} quality
   */
  toDataUri(type, quality) {
    return new Promise((resolve) =>
      this.drawImage().then(() =>
        callback(() =>
          resolve(this._canvas.toDataURL(type || "image/jpeg", quality || 1))
        )
      )
    );
  }

  /**
   * @returns {Promise<string>}
   * @param {Blob} type
   * @param {number} quality
   */
  toBlob(type, quality) {
    return new Promise((resolve) =>
      this.drawImage().then(() =>
        callback(() =>
          this._canvas.toBlob(resolve, type || "image/jpeg", quality || 1)
        )
      )
    );
  }
}

DOMToSVG.DRAW_PENDING = 0;
DOMToSVG.DRAWN = 1;

export { DOMToSVG as DOMShot };
