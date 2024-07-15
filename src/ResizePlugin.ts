import "./ResizePlugin.less";
import { I18n, Locale, defaultLocale } from "./i18n";
import { format } from "./utils";

interface Size {
  width: number;
  height: number;
}
interface Position {
  left: number;
  top: number;
  width: number;
  height: number;
}
class ResizeElement extends HTMLElement {
  public originSize?: Size | null = null;
}

interface ResizePluginOption {
  showToolbar?: boolean;
  locale?: Locale;
  showSize?: boolean;
  toolbar?: {
    alingTools?: boolean;
    sizeTools?: boolean;
  };
}

let templateUsed: string;
let pluginOptions: ResizePluginOption | undefined;

class ResizePlugin {
  resizeTarget: ResizeElement;
  resizer: HTMLElement | null = null;
  container: HTMLElement;
  startResizePosition: Position | null = null;
  i18n: I18n;

  constructor(
    resizeTarget: ResizeElement,
    container: HTMLElement,
    options?: ResizePluginOption
  ) {
    this.i18n = new I18n(options?.locale || defaultLocale);
    templateUsed = this.createToobar(options);
    this.resizeTarget = resizeTarget;
    if (!resizeTarget.originSize) {
      resizeTarget.originSize = {
        width: resizeTarget.clientWidth,
        height: resizeTarget.clientHeight,
      };
    }
    pluginOptions = options;
    this.container = container;
    this.initResizer();
    this.positionResizerToTarget(resizeTarget);
    this.resizing = this.resizing.bind(this);
    this.endResize = this.endResize.bind(this);
    this.startResize = this.startResize.bind(this);
    this.toolbarClick = this.toolbarClick.bind(this);
    this.bindEvents();
  }

