import { Vector2 } from "../math/vector2.js";

export class Projectile {
    public acceleration: Vector2 = Vector2.zero;
    public forces: Vector2[] = [];

    constructor(
        private mass: number,
        private elasticity: number,
        public radius: number,
        public position: Vector2,
        public velocity: Vector2
    ) {}

    public clearForces(): void {
        this.forces.length = 0;
    }

    public applyForce(force: Vector2): void {
        this.forces.push(force);
    }

    public applyImpulse(force: Vector2): void {
        this.velocity = this.velocity.add(force.divide(this.mass));
    }

    public update(deltaTime: number): void {
        let netForce = Vector2.zero;

        for (const force of this.forces) {
            netForce = netForce.add(force);
        }

        this.acceleration = netForce.divide(this.mass);
        this.position = this.position.add(this.velocity.multiply(deltaTime)).add(this.acceleration.multiply(deltaTime ** 2 / 2));
        this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
    }
}
