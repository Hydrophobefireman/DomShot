import { createEventPromise, isTainted, inlinedURLSchemes } from "../util";

type shotInstance = import("../core").DOMShot;

type ElementTransform = import("../core").ElementTransform;
type DomShotOptions = import("../core").DomShotOptions;
export class ImgRenderer implements ElementTransform {
  constructor(public options: DomShotOptions) {}
  public transform(
    img: HTMLImageElement | HTMLVideoElement,
    sourceImg: HTMLImageElement | HTMLVideoElement,
    shot?: shotInstance
  ): ReturnType<ElementTransform["transform"]> {
    return this._inline(
      img,
      sourceImg as HTMLImageElement,
      shot && shot.options.timeout
    ).then((node) => ({
      node,
    }));
  }
  public test(element: HTMLImageElement) {
    return (
      element.tagName === "IMG" &&
      !inlinedURLSchemes[element.currentSrc.substr(0, 4)]
    );
  }
  static requestRenderer(
    DOMShotInstance: shotInstance,
    options?: DomShotOptions
  ): void {
    const renderer = new ImgRenderer(options);

    DOMShotInstance.tapRenderProcess(renderer);
  }

  private _inline(
    img: HTMLElement,
    sourceImg: HTMLImageElement,
    timeout: number,
    __iter?: number
  ): Promise<any> {
    if (
      !(img instanceof HTMLImageElement) &&
      !(img instanceof HTMLVideoElement)
    )
      return Promise.resolve(img);
    <HTMLImageElement | HTMLVideoElement>img;
    const src = img.currentSrc;
    img.removeAttribute("srcset");
    const substr = src.substr(0, 4);
    if (substr === "blob") {
      const draw = this._draw(sourceImg);

      const tmp = new Image();

      tmp.style.cssText = img.style.cssText;

      const retOnload = createEventPromise(tmp, "load", timeout);

      tmp.src = draw.c.toDataURL();

      img.replaceWith(tmp);

      return retOnload.then(() => tmp);
    }

    const prom = createEventPromise(img, "load", timeout).then((obj: any) => {
      if (obj && obj.IS_ERROR) {
        if (__iter) return img;
        const handler = this.options && this.options.corsUrlHandler;
        const url = handler(img.currentSrc);
        img.src = url;
        return this._inline(img, sourceImg, timeout, (__iter || 0) + 1);
      }
      const draw = this._draw(img);

      const ctx = draw.ctx;

      const c = draw.c;

      if (!isTainted(ctx)) {
        const imgOnLoad = createEventPromise(img, "load", timeout);
        const url = c.toDataURL();
        img.src = url;

        return imgOnLoad.then(() => img);
      }
    });

    img.crossOrigin = "anonymous";
    return prom;
  }
  _draw(img: HTMLImageElement | HTMLVideoElement) {
    const c = document.createElement("canvas");

    c.height = (img as HTMLVideoElement).videoHeight || img.height;

    c.width = (img as HTMLVideoElement).videoWidth || img.width;

    const ctx = c.getContext("2d");

    ctx.drawImage(img, 0, 0);

    return { ctx, c };
  }
}
