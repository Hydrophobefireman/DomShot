import { createEventPromise, isTainted } from "../util";

export function inlineImageIfPossible(
  img: HTMLImageElement,
  timeout: number
): Promise<any> {
  // if (["blob", "data"].indexOf(img.src.substr(0, 4)) === 0) return;

  const prom = createEventPromise(img, "load", timeout).then((obj: any) => {
    if (obj.IS_ERROR) return;
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
const dataBlobURLSchemes = { data: 1, blob: 1 };

type shotInstance = import("../index").DOMShot;

export class ImgRenderer {
  public render = {
    test(element: HTMLImageElement) {
      return (
        element.tagName === "IMG" &&
        (!element.crossOrigin || !dataBlobURLSchemes[element.src.substr(0, 4)])
      );
    },
    transform: (img: HTMLImageElement, shot: shotInstance) => {
      return inlineImageIfPossible(img, shot.options.timeout);
    },
  };
  static requestRenderer(DOMShotInstance: shotInstance): void {
    const renderer = new ImgRenderer();

    DOMShotInstance.tapRenderProcess(renderer.render);
  }
}
