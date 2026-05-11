/**
 * shaderUniforms — legacy class decorator (experimentalDecorators: true).
 *
 * Declares shader uniform names + default values in ONE place. Installs
 * getter/setter on the class prototype for each name, so assignments like
 * `this.radius = 6371` automatically write to
 * `this.material.uniforms.radius.value`.
 *
 * Requires the class to have a `material: ShaderMaterial` field whose uniforms
 * object contains every key from `defs`. Use `uniformsFromDefs(defs)` to build
 * it directly from the same source of truth.
 */
export function shaderUniforms<U, T extends Record<string, any> = {}>(
  defs: T,
  onSet?: (instance: U, field: string, value: any) => void,
): ClassDecorator {
  return function (constructor): void {
    for (const field of Object.keys(defs)) {
      const backingKey = `_${field}` as keyof U;

      Object.defineProperty<U>(constructor.prototype, field, {
        get(this: U) {
          return this[backingKey];
        },
        set(this, value: any) {
          this[backingKey] = value;
          onSet?.(this, field, value);
        },
        configurable: true,
        enumerable: true,
      });
    }
  };
}
