import * as util from "./util";
import * as renderers from "./renderers/index";

export interface DomShotOptions {
  // should DomShot inline your <img> tags , only use it if your images are CORS safe
  inlineImages?: boolean;

  // try to get video element's current frame or poster attribute
  inlineVideos?: boolean;

  // number of seconds to wait before rendering a blank image instead
  timeout?: number;

  //which height/width to use, scroll vs offset
  dimensionGetter?: "scroll" | "offset";

  //bypass cors with a proxy
  bypassCors?: boolean;

  //handle cors url
  corsUrlHandler?(url: string): string;
}

export interface ElementTransform {
  transform(
    cloneNode: HTMLElement,
    sourceNode: HTMLElement,
    DOMShotInstance: DOMShot
  ): Promise<TransformOutput>;
  test(node: HTMLElement): boolean;
}

interface TransformOutput {
  action?: "replace";

  // unless replace, return the same node back
  node: HTMLElement;
}

const REMOVE_TAGS = { SCRIPT: 1, STYLE: 1, HEAD: 1, NOSCRIPT: 1 };

export class DOMShot {
  public static DRAW_PENDING: 0 = 0;

  public static DRAWN: 1 = 1;

  public options: DomShotOptions;

  /** @type {HTMLImageElement} the svg encoded to base64 */

  private _img: HTMLImageElement = null;

  /** @type {Promise<Event>} */

  private _imgReadyForCanvas: Promise<Event> = null;

  /** @type {number} scrollWidth of `sourceNode` */

  private _width: number = null;

  /** @type {number} scroll of `sourceNode` */

  private _height: number = null;

  /** @type {string} DOM to svg string */

  private _svg: string = null;

  /** @type {HTMLCanvasElement} the canvas to get a rendered JPEG from */

  private _canvas: HTMLCanvasElement = document.createElement("canvas");

  /** @type {CanvasRenderingContext2D} */

  private _canvasContext: CanvasRenderingContext2D = this._canvas.getContext(
    "2d"
  );

  /** @type {0|1} */

  private _canvasState: 0 | 1 = null;

  /** @type {HTMLElement} the node to clone */

  private _sourceNode: HTMLElement = null;

  /** @type {HTMLElement} cloned _sourceNode */

  private _clonedNode: HTMLElement = null;

  /** @type {HTMLElement[]} children of the source node `sourceNode.querySelectorAll('*')` */

  private _sourceChildren: HTMLElement[] = null;

  /** @type {HTMLElement[]} children of the clone node `clonedNode.querySelectorAll('*')` */

  private _clonedChildren: HTMLElement[] = null;

  // if (sourceNode) {
  //   from(sourceNode);
  // }
  private _xmlSerializer = new XMLSerializer();

  private _nodeTraversalHooks: ElementTransform[] = [];

  private _reset() {
    this._imgReadyForCanvas = null;
    this._clonedChildren = null;
    this._sourceChildren = null;
    this._clonedChildren = null;
    this._sourceNode = null;
    this._clonedNode = null;
  }

  private _clone() {
    const cloned = this._sourceNode.cloneNode(true) as HTMLElement;

    this._clonedNode = cloned;

    this._sourceChildren = util.arrayFrom(
      this._sourceNode.querySelectorAll("*")
    );

    this._clonedChildren = util.arrayFrom(
      this._clonedNode.querySelectorAll("*")
    );
  }

  private _generateSVG(sheet: ReturnType<typeof util.buildStylesheet>) {
    const sourceNode = this._sourceNode;

    const clonedNode = this._clonedNode;

    const getter = this.options.dimensionGetter;

    let width: number;
    let height: number;

    if (getter === "offset") {
      const offsetWidth = sourceNode.offsetWidth;

      const clientWidth = sourceNode.clientWidth;

      const offsetHeight = sourceNode.offsetWidth;

      const clientHeight = sourceNode.clientHeight;
      width = Math.max(offsetWidth, clientWidth);
      height = Math.max(offsetHeight, clientHeight);
    } else {
      width = sourceNode.scrollWidth;
      height = sourceNode.scrollHeight;
    }

    clonedNode.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    clonedNode.appendChild(sheet.sheet());
    const xml = this._xmlSerializer.serializeToString(clonedNode);

    this._svg = `<?xml version='1.0' encoding='UTF-8' ?><svg
    xmlns="http://www.w3.org/2000/svg"
      width="${width}"
      height="${height}">
      <foreignObject width="100%" height="100%" x="0" y="0">${xml}</foreignObject>
    </svg>
   `;

    this._img = new Image(width, height);

    this._imgReadyForCanvas = util.createEventPromise(
      this._img,
      "load",
      this.options.timeout
    );

    this._img.src = `data:image/svg+xml;charset=utf-8;base64,${btoa(
      util.$unescape(encodeURIComponent(this._svg))
    )}`;

    this._width = width;

    this._height = height;
  }
  private _fillCanvas() {
    if (this._canvasState === DOMShot.DRAWN) return;

    const ctx = this._canvasContext;

    const img = this._img;

    ctx.drawImage(img, 0, 0);

    this._canvasState = DOMShot.DRAWN;

    this._reset();
  }
  private _generateCanvas() {
    if (this._canvasState === DOMShot.DRAWN) return;

    const canvas = document.createElement("canvas");

    const ctx = canvas.getContext("2d");

    canvas.height = this._height;

    canvas.width = this._width;

    this._canvas = canvas;
    this._canvasContext = ctx;
  }

