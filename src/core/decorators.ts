/**
 * shaderUniforms — legacy class decorator (experimentalDecorators: true).
 *
 * Declares shader uniform names + default values in ONE place. Installs
 * getter/setter on the class prototype for each name, so assignments like
 * `this.uPlanetRadius = 6371` automatically write to
 * `this.material.uniforms.uPlanetRadius.value`.
 *
 * Requires the class to have a `material: ShaderMaterial` field whose uniforms
 * object contains every key from `defs`. Use `uniformsFromDefs(defs)` to build
 * it directly from the same source of truth.
 */
export function shaderUniforms<T extends Record<string, any>>(defs: T): ClassDecorator {
  return function (constructor: Function): void {
    for (const field of Object.keys(defs)) {
      const backingKey = `_${field}`;

      Object.defineProperty(constructor.prototype, field, {
        get(this: any) {
          return this[backingKey];
        },
        set(this: any, value: any) {
          this[backingKey] = value;
          if (this.material) {
            this.material.uniforms[field].value = value;
          }
        },
        configurable: true,
        enumerable: true,
      });
    }
  };
}
