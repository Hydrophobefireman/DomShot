type shotInstance = import("../index").DOMShot;

type ElementTransform = import("../index").ElementTransform;

export class FormElementRenderer implements ElementTransform {
  private _formElements = ["INPUT", "OPTION", "TEXTAREA"];
  test(node: HTMLElement) {
    return this._formElements.indexOf(node.tagName) > -1;
  }
  transform(node: HTMLElement, sourceNode: HTMLElement) {
    Promise.reject("Not Implemented");
    return Promise.resolve({ node });
  }
}
