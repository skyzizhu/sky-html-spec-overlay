(function () {
  var state = {
    visible: true,
    pickMode: true,
    spacingPickMode: false,
    workingData: null,
    hoverElement: null,
    spacingSource: null,
    selectedAnnotation: null,
    indexRegistry: {},
    indexSequence: 1,
    panelPosition: {
      top: 16,
      left: null
    }
  };

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function roundPx(value) {
    return Math.round(value);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function pageRect(rect) {
    return {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
      right: rect.right + window.scrollX,
      bottom: rect.bottom + window.scrollY
    };
  }

  function rgbToHex(input) {
    if (!input) return input;
    if (input.startsWith("#")) return input.toUpperCase();
    var match = input.match(/^rgba?\(([^)]+)\)$/i);
    if (!match) return input;
    var parts = match[1].split(",").map(function (part) { return part.trim(); });
    if (parts.length < 3) return input;
    if (parts.length === 4 && parseFloat(parts[3]) !== 1) return input;
    return "#" + parts.slice(0, 3).map(function (part) {
      var value = Math.max(0, Math.min(255, parseInt(part, 10) || 0));
      return value.toString(16).padStart(2, "0");
    }).join("").toUpperCase();
  }

  function compressBoxValues(style, prefix) {
    var values = [
      style.getPropertyValue(prefix + "-top"),
      style.getPropertyValue(prefix + "-right"),
      style.getPropertyValue(prefix + "-bottom"),
      style.getPropertyValue(prefix + "-left")
    ].map(function (value) { return value.trim(); });
    if (values.every(function (value) { return value === values[0]; })) {
      return values[0];
    }
    return values.join(" ");
  }

  function applyUiSettings(ui) {
    if (!ui) return;
    var root = document.documentElement;
    var mapping = {
      boxColor: "--hso-box-color",
      boxFill: "--hso-box-fill",
      labelTextColor: "--hso-label-text",
      labelBackground: "--hso-label-bg",
      labelFontSize: "--hso-label-font-size",
      labelMaxWidth: "--hso-label-max-width",
      lineColor: "--hso-line-color",
      spacingTagFontSize: "--hso-spacing-tag-font-size"
    };
    Object.keys(mapping).forEach(function (key) {
      if (ui[key] !== undefined && ui[key] !== null) {
        root.style.setProperty(mapping[key], String(ui[key]));
      }
    });
    if (ui.lineThickness !== undefined && ui.lineThickness !== null) {
      root.style.setProperty("--hso-line-thickness", String(ui.lineThickness) + "px");
    }
  }

  function metricDefaults(kind) {
    switch (kind) {
      case "text":
        return ["font-size", "line-height", "font-weight", "color"];
      case "divider":
        return ["divider", "color"];
      case "region":
        return ["size", "padding", "border-radius", "background-color"];
      default:
        return ["size", "font-size", "color", "border-radius"];
    }
  }

  function metricOptions(kind) {
    switch (kind) {
      case "text":
        return [
          { value: "width", label: "宽度" },
          { value: "height", label: "高度" },
          { value: "color", label: "文字颜色" },
          { value: "font-size", label: "文字大小" },
          { value: "font-family", label: "字体" },
          { value: "font-weight", label: "字重" },
          { value: "line-height", label: "行高" },
          { value: "letter-spacing", label: "字间距" }
        ];
      case "region":
        return [
          { value: "width", label: "宽度" },
          { value: "height", label: "高度" },
          { value: "background-color", label: "背景颜色" },
          { value: "border-radius", label: "圆角" },
          { value: "padding", label: "内边距" },
          { value: "margin", label: "外边距" },
          { value: "border-color", label: "边框颜色" },
          { value: "border-width", label: "边框宽度" },
          { value: "box-shadow", label: "阴影" }
        ];
      case "divider":
        return [
          { value: "divider", label: "分割线尺寸" },
          { value: "color", label: "分割线颜色" },
          { value: "border-width", label: "线宽" }
        ];
      default:
        return [
          { value: "width", label: "宽度" },
          { value: "height", label: "高度" },
          { value: "color", label: "文字颜色" },
          { value: "font-size", label: "文字大小" },
          { value: "font-family", label: "字体" },
          { value: "font-weight", label: "字重" },
          { value: "line-height", label: "行高" },
          { value: "border-radius", label: "圆角" },
          { value: "background-color", label: "背景颜色" },
          { value: "padding", label: "内边距" },
          { value: "border-color", label: "边框颜色" },
          { value: "border-width", label: "边框宽度" },
          { value: "box-shadow", label: "阴影" }
        ];
    }
  }

  function metricLabel(metric) {
    var labels = {
      "size": "尺寸",
      "width": "宽度",
      "height": "高度",
      "font-size": "文字大小",
      "line-height": "行高",
      "font-weight": "字重",
      "font-family": "字体",
      "color": "文字颜色",
      "background-color": "背景颜色",
      "border-radius": "圆角",
      "padding": "内边距",
      "margin": "外边距",
      "divider": "分割线尺寸",
      "border-color": "边框颜色",
      "border-width": "边框宽度",
      "box-shadow": "阴影",
      "letter-spacing": "字间距"
    };
    return labels[metric] || metric;
  }

  function annotationStyle() {
    return (state.workingData && state.workingData.ui && state.workingData.ui.annotationStyle) || "panel";
  }

  function nextAnnotationId() {
    var generated = "A-" + String(state.indexSequence).padStart(3, "0");
    while (state.indexRegistry && Object.prototype.hasOwnProperty.call(state.indexRegistry, generated)) {
      state.indexSequence += 1;
      generated = "A-" + String(state.indexSequence).padStart(3, "0");
    }
    state.indexSequence += 1;
    return generated;
  }

  function ensureAnnotationIds(data) {
    if (!data || !data.annotations) return;
    var seen = {};
    var sequence = 1;
    data.annotations.forEach(function (item) {
      if (item.id && !seen[item.id]) {
        seen[item.id] = true;
        var match = String(item.id).match(/(\d+)$/);
        if (match) {
          sequence = Math.max(sequence, (parseInt(match[1], 10) || 0) + 1);
        }
        return;
      }

      var generated = "A-" + String(sequence).padStart(3, "0");
      while (seen[generated]) {
        sequence += 1;
        generated = "A-" + String(sequence).padStart(3, "0");
      }
      item.id = generated;
      seen[generated] = true;
      sequence += 1;
    });
  }

  function annotationIdentityKey(item) {
    if (!item || !item.selector) return "";
    var key = [
      item.kind || "",
      item.selector,
      item.part || "",
      item.textHint || ""
    ].join("|");
    if (item.kind === "spacing" && item.compareTo && item.compareTo[0]) {
      key += "|" + [
        item.compareTo[0].selector || "",
        item.compareTo[0].part || "",
        item.compareTo[0].axis || ""
      ].join("|");
    }
    return key;
  }

  function registerAnnotationIdentity(item) {
    if (!item || !item.id) return item && item.id;
    var key = annotationIdentityKey(item);
    if (key) {
      state.indexRegistry[key] = item.id;
    }
    state.indexRegistry[item.id] = true;
    var match = String(item.id).match(/(\d+)$/);
    if (match) {
      state.indexSequence = Math.max(state.indexSequence, (parseInt(match[1], 10) || 0) + 1);
    }
    return item.id;
  }

  function ensureStableAnnotationId(item) {
    var key = annotationIdentityKey(item);
    if (key && state.indexRegistry[key]) {
      item.id = state.indexRegistry[key];
      return item.id;
    }
    if (!item.id) {
      item.id = nextAnnotationId();
    }
    registerAnnotationIdentity(item);
    return item.id;
  }

  function buildMetricMap(element, item, rectOverride) {
    var style = window.getComputedStyle(element);
    var rect = rectOverride || pageRect(element.getBoundingClientRect());
    var metrics = {};
    metrics["size"] = roundPx(rect.width) + " x " + roundPx(rect.height);
    metrics["width"] = roundPx(rect.width) + "px";
    metrics["height"] = roundPx(rect.height) + "px";
    metrics["font-size"] = style.fontSize;
    metrics["line-height"] = style.lineHeight;
    metrics["font-weight"] = style.fontWeight;
    metrics["font-family"] = String(style.fontFamily || "").split(",")[0].trim().replace(/^["']|["']$/g, "");
    metrics["letter-spacing"] = style.letterSpacing;
    metrics["color"] = rgbToHex(style.color);
    metrics["background-color"] = rgbToHex(style.backgroundColor);
    metrics["border-radius"] = compressBoxValues(style, "border-radius");
    metrics["padding"] = compressBoxValues(style, "padding");
    metrics["margin"] = compressBoxValues(style, "margin");
    metrics["border-color"] = rgbToHex(style.borderColor);
    metrics["border-width"] = compressBoxValues(style, "border-width");
    metrics["box-shadow"] = style.boxShadow === "none" ? "无" : style.boxShadow;
    metrics["divider"] = roundPx(rect.width) + " x " + roundPx(rect.height) + " / " + rgbToHex(style.backgroundColor || style.borderColor);

    if (item.metricOverrides) {
      Object.keys(item.metricOverrides).forEach(function (key) {
        metrics[key] = item.metricOverrides[key];
      });
    }

    if (item.mode === "override" && item.overrides) {
      Object.keys(item.overrides).forEach(function (key) {
        metrics[key] = item.overrides[key];
      });
    }

    return metrics;
  }

  function spacingValue(sourceRect, targetRect, axis) {
    if (axis === "horizontal") {
      return roundPx(targetRect.left - sourceRect.right);
    }
    return roundPx(targetRect.top - sourceRect.bottom);
  }

  function createOverlayRoot() {
    var root = document.createElement("div");
    root.id = "hso-overlay-root";
    document.body.appendChild(root);
    return root;
  }

  function isOverlayNode(node) {
    if (!node || !node.closest) return false;
    return !!node.closest("#hso-control-panel, #hso-editor, #hso-overlay-root");
  }

  function uniqueSelector(selector, element) {
    if (!selector) return false;
    try {
      var nodes = document.querySelectorAll(selector);
      return nodes.length === 1 && nodes[0] === element;
    } catch (error) {
      return false;
    }
  }

  function stableClassNames(element) {
    if (!element.classList || !element.classList.length) return [];
    return Array.from(element.classList).filter(function (className) {
      if (!className) return false;
      if (className.length > 48) return false;
      if (/^(active|selected|hover|focus|disabled|open|close|show|hide)$/i.test(className)) return false;
      if (/^(css|jsx|sc|emotion)-/i.test(className)) return false;
      if (/__[A-Za-z0-9]+__[A-Za-z0-9]+/.test(className)) return false;
      if (/\d{4,}/.test(className)) return false;
      if (/^[A-Fa-f0-9_-]{10,}$/.test(className)) return false;
      return true;
    });
  }

  function elementSegment(element) {
    var tag = element.tagName.toLowerCase();
    if (element.id && uniqueSelector("#" + cssEscape(element.id.trim()), element)) {
      return "#" + cssEscape(element.id.trim());
    }

    var preferredAttrs = [
      "data-testid",
      "data-test",
      "data-qa",
      "data-cy",
      "data-role",
      "name",
      "aria-label",
      "placeholder",
      "title"
    ];

    for (var i = 0; i < preferredAttrs.length; i += 1) {
      var attrName = preferredAttrs[i];
      var attrValue = element.getAttribute && element.getAttribute(attrName);
      if (!attrValue) continue;
      var attrSelector = tag + "[" + attrName + "=\"" + cssEscape(attrValue) + "\"]";
      if (uniqueSelector(attrSelector, element)) {
        return attrSelector;
      }
    }

    var stableClasses = stableClassNames(element);
    if (stableClasses.length) {
      for (var size = Math.min(3, stableClasses.length); size >= 1; size -= 1) {
        for (var start = 0; start <= stableClasses.length - size; start += 1) {
          var classes = stableClasses.slice(start, start + size);
          var classSelector = tag + classes.map(function (className) {
            return "." + cssEscape(className);
          }).join("");
          if (uniqueSelector(classSelector, element)) {
            return classSelector;
          }
        }
      }
    }

    var parent = element.parentElement;
    if (!parent) return tag;
    var siblings = Array.from(parent.children).filter(function (node) {
      return node.tagName === element.tagName;
    });
    var index = siblings.indexOf(element);
    var base = tag;
    if (stableClasses.length) {
      base += "." + cssEscape(stableClasses[0]);
    }
    return base + ":nth-of-type(" + (index + 1) + ")";
  }

  function selectorFor(element) {
    if (!element || !element.tagName) return "";
    var direct = elementSegment(element);
    if (uniqueSelector(direct, element)) {
      return direct;
    }

    var chain = [element];
    var parent = element.parentElement;
    while (parent && chain.length < 5 && parent !== document.body) {
      chain.unshift(parent);
      parent = parent.parentElement;
    }

    var selector = "";
    for (var i = 0; i < chain.length; i += 1) {
      var segment = elementSegment(chain[i]);
      selector = selector ? selector + " > " + segment : segment;
      if (uniqueSelector(selector, element)) {
        return selector;
      }
    }

    return selector || element.tagName.toLowerCase();
  }

  function inferKind(element) {
    if (!element) return "region";
    var tag = element.tagName.toLowerCase();
    var className = String(element.className || "");
    if (/(button|btn|input|field|checkbox|radio|switch|tab|tag|badge|chip|select)/i.test(className)) return "control";
    if (/(title|text|label|caption|headline|desc|copy|lead)/i.test(className)) return "text";
    if (/(divider|line|separator)/i.test(className)) return "divider";
    if (tag === "button" || tag === "input" || tag === "textarea" || tag === "select") return "control";
    if (tag === "hr") return "divider";
    if (/^h[1-6]$/.test(tag) || /^(p|label|span|strong|b|em|small|th|td|li|a)$/i.test(tag)) return "text";
    return "region";
  }

  function elementDepth(element) {
    var depth = 0;
    var current = element;
    while (current && current.parentElement) {
      depth += 1;
      current = current.parentElement;
    }
    return depth;
  }

  function ownText(element) {
    if (!element || !element.childNodes) return "";
    return Array.from(element.childNodes).filter(function (node) {
      return node.nodeType === Node.TEXT_NODE;
    }).map(function (node) {
      return node.textContent || "";
    }).join(" ").replace(/\s+/g, " ").trim();
  }

  function textNodeRects(textNode) {
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return [];
    var content = String(textNode.textContent || "").replace(/\s+/g, " ").trim();
    if (!content) return [];
    var range = document.createRange();
    range.selectNodeContents(textNode);
    return Array.from(range.getClientRects()).filter(function (rect) {
      return rect.width > 0 && rect.height > 0;
    });
  }

  function rectContainsPoint(rect, clientX, clientY) {
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  function unionPageRect(rects) {
    if (!rects || !rects.length) return null;
    var first = rects[0];
    var bounds = {
      left: first.left,
      top: first.top,
      right: first.right,
      bottom: first.bottom
    };
    rects.slice(1).forEach(function (rect) {
      bounds.left = Math.min(bounds.left, rect.left);
      bounds.top = Math.min(bounds.top, rect.top);
      bounds.right = Math.max(bounds.right, rect.right);
      bounds.bottom = Math.max(bounds.bottom, rect.bottom);
    });
    return pageRect({
      left: bounds.left,
      top: bounds.top,
      right: bounds.right,
      bottom: bounds.bottom,
      width: bounds.right - bounds.left,
      height: bounds.bottom - bounds.top
    });
  }

  function textDescriptorFromNode(textNode, clientX, clientY) {
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return null;
    var parent = textNode.parentElement;
    if (!parent || isOverlayNode(parent)) return null;
    var text = String(textNode.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return null;

    var rects = textNodeRects(textNode);
    if (!rects.length) return null;

    var chosenRects = rects.filter(function (rect) {
      return rectContainsPoint(rect, clientX, clientY);
    });
    if (!chosenRects.length) return null;

    return createTargetDescriptor(parent, {
      kind: "text",
      part: "text",
      rectOverride: unionPageRect(chosenRects),
      label: "当前文字",
      textHint: text.slice(0, 80)
    });
  }

  function textDescriptorForElement(element, textHint) {
    if (!element || !element.tagName) return null;
    var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var value = String(node.textContent || "").replace(/\s+/g, " ").trim();
        return value ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var textNode = null;
    while (walker.nextNode()) {
      var current = walker.currentNode;
      var value = String(current.textContent || "").replace(/\s+/g, " ").trim();
      if (!textHint || value.indexOf(textHint) >= 0 || textHint.indexOf(value) >= 0) {
        textNode = current;
        break;
      }
      if (!textNode) {
        textNode = current;
      }
    }
    if (!textNode) return null;
    var rect = unionPageRect(textNodeRects(textNode));
    if (!rect) return null;
    return createTargetDescriptor(textNode.parentElement || element, {
      kind: "text",
      part: "text",
      rectOverride: rect,
      label: "当前文字",
      textHint: String(textNode.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80)
    });
  }

  function textDescriptorForPoint(clientX, clientY) {
    var textNode = null;

    if (document.caretRangeFromPoint) {
      var range = document.caretRangeFromPoint(clientX, clientY);
      if (range && range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
        textNode = range.startContainer;
      }
    } else if (document.caretPositionFromPoint) {
      var position = document.caretPositionFromPoint(clientX, clientY);
      if (position && position.offsetNode && position.offsetNode.nodeType === Node.TEXT_NODE) {
        textNode = position.offsetNode;
      }
    }

    return textDescriptorFromNode(textNode, clientX, clientY);
  }

  function hasVisibleText(element) {
    var text = ownText(element);
    if (text) return true;
    if (/^(button|a|label|span|p|strong|b|em|small|th|td|li|h[1-6])$/i.test(element.tagName)) {
      return String(element.textContent || "").replace(/\s+/g, " ").trim().length > 0;
    }
    return false;
  }

  function looksLikeStandaloneVisual(element, rect) {
    var style = window.getComputedStyle(element);
    var hasBackground = style.backgroundColor && !/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/i.test(style.backgroundColor);
    var hasBorder = parseFloat(style.borderTopWidth) > 0 || parseFloat(style.borderRightWidth) > 0 || parseFloat(style.borderBottomWidth) > 0 || parseFloat(style.borderLeftWidth) > 0;
    var hasRadius = style.borderRadius && style.borderRadius !== "0px";
    var hasShadow = style.boxShadow && style.boxShadow !== "none";
    if (rect.width <= 0 || rect.height <= 0) return false;
    return hasBackground || hasBorder || hasRadius || hasShadow;
  }

  function isSelectableElement(element) {
    if (!element || !element.tagName) return false;
    if (isOverlayNode(element)) return false;
    if (element === document.body || element === document.documentElement) return false;
    var tag = element.tagName.toLowerCase();
    var className = String(element.className || "");
    var rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    var style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") === 0) {
      return false;
    }
    if (tag === "button" || tag === "input" || tag === "textarea" || tag === "select" || tag === "a") return true;
    if (/^(h[1-6]|p|label|span|strong|b|em|small|th|td|li)$/i.test(tag) && hasVisibleText(element)) return true;
    if (tag === "hr") return true;
    if (/(divider|line|separator|split)/i.test(className)) return true;
    if ((rect.width >= 8 && rect.height <= 6) || (rect.height >= 8 && rect.width <= 6)) return true;
    if (/^(div|section|article|aside|nav|main|header|footer)$/i.test(tag) &&
      /(button|btn|input|field|checkbox|radio|switch|tab|tag|badge|chip|card|item|row|title|label|text|notice|panel|block|hero|sidebar|status|footer|link)/i.test(className)) {
      return true;
    }
    if (/^(div|section|article|aside|nav|main|header|footer)$/i.test(tag) && hasVisibleText(element) && element.children.length <= 1) {
      return true;
    }
    if (/^(div|span|i|svg)$/i.test(tag) && rect.width <= 64 && rect.height <= 64 && looksLikeStandaloneVisual(element, rect)) {
      return true;
    }
    return false;
  }

  function createTargetDescriptor(element, extra) {
    if (!element) return null;
    var descriptor = {
      element: element,
      selector: selectorFor(element),
      kind: inferKind(element),
      part: null,
      rectOverride: null,
      metricOverrides: null,
      label: null
    };
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        descriptor[key] = extra[key];
      });
    }
    return descriptor;
  }

  function targetElement(target) {
    return target && target.element ? target.element : target;
  }

  function targetRect(target) {
    var element = targetElement(target);
    if (!element) return null;
    return target && target.rectOverride ? target.rectOverride : pageRect(element.getBoundingClientRect());
  }

  function targetSelector(target) {
    var element = targetElement(target);
    if (!element) return "";
    return target && target.selector ? target.selector : selectorFor(element);
  }

  function targetKind(target) {
    var element = targetElement(target);
    if (!element) return "region";
    return target && target.kind ? target.kind : inferKind(element);
  }

  function elementAndAncestors(element, limit) {
    var nodes = [];
    var current = element;
    var max = limit || 5;
    while (current && current.tagName && nodes.length < max && current !== document.documentElement) {
      if (!isOverlayNode(current)) {
        nodes.push(current);
      }
      current = current.parentElement;
    }
    return nodes;
  }

  function borderDescriptorForPart(element, side) {
    if (!element || !side) return null;
    var style = window.getComputedStyle(element);
    var rect = element.getBoundingClientRect();
    var sideName = side.charAt(0).toUpperCase() + side.slice(1);
    var width = parseFloat(style["border" + sideName + "Width"] || "0");
    if (width <= 0) return null;

    var color = rgbToHex(style["border" + sideName + "Color"] || style.borderColor);
    var box = pageRect(rect);
    var lineRect;
    if (side === "top" || side === "bottom") {
      lineRect = {
        left: box.left,
        top: side === "top" ? box.top : box.bottom - width,
        width: box.width,
        height: Math.max(1, width)
      };
    } else {
      lineRect = {
        left: side === "left" ? box.left : box.right - width,
        top: box.top,
        width: Math.max(1, width),
        height: box.height
      };
    }
    lineRect.right = lineRect.left + lineRect.width;
    lineRect.bottom = lineRect.top + lineRect.height;

    return createTargetDescriptor(element, {
      kind: "divider",
      part: side,
      rectOverride: lineRect,
      metricOverrides: {
        "divider": roundPx(lineRect.width) + " x " + roundPx(lineRect.height) + " / " + color,
        "color": color,
        "border-width": roundPx(width) + "px"
      },
      label: "当前分割线"
    });
  }

  function borderDescriptorForPoint(element, clientX, clientY) {
    if (!element || !element.tagName || isOverlayNode(element)) return null;
    var style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") === 0) {
      return null;
    }

    var rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;

    var threshold = state.spacingPickMode ? 10 : 7;
    var candidates = [];
    [
      { side: "top", distance: Math.abs(clientY - rect.top), width: parseFloat(style.borderTopWidth || "0") },
      { side: "right", distance: Math.abs(clientX - rect.right), width: parseFloat(style.borderRightWidth || "0") },
      { side: "bottom", distance: Math.abs(clientY - rect.bottom), width: parseFloat(style.borderBottomWidth || "0") },
      { side: "left", distance: Math.abs(clientX - rect.left), width: parseFloat(style.borderLeftWidth || "0") }
    ].forEach(function (item) {
      if (item.width <= 0) return;
      if (item.distance <= Math.max(threshold, item.width + 2)) {
        candidates.push(item);
      }
    });

    if (!candidates.length) return null;
    candidates.sort(function (a, b) {
      return a.distance - b.distance;
    });
    return borderDescriptorForPart(element, candidates[0].side);
  }

  function candidateScore(target, clientX, clientY) {
    var element = targetElement(target);
    var rect = targetRect(target);
    if (!element || !rect) return -Infinity;
    var area = Math.max(1, rect.width * rect.height);
    var tag = element.tagName.toLowerCase();
    var className = String(element.className || "");
    var score = 0;
    var kind = targetKind(target);

    score += Math.min(500, elementDepth(element) * 4);
    score -= Math.min(220, area / 1800);

    if (/^(span|label|strong|b|em|small|a)$/i.test(tag)) score += 140;
    if (/^(p|th|td|li|h[1-6])$/i.test(tag)) score += 110;
    if (/^(button|input|textarea|select)$/i.test(tag)) score += 100;
    if (/^(hr)$/i.test(tag)) score += 120;
    if (/^(section|article|aside|main|header|footer|table|thead|tbody|tr|div)$/i.test(tag)) score += 24;
    if (hasVisibleText(element)) score += 80;
    if (/(divider|line|separator|split)/i.test(className)) score += 90;
    if (/(panel|card|shell|workspace|sidebar|main|table|doc|footer|notice|report|chat|head|grid|row|list|wrap|container)/i.test(className)) score += 120;
    if ((rect.width >= 8 && rect.height <= 6) || (rect.height >= 8 && rect.width <= 6)) score += 90;
    if (target && target.part) score += 220;
    if (target && target.part === "text") score += 320;
    if (kind === "control") score += 65;
    if (kind === "region") score += 35;
    if (kind === "divider" && state.spacingPickMode) score += 420;

    if (clientX !== undefined && clientY !== undefined) {
      var within = rectContainsPoint({
        left: rect.left - 4,
        top: rect.top - 4,
        right: rect.right + 4,
        bottom: rect.bottom + 4
      }, clientX, clientY);
      if (within) score += 60;
    }

    return score;
  }

  function resolveSelectableTargetFromPoint(clientX, clientY, options) {
    var settings = options || {};
    var strict = !!settings.strict;
    var probeOffsets = strict ? [[0, 0]] : [
      [0, 0], [0, -2], [0, 2], [-2, 0], [2, 0], [-4, 0], [4, 0], [0, -4], [0, 4]
    ];
    var candidates = [];
    var seen = {};

    var textTarget = textDescriptorForPoint(clientX, clientY);
    if (textTarget) {
      seen[targetSelector(textTarget) + "::text"] = true;
      candidates.push(textTarget);
    }

    probeOffsets.forEach(function (offset) {
      var stack = document.elementsFromPoint(clientX + offset[0], clientY + offset[1]) || [];
      stack.forEach(function (element) {
        elementAndAncestors(element, strict ? 4 : 6).forEach(function (candidateElement) {
          var borderTarget = borderDescriptorForPoint(candidateElement, clientX, clientY);
          if (borderTarget) {
            var borderKey = targetSelector(borderTarget) + "::" + (borderTarget.part || "");
            if (!seen[borderKey]) {
              seen[borderKey] = true;
              candidates.push(borderTarget);
            }
          }
        });

        if (!isSelectableElement(element)) return;
        var descriptor = createTargetDescriptor(element);
        var key = targetSelector(descriptor) + "::" + (descriptor.part || "element");
        if (!seen[key]) {
          seen[key] = true;
          candidates.push(descriptor);
        }
      });
    });

    if (!candidates.length) return null;
    candidates.sort(function (a, b) {
      return candidateScore(b, clientX, clientY) - candidateScore(a, clientX, clientY);
    });
    return candidates[0];
  }

  function stringifyWorkingData() {
    return JSON.stringify(state.workingData, null, 2);
  }

  function clearModes() {
    state.pickMode = true;
    state.spacingPickMode = false;
    state.hoverElement = null;
    state.spacingSource = null;
    removePickerVisuals();
    removeSourceVisuals();
  }

  function clearSelection() {
    state.selectedAnnotation = null;
    render();
  }

  function copyText(text, message) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        window.alert(message || "Copied.");
      });
      return;
    }
    window.prompt("Copy the text below:", text);
  }

  function removeEditor() {
    var editor = document.getElementById("hso-editor");
    if (editor) editor.remove();
  }

  function applyPanelPosition(panel) {
    panel.style.top = state.panelPosition.top + "px";
    if (state.panelPosition.left === null) {
      panel.style.right = "16px";
      panel.style.left = "auto";
    } else {
      panel.style.left = state.panelPosition.left + "px";
      panel.style.right = "auto";
    }
  }

  function makePanelDraggable(panel) {
    var handle = panel.querySelector(".hso-panel-title");
    if (!handle) return;

    handle.addEventListener("mousedown", function (event) {
      var rect = panel.getBoundingClientRect();
      var offsetX = event.clientX - rect.left;
      var offsetY = event.clientY - rect.top;

      function onMove(moveEvent) {
        state.panelPosition.left = Math.max(8, moveEvent.clientX - offsetX);
        state.panelPosition.top = Math.max(8, moveEvent.clientY - offsetY);
        applyPanelPosition(panel);
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove, true);
        document.removeEventListener("mouseup", onUp, true);
      }

      document.addEventListener("mousemove", onMove, true);
      document.addEventListener("mouseup", onUp, true);
      event.preventDefault();
    });
  }

  function removePickerVisuals() {
    var box = document.getElementById("hso-picker-box");
    var tag = document.getElementById("hso-picker-tag");
    if (box) box.remove();
    if (tag) tag.remove();
  }

  function removeSourceVisuals() {
    var box = document.getElementById("hso-spacing-source-box");
    var tag = document.getElementById("hso-spacing-source-tag");
    if (box) box.remove();
    if (tag) tag.remove();
  }

  function indicatorRect(rect) {
    if (!rect) return null;
    var minThickness = 8;
    var displayRect = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
    if (displayRect.width < minThickness) {
      displayRect.left -= (minThickness - displayRect.width) / 2;
      displayRect.width = minThickness;
    }
    if (displayRect.height < minThickness) {
      displayRect.top -= (minThickness - displayRect.height) / 2;
      displayRect.height = minThickness;
    }
    return displayRect;
  }

  function updatePickerVisual(target) {
    removePickerVisuals();
    if ((!state.pickMode && !state.spacingPickMode) || !target) return;

    var rect = indicatorRect(targetRect(target));
    if (!rect) return;
    var box = document.createElement("div");
    box.id = "hso-picker-box";
    box.style.left = rect.left + "px";
    box.style.top = rect.top + "px";
    box.style.width = rect.width + "px";
    box.style.height = rect.height + "px";

    var tag = document.createElement("div");
    tag.id = "hso-picker-tag";
    tag.style.left = rect.left + "px";
    tag.style.top = Math.max(0, rect.top - 24) + "px";
    tag.textContent = "可选对象";

    document.body.appendChild(box);
    document.body.appendChild(tag);
  }

  function updateSourceVisual(target) {
    removeSourceVisuals();
    if (!state.spacingPickMode || !target) return;

    var rect = indicatorRect(targetRect(target));
    if (!rect) return;
    var box = document.createElement("div");
    box.id = "hso-spacing-source-box";
    box.style.left = rect.left + "px";
    box.style.top = rect.top + "px";
    box.style.width = rect.width + "px";
    box.style.height = rect.height + "px";

    var tag = document.createElement("div");
    tag.id = "hso-spacing-source-tag";
    tag.style.left = rect.left + "px";
    tag.style.top = Math.max(0, rect.top - 24) + "px";
    tag.textContent = "已选第一个对象";

    document.body.appendChild(box);
    document.body.appendChild(tag);
  }

  function panelNote() {
    if (state.spacingPickMode && state.spacingSource) {
      return "已选中第一个对象，请继续点击第二个对象，创建间距标注。";
    }
    if (state.spacingPickMode) {
      return "间距模式已开启，依次点击两个对象即可创建间距标注。";
    }
    if (state.pickMode) {
      return "页面默认可直接选择控件。点击对象后，会直接展示当前对象的属性值。";
    }
    return "选择控件可创建属性标注，选择间距可创建两个对象之间的间距标注。";
  }

  function renderPanel() {
    var old = document.getElementById("hso-control-panel");
    if (old) old.remove();

    var data = state.workingData || { annotations: [] };
    var panel = document.createElement("div");
    panel.id = "hso-control-panel";
    panel.innerHTML =
      "<h3 class='hso-panel-title'>" + (data.pageLabel || "HTML Spec Overlay") + "</h3>" +
      "<div class='hso-panel-row'><span class='hso-chip'>" + (state.selectedAnnotation ? "当前已选中 1 个对象" : "当前未选中对象") + "</span><button class='hso-toggle' data-role='toggle'>" + (state.visible ? "隐藏当前标注" : "显示当前标注") + "</button></div>" +
      "<div class='hso-panel-row'><button class='hso-toggle' data-role='pick'>" + (state.pickMode ? "控件可选中" : "开启控件选择") + "</button><button class='hso-toggle' data-role='pick-spacing'>" + (state.spacingPickMode ? "退出间距" : "选择间距") + "</button></div>" +
      "<div class='hso-panel-row'><button class='hso-toggle' data-role='clear-selection'>清空当前选择</button></div>" +
      "<div class='hso-note'>" + panelNote() + "</div>";

    panel.querySelector("[data-role='toggle']").addEventListener("click", function () {
      state.visible = !state.visible;
      render();
      renderPanel();
    });

    panel.querySelector("[data-role='pick']").addEventListener("click", function () {
      state.pickMode = true;
      state.spacingPickMode = false;
      state.spacingSource = null;
      removeSourceVisuals();
      renderPanel();
    });

    panel.querySelector("[data-role='pick-spacing']").addEventListener("click", function () {
      if (state.spacingPickMode) {
        state.spacingPickMode = false;
        state.pickMode = true;
        state.spacingSource = null;
        removeSourceVisuals();
      } else {
        removeEditor();
        state.spacingPickMode = true;
        state.pickMode = false;
        state.spacingSource = null;
      }
      renderPanel();
    });

    panel.querySelector("[data-role='clear-selection']").addEventListener("click", function () {
      clearSelection();
      renderPanel();
    });

    document.body.appendChild(panel);
    applyPanelPosition(panel);
    makePanelDraggable(panel);
  }

  function drawLeaderLine(root, startX, startY, endX, endY) {
    var line = document.createElement("div");
    line.className = "hso-callout-line";
    var dx = endX - startX;
    var dy = endY - startY;
    var length = Math.sqrt(dx * dx + dy * dy);
    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
    line.style.left = startX + "px";
    line.style.top = startY + "px";
    line.style.width = length + "px";
    line.style.transform = "rotate(" + angle + "deg)";
    root.appendChild(line);
  }

  function rectsOverlap(a, b, padding) {
    var gap = padding || 0;
    return !(a.right + gap <= b.left || a.left - gap >= b.right || a.bottom + gap <= b.top || a.top - gap >= b.bottom);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function overlapArea(a, b) {
    var width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    var height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return width * height;
  }

  function chooseCalloutPosition(panel, rect) {
    panel.style.left = "-99999px";
    panel.style.top = "-99999px";
    panel.style.visibility = "hidden";

    var panelWidth = panel.offsetWidth || 220;
    var panelHeight = panel.offsetHeight || 96;
    var viewport = {
      left: window.scrollX,
      top: window.scrollY,
      right: window.scrollX + document.documentElement.clientWidth,
      bottom: window.scrollY + document.documentElement.clientHeight
    };
    var viewportCenterX = (viewport.left + viewport.right) / 2;
    var viewportCenterY = (viewport.top + viewport.bottom) / 2;
    var rectCenterX = rect.left + rect.width / 2;
    var rectCenterY = rect.top + rect.height / 2;
    var horizontalPreference = rectCenterX <= viewportCenterX ? "right" : "left";
    var verticalPreference = rectCenterY <= viewportCenterY ? "bottom" : "top";
    var gap = 24;

    function buildCandidate(left, top, anchor, priority) {
      var clampedLeft = clamp(left, viewport.left + 12, Math.max(viewport.left + 12, viewport.right - panelWidth - 12));
      var clampedTop = clamp(top, viewport.top + 12, Math.max(viewport.top + 12, viewport.bottom - panelHeight - 12));
      return {
        left: clampedLeft,
        top: clampedTop,
        right: clampedLeft + panelWidth,
        bottom: clampedTop + panelHeight,
        anchor: anchor,
        priority: priority || 0
      };
    }

    var candidates = [];
    var rightPositions = [
      buildCandidate(rect.right + gap, rectCenterY - panelHeight / 2, "right", horizontalPreference === "right" ? 0 : 40),
      buildCandidate(rect.right + gap, rect.top, "right", horizontalPreference === "right" ? 4 : 44),
      buildCandidate(rect.right + gap, rect.bottom - panelHeight, "right", horizontalPreference === "right" ? 8 : 48)
    ];
    var leftPositions = [
      buildCandidate(rect.left - panelWidth - gap, rectCenterY - panelHeight / 2, "left", horizontalPreference === "left" ? 0 : 40),
      buildCandidate(rect.left - panelWidth - gap, rect.top, "left", horizontalPreference === "left" ? 4 : 44),
      buildCandidate(rect.left - panelWidth - gap, rect.bottom - panelHeight, "left", horizontalPreference === "left" ? 8 : 48)
    ];
    var bottomPositions = [
      buildCandidate(rectCenterX - panelWidth / 2, rect.bottom + gap, "bottom", verticalPreference === "bottom" ? 12 : 52),
      buildCandidate(rect.left, rect.bottom + gap, "bottom", verticalPreference === "bottom" ? 16 : 56),
      buildCandidate(rect.right - panelWidth, rect.bottom + gap, "bottom", verticalPreference === "bottom" ? 20 : 60)
    ];
    var topPositions = [
      buildCandidate(rectCenterX - panelWidth / 2, rect.top - panelHeight - gap, "top", verticalPreference === "top" ? 12 : 52),
      buildCandidate(rect.left, rect.top - panelHeight - gap, "top", verticalPreference === "top" ? 16 : 56),
      buildCandidate(rect.right - panelWidth, rect.top - panelHeight - gap, "top", verticalPreference === "top" ? 20 : 60)
    ];

    if (horizontalPreference === "right") {
      candidates = candidates.concat(rightPositions, leftPositions);
    } else {
      candidates = candidates.concat(leftPositions, rightPositions);
    }
    if (verticalPreference === "bottom") {
      candidates = candidates.concat(bottomPositions, topPositions);
    } else {
      candidates = candidates.concat(topPositions, bottomPositions);
    }

    candidates.push(buildCandidate(viewport.right - panelWidth - 16, viewport.top + 16, rectCenterX <= viewportCenterX ? "right" : "left", 200));
    candidates.push(buildCandidate(viewport.left + 16, viewport.top + 16, rectCenterX > viewportCenterX ? "left" : "right", 210));
    candidates.push(buildCandidate(viewport.right - panelWidth - 16, viewport.bottom - panelHeight - 16, rectCenterY <= viewportCenterY ? "right" : "left", 220));
    candidates.push(buildCandidate(viewport.left + 16, viewport.bottom - panelHeight - 16, rectCenterY <= viewportCenterY ? "left" : "right", 230));

    var best = null;
    candidates.forEach(function (candidate) {
      var overlap = overlapArea(candidate, rect);
      var distanceX = candidate.anchor === "right" ? Math.abs(candidate.left - rect.right) : candidate.anchor === "left" ? Math.abs(rect.left - candidate.right) : Math.abs((candidate.left + candidate.right) / 2 - rectCenterX);
      var distanceY = candidate.anchor === "bottom" ? Math.abs(candidate.top - rect.bottom) : candidate.anchor === "top" ? Math.abs(rect.top - candidate.bottom) : Math.abs((candidate.top + candidate.bottom) / 2 - rectCenterY);
      candidate.penalty = candidate.priority + overlap * 100 + distanceX * 0.08 + distanceY * 0.08;
      if (rectsOverlap(candidate, rect, 12)) {
        candidate.penalty += 400;
      }
      if (!best || candidate.penalty < best.penalty) {
        best = candidate;
      }
    });

    panel.style.visibility = "";
    return best || buildCandidate(rect.right + gap, rect.top, "right", 0);
  }

  function formatCalloutText(item, metrics) {
    var names = Object.keys(metrics);
    var prefix = item && item.id ? "[" + item.id + "] " : "";
    var label = item && item.label ? item.label : "";
    if (!names.length) return prefix + label;
    if (names.length === 1) {
      return prefix + (label || names[0]) + ": " + metrics[names[0]];
    }
    return prefix + names.map(function (name) {
      return metricLabel(name) + ": " + metrics[name];
    }).join(" / ");
  }

  function drawBox(root, rect, item, metrics, selector) {
    var box = document.createElement("div");
    box.className = "hso-box";
    box.style.left = rect.left + "px";
    box.style.top = rect.top + "px";
    box.style.width = rect.width + "px";
    box.style.height = rect.height + "px";

    function placePanelOutside(panel, placement) {
      panel.style.left = placement.left + "px";
      panel.style.top = placement.top + "px";
      panel.style.visibility = "";

      var startX;
      var startY;
      var endX;
      var endY;
      if (placement.anchor === "left") {
        startX = rect.left;
        startY = rect.top + rect.height / 2;
        endX = placement.left + panel.offsetWidth;
        endY = placement.top + panel.offsetHeight / 2;
      } else if (placement.anchor === "bottom") {
        startX = rect.left + rect.width / 2;
        startY = rect.bottom;
        endX = placement.left + panel.offsetWidth / 2;
        endY = placement.top;
      } else if (placement.anchor === "top") {
        startX = rect.left + rect.width / 2;
        startY = rect.top;
        endX = placement.left + panel.offsetWidth / 2;
        endY = placement.top + panel.offsetHeight;
      } else {
        startX = rect.right;
        startY = rect.top + rect.height / 2;
        endX = placement.left;
        endY = placement.top + panel.offsetHeight / 2;
      }
      drawLeaderLine(root, startX, startY, endX, endY);
    }

    if (annotationStyle() === "callout") {
      box.style.background = "transparent";
      root.appendChild(box);

      var panel = document.createElement("div");
      panel.className = "hso-label hso-callout-label";
      var lines = [];
      lines.push("<strong>" + escapeHtml(item.id ? item.id + " · " + (item.label || "当前对象") : (item.label || "当前对象")) + "</strong>");
      Object.keys(metrics).forEach(function (name) {
        lines.push("<span class='hso-metric'><b>" + escapeHtml(metricLabel(name)) + "</b>: " + escapeHtml(metrics[name]) + "</span>");
      });
      panel.innerHTML = lines.join("");

      root.appendChild(panel);

      var placement = chooseCalloutPosition(panel, rect);
      placePanelOutside(panel, placement);
      return;
    }

    var panel = document.createElement("div");
    panel.className = "hso-label hso-callout-label";

    var title = item.id ? item.id + " · " + (item.label || selector) : (item.label || selector);
    var lines = ["<strong>" + title + "</strong>", "<span class='hso-metric'><code>" + selector + "</code></span>"];
    Object.keys(metrics).forEach(function (name) {
      lines.push("<span class='hso-metric'>" + name + ": " + metrics[name] + "</span>");
    });
    panel.innerHTML = lines.join("");

    root.appendChild(box);
    root.appendChild(panel);
    placePanelOutside(panel, chooseCalloutPosition(panel, rect));
  }

  function drawSpacing(root, sourceRect, targetRect, axis, label) {
    var value = spacingValue(sourceRect, targetRect, axis);
    var line = document.createElement("div");
    line.className = "hso-spacing-line";

    var tag = document.createElement("div");
    tag.className = "hso-spacing-tag";
    tag.textContent = (label || "Gap") + ": " + value + "px";

    if (axis === "horizontal") {
      var left = sourceRect.right;
      var width = targetRect.left - sourceRect.right;
      var top = sourceRect.top + sourceRect.height / 2;
      line.style.left = left + "px";
      line.style.top = top + "px";
      line.style.width = Math.max(0, width) + "px";
      line.style.height = "var(--hso-line-thickness)";
      tag.style.left = left + Math.max(4, width / 2 - 30) + "px";
      tag.style.top = (top - 26) + "px";
    } else {
      var topGap = sourceRect.bottom;
      var height = targetRect.top - sourceRect.bottom;
      var leftGap = sourceRect.left + sourceRect.width / 2;
      line.style.left = leftGap + "px";
      line.style.top = topGap + "px";
      line.style.width = "var(--hso-line-thickness)";
      line.style.height = Math.max(0, height) + "px";
      tag.style.left = (leftGap + 8) + "px";
      tag.style.top = topGap + Math.max(4, height / 2 - 10) + "px";
    }

    root.appendChild(line);
    root.appendChild(tag);
  }

  function render() {
    var oldRoot = document.getElementById("hso-overlay-root");
    if (oldRoot) oldRoot.remove();
    if (!state.visible) return;
    var root = createOverlayRoot();

    root.style.height = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    ) + "px";

    var annotations = [];
    if (state.selectedAnnotation) {
      annotations = [state.selectedAnnotation];
    }

    annotations.forEach(function (item) {
      if (!item.selector) return;
      var target = resolveAnnotationTarget(item);
      if (!target) return;
      var element = targetElement(target);
      var rect = targetRect(target);
      var metricsToShow = item.metrics && item.metrics.length ? item.metrics : metricDefaults(item.kind || "control");
      var metricMap = buildMetricMap(element, {
        mode: item.mode,
        overrides: item.overrides,
        metricOverrides: target.metricOverrides
      }, rect);
      var filteredMetrics = {};
      metricsToShow.forEach(function (metric) {
        if (metricMap[metric] !== undefined) {
          filteredMetrics[metric] = metricMap[metric];
        }
      });

      if (item.kind !== "spacing" || Object.keys(filteredMetrics).length) {
        drawBox(root, rect, item, filteredMetrics, item.selector);
      }

      (item.compareTo || []).forEach(function (comparison) {
        if (!comparison.selector) return;
        var targetComparison = resolveAnnotationTarget(comparison);
        if (!targetComparison) return;
        drawSpacing(root, rect, targetRect(targetComparison), comparison.axis || "vertical", comparison.label || "Gap");
      });
    });
  }

  function resolveAnnotationTarget(item) {
    if (!item || !item.selector) return null;
    var element = document.querySelector(item.selector);
    if (!element) return null;
    if (item.part === "text") {
      return textDescriptorForElement(element, item.textHint) || createTargetDescriptor(element, {
        kind: "text",
        part: "text",
        label: item.label || "当前文字"
      });
    }
    if (item.part) {
      return borderDescriptorForPart(element, item.part);
    }
    return createTargetDescriptor(element, {
      kind: item.kind || inferKind(element),
      label: item.label || null
    });
  }

  function openEditorForElement(target) {
    var element = targetElement(target);
    if (!element) return;

    var selector = targetSelector(target);
    var kind = targetKind(target);
    var options = metricOptions(kind);
    var metrics = buildMetricMap(element, {
      mode: "actual",
      metricOverrides: target.metricOverrides
    }, targetRect(target));
    var metricValues = {};
    options.forEach(function (option) {
      if (metrics[option.value] !== undefined) {
        metricValues[option.value] = metrics[option.value];
      }
    });
    state.selectedAnnotation = {
      id: null,
      selector: selector,
      label: target.label || (kind === "divider" ? "当前分割线" : "当前对象"),
      kind: kind,
      part: target.part || null,
      textHint: target.textHint || null,
      mode: "actual",
      metrics: Object.keys(metricValues)
    };
    ensureStableAnnotationId(state.selectedAnnotation);
    state.visible = true;
    render();
    renderPanel();
  }

  function detectAxis(sourceRect, targetRect) {
    var horizontalDistance = Math.min(
      Math.abs(targetRect.left - sourceRect.right),
      Math.abs(sourceRect.left - targetRect.right)
    );
    var verticalDistance = Math.min(
      Math.abs(targetRect.top - sourceRect.bottom),
      Math.abs(sourceRect.top - targetRect.bottom)
    );

    if (horizontalDistance < verticalDistance) {
      return "horizontal";
    }
    return "vertical";
  }

  function normalizePair(sourceTarget, targetTarget, axis) {
    if (!sourceTarget || !targetTarget) {
      return { source: sourceTarget, target: targetTarget };
    }

    var sourceRect = targetRect(sourceTarget);
    var targetRectValue = targetRect(targetTarget);

    if (axis === "horizontal") {
      return sourceRect.left <= targetRectValue.left
        ? { source: sourceTarget, target: targetTarget }
        : { source: targetTarget, target: sourceTarget };
    }

    return sourceRect.top <= targetRectValue.top
      ? { source: sourceTarget, target: targetTarget }
      : { source: targetTarget, target: sourceTarget };
  }

  function mergeSpacingItem(item) {
    ensureStableAnnotationId(item);
    state.selectedAnnotation = item;
  }

  function openSpacingEditor(sourceTarget, targetTarget) {
    if (!sourceTarget || !targetTarget) return;

    var sourceElement = targetElement(sourceTarget);
    var targetElementValue = targetElement(targetTarget);
    if (!sourceElement || !targetElementValue) return;

    var sourceSelector = targetSelector(sourceTarget);
    var targetSelectorValue = targetSelector(targetTarget);
    var axis = detectAxis(
      targetRect(sourceTarget),
      targetRect(targetTarget)
    );
    var normalized = normalizePair(sourceTarget, targetTarget, axis);
    sourceSelector = targetSelector(normalized.source);
    targetSelectorValue = targetSelector(normalized.target);
    var gapValue = spacingValue(
      targetRect(normalized.source),
      targetRect(normalized.target),
      axis
    ) + "px";

    mergeSpacingItem({
      id: null,
      selector: sourceSelector,
      part: normalized.source.part || null,
      label: "当前间距",
      kind: "spacing",
      mode: "actual",
      metrics: [],
      compareTo: [{
        selector: targetSelectorValue,
        part: normalized.target.part || null,
        axis: axis,
        label: "间距"
      }]
    });
    state.visible = true;
    render();
    renderPanel();
  }

  function onMouseMove(event) {
    if (!state.pickMode && !state.spacingPickMode) return;
    if (isOverlayNode(event.target)) return;
    var target = resolveSelectableTargetFromPoint(event.clientX, event.clientY, { strict: false });
    if (!target) {
      state.hoverElement = null;
      removePickerVisuals();
      return;
    }
    state.hoverElement = target;
    updatePickerVisual(state.hoverElement);
  }

  function onClick(event) {
    if (isOverlayNode(event.target)) return;
    if (!state.pickMode && !state.spacingPickMode) {
      clearSelection();
      renderPanel();
      return;
    }
    var target = resolveSelectableTargetFromPoint(event.clientX, event.clientY, { strict: true });
    if (!target) {
      clearSelection();
      renderPanel();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    state.hoverElement = target;
    updatePickerVisual(state.hoverElement);

    if (state.pickMode) {
      openEditorForElement(state.hoverElement);
      return;
    }

    if (!state.spacingSource) {
      state.spacingSource = state.hoverElement;
      updateSourceVisual(state.spacingSource);
      renderPanel();
      return;
    }

      if (state.spacingSource === state.hoverElement) {
        return;
      }

    openSpacingEditor(state.spacingSource, state.hoverElement);
  }

  function onKeyDown(event) {
    if (event.key === "Escape" && (state.pickMode || state.spacingPickMode)) {
      clearModes();
      clearSelection();
      renderPanel();
    }
  }

  ready(function () {
    var data = window.__HTML_SPEC_OVERLAY__ || { annotations: [] };
    state.workingData = clone(data);
    state.workingData.annotations = state.workingData.annotations || [];
    ensureAnnotationIds(state.workingData);
    state.indexRegistry = {};
    state.indexSequence = 1;
    state.workingData.annotations.forEach(function (item) {
      registerAnnotationIdentity(item);
    });
    applyUiSettings(state.workingData.ui || {});
    state.visible = true;
    state.pickMode = true;
    renderPanel();
    render();
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", function () {
      render();
      updatePickerVisual(state.hoverElement);
      updateSourceVisual(state.spacingSource);
    });
    window.addEventListener("scroll", function () {
      render();
      updatePickerVisual(state.hoverElement);
      updateSourceVisual(state.spacingSource);
    }, { passive: true });
  });
})();
