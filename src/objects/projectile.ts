import { Vector2 } from "../math/vector2.js";
import { Constants } from "../physics/constants.js";
import { CollisionInfo, CollisionManager } from "./collisions.js";

export enum ForceType {
    unspecified = 0,
    gravity = 1,
    normal = 2,
    friction = 3,
    drag = 4,
    tension = 5
}

export type Force = {
    vector: Vector2;
    type: ForceType;
};

export class Projectile {
    public forces: Force[] = [];
    private netForce: Vector2 = Vector2.zero;

    public _acceleration: Vector2 = Vector2.zero;
    public _velocity: Vector2 = Vector2.zero;

    private lastCollision: CollisionInfo | undefined;

    public readonly density: number;
    public readonly crossSectionArea: number;

    constructor(
        public readonly mass: number,
        public readonly elasticity: number,
        public readonly radius: number,
        public _position: Vector2
    ) {
        this.density = mass / radius;
        this.crossSectionArea = Math.PI * radius ** 2;
    }

    public get position(): Vector2 {
        return this._position;
    }

    public get velocity(): Vector2 {
        return this._velocity;
    }

    public get acceleration(): Vector2 {
        return this._acceleration;
    }

    public clearForces(): void {
        this.forces.length = 0;
        this.netForce = Vector2.zero;
    }

    public applyForce(force: Vector2, impulse: boolean = false, type: ForceType = ForceType.unspecified): void {
        if (impulse) this._velocity = this._velocity.add(force.divide(this.mass));
        else {
            this.forces.push({ vector: force, type });
            this.netForce = this.netForce.add(force);
        }
    }

    public getDisplacement(deltaTime: number): Vector2 {
        return this._velocity.multiply(deltaTime).add(this._acceleration.multiply(deltaTime ** 2 / 2));
    }

    public getVelocity(deltaTime: number): Vector2 {
        return this._velocity.add(this._acceleration.multiply(deltaTime));
    }

    public update(deltaTime: number): void {
        this.clearForces();
        this.applyForce(new Vector2(0, -10).multiply(this.mass), false, ForceType.gravity);

        const dragMagnitude: number = Constants.DRAG_COEFFICIENT * Constants.AIR_DENSITY * this.crossSectionArea * this._velocity.magnitude ** 2 / 2;

        // this.applyForce(this._velocity.unit.multiply(-dragMagnitude), false, ForceType.drag); // MOVE DRAG UNDER FRICTION MAYBE

        if (this.lastCollision) {
            const normalVel: number = this.lastCollision.normal.dot(this._velocity);

            console.log(normalVel);

            if (Math.abs(normalVel) < 0.2) {
                this._velocity = this._velocity.subtract(this.lastCollision.normal.multiply(normalVel));

                const normalForce: number = -this.lastCollision.normal.dot(this.netForce);

                this.applyForce(this.lastCollision.normal.multiply(normalForce), false, ForceType.normal);

                if (normalForce > 0) {
                    const surfaceTangent: Vector2 = this.lastCollision.normal.orthogonal;
                    const tangentialVelocity: number = surfaceTangent.dot(this._velocity);
    
                    if (Math.abs(tangentialVelocity) < 0.1) {
                        this._velocity = this._velocity.subtract(surfaceTangent.multiply(tangentialVelocity));
    
                        const frictionForce: number = normalForce * 0.2;
                        const tangentialForce: number = surfaceTangent.dot(this.netForce);
                        const frictionDir: Vector2 = tangentialForce < 0 ? surfaceTangent : surfaceTangent.multiply(-1); // Make sure this is right direction, create Util.sign function and Util.clamp function
                        const frictionMag: number = Math.min(Math.abs(tangentialForce), frictionForce);
    
                        this.applyForce(frictionDir.multiply(frictionMag), false, ForceType.friction);
    
                    } else {
                        const frictionForce: number = normalForce * 0.1;
                        const frictionDir: Vector2 = tangentialVelocity < 0 ? surfaceTangent : surfaceTangent.multiply(-1);
    
                        this.applyForce(frictionDir.multiply(frictionForce));
                    }
                }
            }
        } else {
            console.log("false");
        }

        this._acceleration = this.netForce.divide(this.mass);

        const displacement: Vector2 = this.getDisplacement(deltaTime);
        const lastPosition: Vector2 = this._position;
        const lastVelocity: Vector2 = this._velocity;

        this._position = lastPosition.add(displacement);
        this._velocity = this.getVelocity(deltaTime);

        const info: CollisionInfo | undefined = CollisionManager.queryCollision(this);

        this.lastCollision = info;

        if (info) {
            const effectiveElasticity: number = this.elasticity * info.object.elasticity;

            const collisionPos: Vector2 = this._position.add(info.normal.multiply(info.overlap));
            const collisionProgress: number = Math.min(collisionPos.subtract(lastPosition).magnitude / displacement.magnitude, 1);
            const collisionVel: Vector2 = lastVelocity.add(this._velocity.subtract(lastVelocity).multiply(collisionProgress));
            const normalVel: number = info.normal.dot(collisionVel);

            if (Math.abs(normalVel) > 0.1) {
                const normalImpulse: number = normalVel * (1 + effectiveElasticity);

                this._velocity = collisionVel.subtract(info.normal.multiply(normalImpulse));

            } else {
                this._velocity = Vector2.zero;
            }

            this._position = this._position.add(info.normal.multiply(info.overlap));
        }
    }
}