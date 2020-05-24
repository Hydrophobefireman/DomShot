export const arrayFrom: ArrayConstructor["from"] =
  Array.from || (<T>(iterable: ArrayLike<T>): T[] => [].slice.call(iterable));

function identity<T>(x: T): T {
  return x;
}

export const $unescape = window.unescape || (identity as (x: string) => string);

export function isTainted(ctx: CanvasRenderingContext2D): boolean {
  try {
    return !ctx.getImageData(0, 0, 1, 1);
  } catch (err) {
    return true;
  }
}

const defer = Promise.prototype.then.bind(Promise.resolve());
const $req: Window["requestAnimationFrame"] =
  window.requestAnimationFrame || defer || queueMicrotask; //?

export function callback(fn: FrameRequestCallback): void {
  $req(() => $req(fn));
}

export function createEventPromise(
  obj: EventTarget,
  event: string,
  timeout: number
): Promise<Event> {
  return new Promise((resolve) => {
    let timer: NodeJS.Timeout;
    const $resolveClearTimeout = (opt?: any) => {
      clearTimeout(timer);
      resolve(opt);
    };
    obj.addEventListener(event, $resolveClearTimeout, { once: true });
    obj.addEventListener(
      "error",
      () => $resolveClearTimeout({ IS_ERROR: true }),
      {
        once: true,
      }
    );
    timer = setTimeout($resolveClearTimeout, timeout || 5000);
  });
}

const margins = [
  "margin",
  "marginLeft",
  "marginTop",
  "marginBottom",
  "marginRight",
];
export function cleanMargin(clonedNode: HTMLElement) {
  margins.forEach((prop) => (clonedNode.style[prop] = ""));
}

export function getBackgroundColor(el: HTMLElement): string {
  if (!el) return;
  const parent = el.parentElement;

  if (!parent || !parent.style) return;
  return (
    parent.style.background ||
    parent.style.backgroundColor ||
    parent.style.backgroundImage ||
    getBackgroundColor(parent)
  );
}

export function isTransparent(el: HTMLElement): boolean {
  return !(
    el.style.background ||
    el.style.backgroundImage ||
    el.style.backgroundColor
  );
}
const obj = {};
const _Object = obj.constructor as ObjectConstructor;
const hasOwnProp = obj.hasOwnProperty;

export const assign = ("assign" in Object
  ? _Object.assign
  : function Object_assign(target: {}) {
      for (let i = 1; i < arguments.length; i++) {
        const source = arguments[i];
        for (const key in source) {
          if (hasOwnProp.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }) as ObjectConstructor["assign"];

    
export const inlinedURLSchemes = { data: 1, blob: 1 };