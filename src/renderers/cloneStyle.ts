export function cloneStyle(source: HTMLElement, target: HTMLElement): void {
  const computed = getComputedStyle(source);

  const css = [];

  for (const style of computed) {
    const value = computed.getPropertyValue(style);
    if (!value) continue;
    css.push(`${style}:${value};`);
  }

  target.style.cssText = css.join("");
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
