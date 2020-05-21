/** @type {ArrayConstructor['from']} */

const ArrayFrom: ArrayConstructor["from"] =
  Array.from ||
  function <T>(iterable: ArrayLike<T>) {
    return [].slice.call(iterable);
  };

const $unescape = window.unescape || ((x) => x);

const callback =
  window.requestAnimationFrame ||
  Promise.prototype.then.bind(Promise.resolve()) ||
  queueMicrotask; //?

class DOMToSVG {
  private static DRAWN: 1 = 1;

  private static DRAW_PENDING: 0 = 0;

  /** @type {HTMLImageElement} the svg encoded to base64 */

  private _img: HTMLImageElement = null;

  /** @type {number} offsetWidth of `sourceNode` */

  private _width: number = null;

  /** @type {number offsetHeight} of `sourceNode` */

  private _height: number = null;

  /** @type {string} DOM to svg string */

  private _svg: string = null;

  /** @type {HTMLCanvasElement} the canvas to get a rendered JPEG from */

  private _canvas: HTMLCanvasElement = document.createElement("canvas");

  /** @type {CanvasRenderingContext2D} */

  private _canvasContext: CanvasRenderingContext2D;

  /** @type {0|1} */

  private _canvasState: 0 | 1 = null;

  /** @type {HTMLElement} cloned private _sourceNode */

  private _clonedNode: HTMLElement = null;

  /** @type {HTMLElement[]} children of the source node `sourceNode.querySelectorAll('*')` */

  private _sourceChildren: HTMLElement[] = null;

  /** @type {HTMLElement[]} children of the clone node `clonedNode.querySelectorAll('*')` */

  private _clonedChildren: HTMLElement[] = null;

  private _xmlSerializer = new XMLSerializer();
  constructor(private _sourceNode: HTMLElement) {
    this._canvasContext = this._canvas.getContext("2d");

    if (_sourceNode) {
      this.from(_sourceNode);
    }
  }
  /**
   *
   * @param {HTMLElement} source Node to copy CSS from
   * @param {HTMLElement} target Node to copy CSS to
   */

  static cloneStyle(source: HTMLElement, target: HTMLElement) {
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

  _clone(node: HTMLElement) {
    const cloned = node.cloneNode(true);
    return cloned;
  }
  /**
   * @param {HTMLElement} node sets the new source node
   *  @returns {DOMToSVG}
   */

  from(node: HTMLElement): DOMToSVG {
    this._canvasState = DOMToSVG.DRAW_PENDING;

    this._sourceNode = node;

    this._clonedNode = this._clone(this._sourceNode) as HTMLElement;

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
        child.tagName === "HEAD"
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

    const width = this._width;

    const height = this._height;

    ctx.drawImage(img, 0, 0, width, height);

    this._canvasState = DOMToSVG.DRAWN;
  }

  /** @returns {Promise<DOMToSVG>} */

  screenshot(): Promise<DOMToSVG> {
    return new Promise((resolve) => {
      callback(() => {
        if (!this._clonedNode)
          throw new Error("No source node has been specified");

        this._cloneChildNodeStyle();

        this._removeTags();

        DOMToSVG.cloneStyle(this._sourceNode, this._clonedNode);

        this._cleanMargin();

        this._generateSVG();

        this._generateCanvas();

        return resolve(this);
      });
    });
  }

  /** @returns {Promise<DOMToSVG>} */

  drawImage(): Promise<DOMToSVG> {
    return new Promise((resolve) => {
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
  toDataUri(type: string, quality: number): Promise<string> {
    return new Promise((resolve) =>
      this.drawImage().then(() =>
        callback(() =>
          resolve(this._canvas.toDataURL(type || "image/png", quality || "100"))
        )
      )
    );
  }

  toBlob(type: string, quality: string) {
    return new Promise((resolve) =>
      this.drawImage().then(() =>
        callback(() =>
          this._canvas.toBlob(resolve, type || "image/png", quality || 100)
        )
      )
    );
  }
}

export { DOMToSVG as DOMShot };
