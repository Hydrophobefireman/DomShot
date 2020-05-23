class DOMToSVG {
  /** @param {HTMLElement} sourceNode
   *  @param {{}} options
   */
  constructor(sourceNode, options) {
    /**
     * @type  {{drawImgTagsOnCanvas:boolean,timeout:number}}
     */

    this.options = options || { drawImgTagsOnCanvas: false, timeout: 5000 };

    /** @type {HTMLImageElement} the svg encoded to base64 */

    this._img = null;

    /** @type {Promise<Event>} */

    this._imgReadyForCanvas = null;

    /** @type {number} scrollWidth of `sourceNode` */

    this._width = null;

    /** @type {number} scrollHeight of `sourceNode` */

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

    for (const style of computed) {
      const value = computed.getPropertyValue(style);
      if (!value) continue;
      css.push(`${style}:${value};`);
    }

    target.style.cssText = css.join("");
  }

  /** @param {HTMLImageElement} img */

  static inlineImageIfPossible(img, timeout) {
    if (["blob", "data"].indexOf(img.src.substr(0, 4)) === 0) return;

    const prom = createEventPromise(img, "load", timeout).then(() => {
      const c = document.createElement("canvas");

      c.height = img.height;

      c.width = img.width;

      const ctx = c.getContext("2d");

      ctx.drawImage(img, 0, 0);

      if (!isTainted(ctx)) {
        const imgOnLoad = createEventPromise(img, "load", timeout);
        img.src = c.toDataURL();
        return imgOnLoad;
      }
    });

    img.crossOrigin = "anonymous";
    return prom;
  }

  /** @param {HTMLElement} node */

  _clone(node) {
    const cloned = this._sourceNode.cloneNode(true);

    this._clonedNode = cloned;

    this._sourceChildren = arrayFrom(this._sourceNode.querySelectorAll("*"));

    this._clonedChildren = arrayFrom(this._clonedNode.querySelectorAll("*"));
  }
  /**
   * @param {HTMLElement} node sets the new source node
   *  @returns {DOMToSVG}
   */

  from(node) {
    this._reset();
    this._width = this._height = 0;

    this._canvasState = DOMToSVG.DRAW_PENDING;

    this._sourceNode = node;

    return this;
  }

  _reset() {
    this._imgReadyForCanvas = null;
    this._clonedChildren = null;
    this._sourceChildren = null;
    this._clonedChildren = null;
    this._sourceNode = null;
    this._clonedNode = null;
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

  _walkChildNodes() {
    const clonedChildren = this._clonedChildren;
    const imgProm = [];
    for (const child of clonedChildren) {
      const tag = child.tagName;
      if (
        tag === "SCRIPT" ||
        tag === "STYLE" ||
        tag === "HEAD" ||
        tag === "NOSCRIPT" ||
        child.style.display === "none"
      ) {
        child.remove();
        continue;
      }
      if (this.options.drawImgTagsOnCanvas && tag === "IMG") {
        imgProm.push(
          DOMToSVG.inlineImageIfPossible(child, this.options.timeout)
        );
      }
    }
    return imgProm;
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

    const width = sourceNode.scrollWidth;

    const height = sourceNode.scrollHeight;

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

    this._imgReadyForCanvas = createEventPromise(
      this._img,
      "load",
      this.options.timeout
    );

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

    this._reset();
  }

  /** @returns {Promise<DOMToSVG>} */

  screenshot() {
    this._clone();
    return new Promise((resolve) =>
      callback(() => {
        if (!this._clonedNode)
          throw new Error("No source node has been specified");

        this._cloneChildNodeStyle();

        const promiseArr = this._walkChildNodes();

        return Promise.all(promiseArr)
          .then(() => {
            DOMToSVG.cloneStyle(this._sourceNode, this._clonedNode);

            this._cleanMargin();

            this._generateSVG();
            return this._imgReadyForCanvas.then(() => {
              this._imgReadyForCanvas = null;
              this._generateCanvas();

              this._fillCanvas();

              resolve(this);
            });
          })
          .catch((e) => {
            console.log(e);
            resolve(this);
          });
      })
    );
  }

  /** @returns {Promise<DOMToSVG>} */

  drawImage() {
    return new Promise((resolve, reject) => {
      if (this._canvasState === DOMToSVG.DRAW_PENDING)
        reject("Please call Screenshot first");
      callback(() => {
        this._fillCanvas();
        return resolve(this);
      });
    });
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


