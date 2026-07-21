const DEFAULT_EMISSION = {
  type: 'burst',
  count: 1,
  rate: 10,
  interval: 0.1,
  startTime: 0,
  loop: false,
};

export class Emitter {
  /**
   * @param {Object} config
   * @param {Object} [options]
   */
  constructor(config, options = {}) {
    this.id = config.id;
    this.enabled = config.enabled !== false;
    this.shape = config.shape;
    this.emission = {
      ...DEFAULT_EMISSION,
      ...config.emission,
    };
    this.particle = config.particle ?? {};
    this.random = options.random ?? Math.random;
    this.burstDone = false;
    this.continuousAccumulator = 0;
    this.intervalElapsed = 0;
  }

  /**
   * @param {number} deltaTime
   * @param {number} previousAge
   * @param {number} currentAge
   * @returns {Object[]}
   */
  update(deltaTime, previousAge, currentAge) {
    return this.emit(deltaTime, previousAge, currentAge, []);
  }

  /**
   * @param {number} deltaTime
   * @param {number} previousAge
   * @param {number} currentAge
   * @param {Object[]} output
   * @returns {Object[]}
   */
  emit(deltaTime, previousAge, currentAge, output) {
    if (!this.enabled || currentAge < this.emission.startTime) {
      return output;
    }

    if (this.emission.type === 'burst') {
      return this.updateBurst(deltaTime, output);
    }

    if (this.emission.type === 'continuous') {
      return this.updateContinuous(deltaTime, output);
    }

    if (this.emission.type === 'interval') {
      return this.updateInterval(deltaTime, previousAge, output);
    }

    return output;
  }

  /**
   * @param {number} deltaTime
   * @param {Object[]} output
   * @returns {Object[]}
   */
  updateBurst(deltaTime, output = []) {
    if (!this.burstDone) {
      this.burstDone = true;
      this.intervalElapsed = 0;
      return this.spawn(this.emission.count, output);
    }

    if (!this.emission.loop) {
      return output;
    }

    this.intervalElapsed += deltaTime;

    if (this.intervalElapsed < this.emission.interval) {
      return output;
    }

    this.intervalElapsed %= this.emission.interval;
    return this.spawn(this.emission.count, output);
  }

  /**
   * @param {number} deltaTime
   * @param {Object[]} output
   * @returns {Object[]}
   */
  updateContinuous(deltaTime, output = []) {
    this.continuousAccumulator += this.emission.rate * deltaTime;
    const count = Math.floor(this.continuousAccumulator);

    if (count <= 0) {
      return output;
    }

    this.continuousAccumulator -= count;
    return this.spawn(count, output);
  }

  /**
   * @param {number} deltaTime
   * @param {number} previousAge
   * @param {Object[]} output
   * @returns {Object[]}
   */
  updateInterval(deltaTime, previousAge, output = []) {
    if (this.burstDone && !this.emission.loop) {
      return output;
    }

    this.intervalElapsed += deltaTime;

    if (previousAge === 0 && this.emission.startTime === 0) {
      this.burstDone = true;
      return this.spawn(this.emission.count, output);
    }

    if (this.intervalElapsed < this.emission.interval) {
      return output;
    }

    this.intervalElapsed %= this.emission.interval;
    this.burstDone = true;
    return this.spawn(this.emission.count, output);
  }

  /**
   * @param {number} count
   * @param {Object[]} [output]
   * @returns {Object[]}
   */
  spawn(count, output = []) {
    for (let index = 0; index < count; index += 1) {
      const position = this.getSpawnPosition();
      const descriptor = {
        emitterId: this.id,
        position,
        particle: this.particle,
      };

      if (this.shape.type === 'nova_point') {
        descriptor.rotationTarget = this.getPointPosition();
        descriptor.rotationOffset = this.shape.angleOffset ?? 0;
        descriptor.distanceOffset = this.shape.distanceOffset ?? 0;
      }

      output.push(descriptor);
    }

    return output;
  }

  /**
   * @returns {{x: number, y: number}}
   */
  getSpawnPosition() {
    if (this.shape.type === 'circle') {
      return this.getCirclePosition();
    }

    if (this.shape.type === 'line') {
      return this.getLinePosition();
    }

    if (this.shape.type === 'box') {
      return this.getBoxPosition();
    }

    return this.getPointPosition();
  }

  /**
   * @returns {{x: number, y: number}}
   */
  getPointPosition() {
    return {
      x: this.shape.x ?? 0,
      y: this.shape.y ?? 0,
    };
  }

  /**
   * @returns {{x: number, y: number}}
   */
  getCirclePosition() {
    const angle = this.random() * Math.PI * 2;
    const radius = Math.sqrt(this.random()) * (this.shape.radius ?? 0);

    return {
      x: (this.shape.x ?? 0) + Math.cos(angle) * radius,
      y: (this.shape.y ?? 0) + Math.sin(angle) * radius,
    };
  }

  /**
   * @returns {{x: number, y: number}}
   */
  getLinePosition() {
    const t = this.random();
    const x1 = this.shape.x1 ?? 0;
    const y1 = this.shape.y1 ?? 0;
    const x2 = this.shape.x2 ?? x1;
    const y2 = this.shape.y2 ?? y1;

    return {
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t,
    };
  }

  /**
   * @returns {{x: number, y: number}}
   */
  getBoxPosition() {
    return {
      x: (this.shape.x ?? 0) + this.random() * (this.shape.width ?? 0),
      y: (this.shape.y ?? 0) + this.random() * (this.shape.height ?? 0),
    };
  }
}