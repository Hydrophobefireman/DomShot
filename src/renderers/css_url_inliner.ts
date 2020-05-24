import { ImgRenderer } from "./img";
type shotInstance = import("../index").DOMShot;

type ElementTransform = import("../index").ElementTransform;

export class InlineCssPropRenderer implements ElementTransform {
  static requestRenderer(DOMShotInstance: shotInstance): void {
    const renderer = new InlineCssPropRenderer();

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
    return this._inlineProps.some((x) => node.style[x].indexOf("url(") > -1);
  }
  transform(node: HTMLElement, sourceNode: HTMLElement) {
    const nodeStyle = node.style;
    return Promise.all(
      this._inlineProps.map((prop) => {
        const inlineable = this._getInlinableImage(nodeStyle[prop]);
        if (inlineable) {
          const i = new Image();
          i.src = inlineable;
          return new ImgRenderer()
            .transform(i, sourceNode as HTMLImageElement)
            .then(() => (nodeStyle[prop] = `url('${i.src}')`));
        }
      })
    ).then(() => ({
      node,
    }));
  }
}
