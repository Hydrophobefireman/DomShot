import { buildStylesheet } from "../util";

export function cloneStyle(
  source: HTMLElement,
  target: HTMLElement,
  keepOverFlowingContent: boolean,
  sheet: ReturnType<typeof buildStylesheet>
): void {
  const computed = getComputedStyle(source);
  target.style.cssText = "";
  const classList = [];
  if (computed.display === "none") {
    target.style.display = "none";
    return;
  }
  for (const style of computed) {
    const value = computed.getPropertyValue(style);
    if (!value) {
      continue;
    }
    classList.push(sheet.addRule(style, value));
  }
  target.setAttribute("class", classList.join(" "));
  if (!keepOverFlowingContent) {
    target.style.overflow = "hidden";
  }
}

export function cloneChildNodeStyle(
  nodeChildren: HTMLElement[],
  clonedChildren: HTMLElement[],
  sheet: ReturnType<typeof buildStylesheet>
) {
  for (let i = 0; i < clonedChildren.length; i++) {
    const sourceChild = nodeChildren[i];

    const cloneChild = clonedChildren[i];

    cloneStyle(sourceChild, cloneChild, false, sheet);
  }
}
