/**
 * shaderParam — legacy property decorator (experimentalDecorators: true).
 *
 * How it works:
 *   @shaderParam() myField!: number;
 *
 * Decorator is called one time during class creation
 * It replaces `myField` with setter/getter directly in the prototype
 * Value is `this._myField` (backing field).
 * Setter calls `this.setShaderParams({ uFoo: v })` each time the value changes
 */
export function shaderParam(): PropertyDecorator {
  return function (target: object, field: string | symbol): void {
    const backingKey = `_${String(field)}`;

    Object.defineProperty(target, field, {
      get(this: any): number {
        return this[backingKey];
      },
      set(this: any, v: number): void {
        this[backingKey] = v;
        this.setShaderParams({ [field]: v });
      },
      configurable: true,
      enumerable: true,
    });
  };
}
