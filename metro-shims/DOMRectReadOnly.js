const { setPlatformObject } = require('react-native/src/private/webapis/webidl/PlatformObjects');

function castToNumber(value) {
  return value ? Number(value) : 0;
}

class DOMRectReadOnly {
  constructor(x, y, width, height) {
    this.__setInternalX(x);
    this.__setInternalY(y);
    this.__setInternalWidth(width);
    this.__setInternalHeight(height);
  }

  get x() {
    return this.__getInternalX();
  }

  get y() {
    return this.__getInternalY();
  }

  get width() {
    return this.__getInternalWidth();
  }

  get height() {
    return this.__getInternalHeight();
  }

  get top() {
    const height = this.__getInternalHeight();
    const y = this.__getInternalY();

    return height < 0 ? y + height : y;
  }

  get right() {
    const width = this.__getInternalWidth();
    const x = this.__getInternalX();

    return width < 0 ? x : x + width;
  }

  get bottom() {
    const height = this.__getInternalHeight();
    const y = this.__getInternalY();

    return height < 0 ? y : y + height;
  }

  get left() {
    const width = this.__getInternalWidth();
    const x = this.__getInternalX();

    return width < 0 ? x + width : x;
  }

  toJSON() {
    const { x, y, width, height, top, left, bottom, right } = this;
    return { x, y, width, height, top, left, bottom, right };
  }

  static fromRect(rect) {
    if (!rect) {
      return new DOMRectReadOnly();
    }

    return new DOMRectReadOnly(rect.x, rect.y, rect.width, rect.height);
  }

  __getInternalX() {
    return this._x;
  }

  __getInternalY() {
    return this._y;
  }

  __getInternalWidth() {
    return this._width;
  }

  __getInternalHeight() {
    return this._height;
  }

  __setInternalX(x) {
    this._x = castToNumber(x);
  }

  __setInternalY(y) {
    this._y = castToNumber(y);
  }

  __setInternalWidth(width) {
    this._width = castToNumber(width);
  }

  __setInternalHeight(height) {
    this._height = castToNumber(height);
  }
}

setPlatformObject(DOMRectReadOnly, {
  clone: rect => new DOMRectReadOnly(rect.x, rect.y, rect.width, rect.height),
});

module.exports = DOMRectReadOnly;
module.exports.default = DOMRectReadOnly;