  initResizer() {
    let resizer: HTMLElement | null =
      this.container.querySelector("#editor-resizer");
    if (!resizer) {
      resizer = document.createElement("div");
      resizer.setAttribute("id", "editor-resizer");
      resizer.innerHTML = format(
        templateUsed,
        this.i18n.findLabel("altTip"),
        this.i18n.findLabel("floatLeft"),
        this.i18n.findLabel("center"),
        this.i18n.findLabel("floatRight"),
        this.i18n.findLabel("restore")
      );
      this.container.appendChild(resizer);
    }
    this.resizer = resizer;
  }
  createToobar(options?: ResizePluginOption) {
    const templateBasicToolbar = `<div class="handler" title="{0}"></div>`;
    const size = `<div class="showSize" name="ql-size" title="{0}">{size}</div>`;

    const sizeTools = `<div class="group">
      <a class="btn" data-width="100%">100%</a>
      <a class="btn" data-width="50%">50%</a>
      <a  class="btn btn-group">
      <span data-width="-5" class="inner-btn">﹣</span>
      <span data-width="5" class="inner-btn">﹢</span>
      </a>
      <a data-width="auto" class="btn last-item">{4}</a>
      </div>`;
    const alingTools = `<div class="group">
      <a class="btn" data-float="left">{1}</a>
      <a class="btn" data-float="center">{2}</a>
      <a class="btn" data-float="right">{3}</a>
      <a data-float="none" class="btn last-item">{4}</a>
      </div>`;
    const toolBarTemplate = `<div class="toolbar">
    ${options?.toolbar?.sizeTools !== false ? sizeTools : ""}
    ${options?.toolbar?.alingTools !== false ? alingTools : ""}
  </div>`;
    return `${templateBasicToolbar}${options?.showSize === true ? size : ""}${
      options?.showToolbar !== false ? toolBarTemplate : ""
    }`;
  }
  positionResizerToTarget(el: HTMLElement) {
    if (this.resizer !== null) {
      let currentEl = el
      let offsetLeft = el.offsetLeft
      let offsetTop = el.offsetTop

      while (currentEl && currentEl.offsetParent != this.resizer.parentElement) {
        currentEl = currentEl.offsetParent
        offsetLeft += currentEl.offsetLeft
        offsetTop += currentEl.offsetTop
      }

      this.resizer.style.setProperty("left", offsetLeft + "px");
      this.resizer.style.setProperty("top", offsetTop + "px");
      this.resizer.style.setProperty("width", el.clientWidth + "px");
      this.resizer.style.setProperty("height", el.clientHeight + "px");
      // this.resizer.getElementsByTagName("ql-size").item(0)?.innerHTML = `450px, 500px`
      pluginOptions?.showSize &&
        (document.getElementsByName("ql-size").item(0).innerHTML = `${
          el.getAttribute("width") ? el.getAttribute("width") : el.clientWidth
        }, ${
          el.getAttribute("height")
            ? el.getAttribute("height")
            : el.clientHeight
        }`);
      // this.resizer.innerHTML = formatSize (templateUsed, "450px, 500px")
    }
  }
  bindEvents() {
    if (this.resizer !== null) {
      this.resizer.addEventListener("mousedown", this.startResize);
      this.resizer.addEventListener("click", this.toolbarClick);
    }
    window.addEventListener("mouseup", this.endResize);
    window.addEventListener("mousemove", this.resizing);
  }
  toolbarClick(e: MouseEvent) {
    const target: HTMLElement = e.target as HTMLElement;
    if (
      target.classList.contains("btn") ||
      target.classList.contains("inner-btn")
    ) {
      let width: string | number = target.dataset.width as string;
      const float: string = target.dataset.float as string;
      const style: CSSStyleDeclaration = this.resizeTarget.style;
      if (width) {
        if (this.resizeTarget.tagName.toLowerCase() !== "iframe") {
          // style.removeProperty("height");
          this.resizeTarget.removeAttribute("height");
        }
        if (width === "auto") {
          // style.removeProperty("width");
          this.resizeTarget.removeAttribute("width");
        } else if (width.includes("%")) {
          this.resizeTarget.setAttribute("width", width);
          // style.setProperty("width", width);
        } else {
          let styleWidth = this.resizeTarget.getAttribute("width") || "";
          // let styleWidth = style.getPropertyValue("width");
          width = parseInt(width);
          if (styleWidth.includes("%")) {
            styleWidth =
              Math.min(Math.max(parseInt(styleWidth) + width, 5), 100) + "%";
          } else {
            styleWidth =
              Math.max(this.resizeTarget.clientWidth + width, 10) + "px";
          }
          this.resizeTarget.setAttribute("width", styleWidth);
          // style.setProperty("width", styleWidth);
        }
      } else {
        if (float === "center") {
          style.setProperty("display", "block");
          style.setProperty("margin", "auto");
          style.removeProperty("float");
        } else {
          style.removeProperty("display");
          style.removeProperty("margin");
          style.setProperty("float", float);
        }
      }
      this.positionResizerToTarget(this.resizeTarget);
    }
  }
  startResize(e: MouseEvent) {
    const target: HTMLElement = e.target as HTMLElement;
    if (target.classList.contains("handler") && e.which === 1) {
      this.startResizePosition = {
        left: e.clientX,
        top: e.clientY,
        width: this.resizeTarget.clientWidth,
        height: this.resizeTarget.clientHeight,
      };
    }
  }
  endResize() {
    this.startResizePosition = null;
  }
  resizing(e: MouseEvent) {
    if (!this.startResizePosition) return;
    const deltaX: number = e.clientX - this.startResizePosition.left;
    const deltaY: number = e.clientY - this.startResizePosition.top;
    let width = this.startResizePosition.width;
    let height = this.startResizePosition.height;
    width += deltaX;
    height += deltaY;

    if (e.altKey) {
      const originSize = this.resizeTarget.originSize as Size;
      const rate: number = originSize.height / originSize.width;
      height = rate * width;
    }
    this.resizeTarget.setAttribute("width", Math.max(width, 30) + "");
    this.resizeTarget.setAttribute("height", Math.max(height, 30) + "");
    this.positionResizerToTarget(this.resizeTarget);
  }

  destory() {
    this.container.removeChild(this.resizer as HTMLElement);
    window.removeEventListener("mouseup", this.endResize);
    window.removeEventListener("mousemove", this.resizing);
    this.resizer = null;
  }
}

export default ResizePlugin;
