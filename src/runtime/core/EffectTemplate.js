export class EffectTemplate {
  /**
   * @param {Object} data
   */
  constructor(data) {
    this.id = data.id;
    this.version = data.version;
    this.name = data.name;
    this.duration = data.duration;
    this.surface = { ...data.surface };
    this.emitters = data.emitters.map((emitter) => ({ ...emitter }));
    this.source = data.source ?? null;
  }

  /**
   * @returns {Object}
   */
  clone() {
    return {
      id: this.id,
      version: this.version,
      name: this.name,
      duration: this.duration,
      surface: { ...this.surface },
      emitters: this.emitters.map((emitter) => ({ ...emitter })),
      source: this.source,
    };
  }
}