import { ImgRenderer } from "./img";

interface VideoMetaData {
  width: number;
  height: number;
}
type shotInstance = import("../core").DOMShot;

type ElementTransform = import("../core").ElementTransform;

export class VideoRenderer {
  test(node: HTMLElement) {
    return node.tagName === "VIDEO";
  }
  transform(
    video: HTMLVideoElement,
    sourceVideo: HTMLVideoElement
  ): ReturnType<ElementTransform["transform"]> {
    const imgRenderer = new ImgRenderer();

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

  static requestRenderer(DOMShotInstance: shotInstance): void {
    const renderer = new VideoRenderer();
    DOMShotInstance.tapRenderProcess(renderer);
  }
}
