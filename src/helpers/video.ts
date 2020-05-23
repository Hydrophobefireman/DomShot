/**
 *  extract frame from a video, for videos that aren't playing, we will return their `poster`
 * */

interface VideoMetaData {
  width: number;
  height: number;
}

export class VideoRenderer {
  transform = {
    test(a: HTMLElement) {
      return true;
    },
    transform(a: HTMLElement) {
      return Promise.resolve();
    },
  };
  static requestRenderer(DOMShotInstance: import("../index").DOMShot): void {
    const renderer = new VideoRenderer();
    DOMShotInstance.tapRenderProcess(renderer.transform);
  }
}
