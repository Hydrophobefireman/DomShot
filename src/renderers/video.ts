import { ImgRenderer } from "./img";

interface VideoMetaData {
  width: number;
  height: number;
}
type shotInstance = import("../core").DOMShot;
type DomShotOptions = import("../core").DomShotOptions;
type ElementTransform = import("../core").ElementTransform;

export class VideoRenderer {
  constructor(public options: DomShotOptions) {}
  test(node: HTMLElement) {
    return node.tagName === "VIDEO";
  }
  transform(
    video: HTMLVideoElement,
    sourceVideo: HTMLVideoElement
  ): ReturnType<ElementTransform["transform"]> {
    const imgRenderer = new ImgRenderer(this.options);

    return imgRenderer.transform(video, sourceVideo).then((resp) => {
      const i = new Image();
      i.style.cssText = video.style.cssText;
      if (resp.node == null) {
        const poster = video.poster;
        if (poster) {
          i.src = poster;
          video.replaceWith(i);
          return imgRenderer.transform(i, sourceVideo);
        }
      }
      i.src = video.src;
      video.replaceWith(i);
      return { node: i };
    });
  }

  static requestRenderer(
    DOMShotInstance: shotInstance,
    options: DomShotOptions
  ): void {
    const renderer = new VideoRenderer(options);
    DOMShotInstance.tapRenderProcess(renderer);
  }
}
