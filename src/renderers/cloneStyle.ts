export function cloneStyle(
  source: HTMLElement,
  target: HTMLElement,
  keepOverFlowingContent?: boolean
): void {
  const computed = getComputedStyle(source);

  const css = [];

  for (const style of computed) {
    const value = computed.getPropertyValue(style);
    if (!value) continue;
    css.push(`${style}:${value};`);
  }

  target.style.cssText = css.join("");
  if (!keepOverFlowingContent) {
    target.style.overflow = "hidden";
  }
}

export function cloneChildNodeStyle(
  clonedChildren: HTMLElement[],
  nodeChildren: HTMLElement[]
) {
  for (let i = 0; i < clonedChildren.length; i++) {
    const sourceChild = nodeChildren[i];

    const cloneChild = clonedChildren[i];

    cloneStyle(sourceChild, cloneChild);
  }
}
