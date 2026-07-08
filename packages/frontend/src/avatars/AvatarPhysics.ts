import * as Matter from 'matter-js';

const AVATAR_WIDTH = 48;
const AVATAR_HEIGHT = 48;

/**
 * Physics layer using Matter.js.
 * Creates a world with gravity, a floor, and side walls.
 * Avatar bodies are rectangles that collide with each other and the boundaries.
 */
export class AvatarPhysics {
  private engine: Matter.Engine;
  private runner: Matter.Runner | null = null;
  private ground: Matter.Body;
  private walls: Matter.Body[];
  private bodies: Map<string, Matter.Body> = new Map();


  constructor(stageWidth: number, stageHeight: number) {

    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.2, scale: 0.001 },
    });

    // Ground — a thin static rectangle at the bottom
    this.ground = Matter.Bodies.rectangle(
      stageWidth / 2,
      stageHeight + 20,
      10000,
      50,
      { isStatic: true, friction: 0.8, label: 'ground' },
    );

    // Side walls
    this.walls = [
      Matter.Bodies.rectangle(-20, stageHeight / 2, 50, 10000, {
        isStatic: true,
        label: 'wall-left',
      }),
      Matter.Bodies.rectangle(stageWidth + 20, stageHeight / 2, 50, 10000, {
        isStatic: true,
        label: 'wall-right',
      }),
    ];

    Matter.Composite.add(this.engine.world, [this.ground, ...this.walls]);
  }

  /** Start the physics simulation loop. */
  start() {
    if (this.runner) return;
    this.runner = Matter.Runner.create({ delta: 1000 / 60 });
    Matter.Runner.run(this.runner, this.engine);
  }

  /** Stop the physics simulation. */
  stop() {
    if (this.runner) {
      Matter.Runner.stop(this.runner);
      this.runner = null;
    }
  }

  /** Add a body for an avatar. Returns the body so the sprite can read its position. */
  addBody(userId: string, x: number, y: number): Matter.Body {
    const body = Matter.Bodies.rectangle(x, y, AVATAR_WIDTH, AVATAR_HEIGHT, {
      restitution: 0.4,
      friction: 0.3,
      frictionAir: 0.02,
      label: `avatar-${userId}`,
    });
    Matter.Composite.add(this.engine.world, body);
    this.bodies.set(userId, body);
    return body;
  }

  /** Remove an avatar body from the world. */
  removeBody(userId: string) {
    const body = this.bodies.get(userId);
    if (!body) return;
    Matter.Composite.remove(this.engine.world, body);
    this.bodies.delete(userId);
  }

  /** Get the current body for an avatar. */
  getBody(userId: string): Matter.Body | undefined {
    return this.bodies.get(userId);
  }

  /** Apply an impulse force to an avatar (e.g. for bits explosions). */
  applyForce(userId: string, force: { x: number; y: number }) {
    const body = this.bodies.get(userId);
    if (!body) return;
    Matter.Body.applyForce(body, body.position, force);
  }

  /** Apply a jump force. */
  jump(userId: string, strength = 0.06) {
    const body = this.bodies.get(userId);
    if (!body) return;
    Matter.Body.applyForce(body, body.position, { x: 0, y: -strength });
  }

  /**
   * Apply a gentle horizontal walk force for wandering.
   * Caps velocity to prevent runaway speed.
   */
  walkForce(userId: string, direction: number, strength = 0.0008) {
    const body = this.bodies.get(userId);
    if (!body) return;

    const maxSpeed = 1.8;
    if (Math.abs(body.velocity.x) < maxSpeed) {
      Matter.Body.applyForce(body, body.position, { x: direction * strength, y: 0 });
    }
  }

  /** Check if a body is approximately on the ground (low vertical velocity, near bottom). */
  isOnGround(userId: string): boolean {
    const body = this.bodies.get(userId);
    if (!body) return false;
    return Math.abs(body.velocity.y) < 0.5;
  }

  /** Resize the world bounds (e.g. on window resize). */
  resize(width: number, height: number) {
    // Reposition ground and walls
    Matter.Body.setPosition(this.ground, { x: width / 2, y: height + 20 });

    if (this.walls[0]) {
      Matter.Body.setPosition(this.walls[0], { x: -20, y: height / 2 });
    }
    if (this.walls[1]) {
      Matter.Body.setPosition(this.walls[1], { x: width + 20, y: height / 2 });
    }
  }

  /** Clean up all bodies. */
  destroy() {
    this.stop();
    Matter.Engine.clear(this.engine);
    this.bodies.clear();
  }
}
