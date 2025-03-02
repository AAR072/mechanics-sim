import { Simulation } from "../core/simulation.js";
import { Util } from "../math/util.js";
import { Vector2 } from "../math/vector2.js";
import { CollisionInfo, CollisionManager } from "../collisions/collisions.js";
import { Obstacle } from "../collisions/obstacle.js";

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
    public netForce: Vector2 = Vector2.zero;

    public _acceleration: Vector2 = Vector2.zero;
    public _velocity: Vector2 = Vector2.zero;

    private lastCollision: CollisionInfo | undefined;
    private lastCentripetalForce: Vector2 = Vector2.zero

    public readonly density: number;
    public readonly crossSectionArea: number;

    constructor(
        public readonly radius: number,
        public readonly mass: number,
        public readonly charge: number,
        public readonly elasticity: number,
        public readonly staticFriction: number,
        public readonly kineticFriction: number,
        public readonly drag: number,
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
        return this._velocity.multiply(deltaTime).add(this._acceleration.multiply(deltaTime * deltaTime / 2));
    }

    public getVelocity(deltaTime: number): Vector2 {
        return this._velocity.add(this._acceleration.multiply(deltaTime));
    }

    public updateForces(): void {
        this.applyForce(Simulation.instance.gravityDirection.multiply(Simulation.instance.gravityAcceleration * this.mass), false, ForceType.gravity);

        const dragMagnitude: number = this.drag * Simulation.instance.airDensity * this.crossSectionArea * this._velocity.magnitude ** 2 / 2;
        this.applyForce(this._velocity.unit.multiply(-dragMagnitude), false, ForceType.drag);

        for (const projectile of Simulation.instance.projectiles) {
            if (projectile == this) continue;

            const difference: Vector2 = projectile._position.subtract(this._position);
            const chargeProduct: number = this.charge * projectile.charge;
            const electrostaticForce: number = Simulation.instance.coloumbConstant * Math.abs(chargeProduct) / difference.magnitude ** 2;
            
            this.applyForce(difference.unit.multiply(-Util.sign(chargeProduct) * electrostaticForce));
        }

        if (this.lastCollision) {
            const normalVel: number = this.lastCollision.normal.dot(this._velocity);

            if (Math.abs(normalVel) < 0.2) {
                const normalForce: number = -this.lastCollision.normal.dot(this.netForce);

                this.applyForce(this.lastCollision.normal.multiply(-normalVel * this.mass), true);

                if (normalForce > 0) {
                    this.applyForce(this.lastCollision.normal.multiply(normalForce), false, ForceType.normal);

                    const surfaceTangent: Vector2 = this.lastCollision.normal.orthogonal;
                    const tangentialVelocity: number = surfaceTangent.dot(this._velocity);
    
                    if (Math.abs(tangentialVelocity) < 0.05) {
                        const maxFriction: number = normalForce * (this.staticFriction * this.lastCollision.object.staticFriction);
                        const tangentialForce: number = surfaceTangent.dot(this.netForce);
                        const tangentialMag: number = Math.abs(tangentialForce);
                        const frictionForce: number = -Util.sign(tangentialForce) * Math.min(maxFriction, tangentialMag);

                        if (maxFriction >= tangentialMag) this.applyForce(surfaceTangent.multiply(-tangentialVelocity), true);
    
                        this.applyForce(surfaceTangent.multiply(frictionForce), false, ForceType.friction);
    
                    } else {
                        const frictionForce: number = -Util.sign(tangentialVelocity) * normalForce * (this.kineticFriction * this.lastCollision.object.kineticFriction);

                        // find out if this is the right way to do things, and whether or not tangential force should be accounted for here
    
                        this.applyForce(surfaceTangent.multiply(frictionForce));
                    }
                }
            }
        }
    }

    public updateKinematics(deltaTime: number): void {
        this._acceleration = this.netForce.divide(this.mass);

        const displacement: Vector2 = this.getDisplacement(deltaTime);
        const lastPosition: Vector2 = this._position;
        const lastVelocity: Vector2 = this._velocity;

        this._position = lastPosition.add(displacement);
        this._velocity = this.getVelocity(deltaTime);

        const info: CollisionInfo | undefined = CollisionManager.queryCollision(this);

        this.lastCollision = info;

        if (info) {
            if (info.object instanceof Obstacle) {
                const collisionPos: Vector2 = this._position.add(info.normal.multiply(info.overlap));
                const collisionProgress: number = displacement.magnitude === 0 ? 0 : Math.min(collisionPos.subtract(lastPosition).magnitude / displacement.magnitude, 1);
                const collisionVel: Vector2 = lastVelocity.add(this._velocity.subtract(lastVelocity).multiply(collisionProgress));
                const normalVel: number = -info.normal.dot(collisionVel);
                let normalImpulse: number = normalVel;
    
                if (Math.abs(normalVel) > 0.1) normalImpulse += normalVel * (this.elasticity * info.object.elasticity);
    
                this._position = this._position.add(info.normal.multiply(info.overlap));
                this._velocity = collisionVel.add(info.normal.multiply(normalImpulse));

            } else if (info.object instanceof Projectile) {
                // DO THE COLLISION PROGRESS THING HERE TOO (only needs to be done for THIS projectile) AND ONLY DO OVERLAP FOR THIS PROJECTILE AS WELL

                const normalVel1: number = info.normal.dot(this._velocity);
                const normalVel2: number = info.normal.dot(info.object._velocity);
                const restitution: number = this.elasticity * info.object.elasticity;
                const impulse: number = -(1 + restitution) * (normalVel1 - normalVel2) / (1 / this.mass + 1 / info.object.mass);

                this._position = this._position.add(info.normal.multiply(info.overlap));
                
                this.applyForce(info.normal.multiply(impulse), true);
                info.object.applyForce(info.normal.multiply(-impulse), true);
            }
        }
    }

    public getCollision(projectile: Projectile): CollisionInfo | undefined {
        const difference: Vector2 = this._position.subtract(projectile._position);
        const radiiSum: number = this.radius + projectile.radius;

        if (difference.magnitude <= radiiSum) return {
            object: projectile,
            overlap: radiiSum - difference.magnitude,
            normal: difference.unit
        }
    }
}