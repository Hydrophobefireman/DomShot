import { createEventPromise, isTainted, inlinedURLSchemes } from "../util";

type shotInstance = import("../core").DOMShot;

type ElementTransform = import("../core").ElementTransform;

export class ImgRenderer implements ElementTransform {
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
      element.tagName === "IMG" && !inlinedURLSchemes[element.src.substr(0, 4)]
    );
  }
  static requestRenderer(DOMShotInstance: shotInstance): void {
    const renderer = new ImgRenderer();

    DOMShotInstance.tapRenderProcess(renderer);
  }

  private _inline(
    img: HTMLElement,
    sourceImg: HTMLImageElement,
    timeout: number
  ): Promise<any> {
    if (
      !(img instanceof HTMLImageElement) &&
      !(img instanceof HTMLVideoElement)
    )
      return Promise.resolve(img);
    <HTMLImageElement | HTMLVideoElement>img;
    const src = img.src;

    if (src.substr(0, 4) === "blob") {
      const draw = this._draw(sourceImg);

      const tmp = new Image();

      tmp.style.cssText = img.style.cssText;

      const retOnload = createEventPromise(tmp, "load", timeout);

      tmp.src = draw.c.toDataURL();

      img.replaceWith(tmp);

      return retOnload.then(() => tmp);
    }

    const prom = createEventPromise(img, "load", timeout).then((obj: any) => {
      if (obj.IS_ERROR) return img;
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
