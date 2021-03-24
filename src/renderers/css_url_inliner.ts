import { ImgRenderer } from "./img";
type shotInstance = import("../core").DOMShot;

type ElementTransform = import("../core").ElementTransform;
type DomShotOptions = import("../core").DomShotOptions;
export class InlineCssPropRenderer implements ElementTransform {
  constructor(public options: DomShotOptions) {}
  static requestRenderer(
    DOMShotInstance: shotInstance,
    options: import("../core").DomShotOptions
  ): void {
    const renderer = new InlineCssPropRenderer(options);

    DOMShotInstance.tapRenderProcess(renderer);
  }

  private _inlineProps = [
    "backgroundImage",
    "borderImageSource",
    "content",
    "cursor",
    "listStyleImage",
    "mask",
  ];
  private _getInlinableImage(image: string): string {
    const url = (image.split("url(")[1] || "")
      .split(")")[0]
      .trim()
      .replace(/['"]/g, "");
    if (url.substr(0, 4).toLowerCase() === "http") {
      return url;
    }
  }

  test(node: HTMLElement) {
    return this._inlineProps.some(
      (x) => (((node || {}).style || {})[x] || "").indexOf("url(") > -1
    );
  }
  transform(node: HTMLElement, sourceNode: HTMLElement) {
    const nodeStyle = node.style;
    return Promise.all(
      this._inlineProps.map((prop) => {
        const inlineable = this._getInlinableImage(nodeStyle[prop]);
        if (inlineable) {
          const i = new Image();
          i.src = inlineable;
          return new ImgRenderer(this.options)
            .transform(i, sourceNode as HTMLImageElement)
            .then(() => (nodeStyle[prop] = `url('${i.currentSrc}')`));
        }
      })
    ).then(() => ({
      node,
    }));
  }
}