  private _drawImage(): Promise<DOMShot> {
    return new Promise((resolve, reject) => {
      const promise =
        this._canvasState === DOMShot.DRAW_PENDING
          ? this.screenshot()
          : Promise.resolve(null as any);
      promise.then(() => {
        util.callback(() => {
          this._fillCanvas();
          return resolve(this);
        });
      });
    });
  }

  _processChildNodes(): Promise<unknown[]> {
    const clonedChildren = this._clonedChildren;

    const sourceChildren = this._sourceChildren;

    const asyncNodeTransformHooks = [];

    clonedChildren.forEach((child, i) => {
      const tag = child.tagName;

      if (REMOVE_TAGS[tag] || child.style.display === "none")
        return child.remove();
      asyncNodeTransformHooks.push(
        this._sequentiallyRunTraversalHook(child, sourceChildren[i])
      );
    });

    return Promise.all(asyncNodeTransformHooks);
  }

  _sequentiallyRunTraversalHook(
    cloneChild: HTMLElement,
    sourceChild: HTMLElement
  ): Promise<void> {
    return new Promise((resolve) => {
      const hooks = this._nodeTraversalHooks;
      const hooksLen = hooks.length;
      let hookIndex = -1;

      const nextHook = () => {
        if (++hookIndex == hooksLen) {
          return resolve();
        }
        const hook = hooks[hookIndex];
        if (hook.test(cloneChild)) {
          hook.transform(cloneChild, sourceChild, this).then((output) => {
            cloneChild = output.node;
            nextHook();
          });
        } else {
          nextHook();
        }
      };

      nextHook();
    });
  }
  constructor(sourceNode?: HTMLElement, options?: DomShotOptions) {
    this.options = util.assign(options || {}, defaultOptions());

    if (sourceNode) {
      this.from(sourceNode);
    }
    if (this.options.inlineImages) {
      renderers.ImgRenderer.requestRenderer(this, this.options);
      renderers.InlineCssPropRenderer.requestRenderer(this, this.options);
    }
    if (this.options.inlineVideos) {
      renderers.VideoRenderer.requestRenderer(this, this.options);
    }
  }

  public tapRenderProcess(fn: ElementTransform) {
    this._nodeTraversalHooks.push(fn);
  }

  public from(node: HTMLElement): DOMShot {
    this._reset();

    this._width = this._height = 0;

    this._canvasState = DOMShot.DRAW_PENDING;

    this._sourceNode = node;

    return this;
  }

  screenshot(): Promise<DOMShot> {
    this._clone();
    return new Promise((resolve) => {
      if (!this._clonedNode)
        throw new Error("No source node has been specified");
      const sheet = util.buildStylesheet();
      renderers.cloneChildNodeStyle(
        this._sourceChildren,
        this._clonedChildren,
        sheet
      );
      const childProcess = this._processChildNodes();
      childProcess.then(() => {
        renderers.cloneStyle(this._sourceNode, this._clonedNode, true, sheet);

        if (util.isTransparent(this._clonedNode)) {
          this._clonedNode.style.background = util.getBackgroundColor(
            this._sourceNode
          );
        }
        util.cleanMargin(this._clonedNode);

        this._generateSVG(sheet);

        return this._imgReadyForCanvas.then(() => {
          this._imgReadyForCanvas = null;

          this._generateCanvas();

          this._fillCanvas();

          resolve(this);
        });
      });
    });
  }

  public toDataUri(type: string, quality: number): Promise<string> {
    return new Promise((resolve) =>
      this._drawImage().then(() =>
        util.callback(() =>
          resolve(this._canvas.toDataURL(type || "image/jpeg", quality || 1))
        )
      )
    );
  }

  public toBlob(type: string, quality: number): Promise<Blob> {
    return new Promise((resolve: BlobCallback) =>
      this._drawImage().then(() =>
        util.callback(() =>
          this._canvas.toBlob(resolve, type || "image/jpeg", quality || 1)
        )
      )
    );
  }
}

function defaultOptions(): DomShotOptions {
  return {
    inlineImages: true,
    inlineVideos: true,
    timeout: 5000,
    dimensionGetter: "scroll",
    bypassCors: true,
    corsUrlHandler: function _defaultHandler(u: string) {
      return `https://rfster.vercel.app?fwd=${encodeURIComponent(u)}`;
    },
  };
}
