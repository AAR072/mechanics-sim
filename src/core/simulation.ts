import { Vector2 } from "../math/vector2.js";
import { ForceType, Projectile } from "../objects/projectile.js";
import { Canvas } from "../rendering/canvas.js";
import { Loop } from "./loop.js";
import { Obstacle } from "../objects/obstacle.js";
import { Rope, Spring, Constraint } from "../objects/contraints.js";
import { Camera } from "../rendering/camera.js";
import { InputHandler } from "../interfacing/inputhandler.js";

import { Controller } from "../interfacing/controller.js";
import { Material } from "../objects/material.js";
import { Field, FieldType } from "../objects/field.js";

export interface Constants {
  gravitationalConstant: number;
  coulombConstant: number;
  airDensity: number;
}

export class Simulation extends Loop {
  public readonly materials: Set<Material> = new Set();
  public readonly projectiles: Set<Projectile> = new Set();
  public readonly springs: Set<Spring> = new Set();
  public readonly ropes: Set<Constraint> = new Set();
  public readonly obstacles: Set<Obstacle> = new Set();

  public readonly fields: Set<Field> = new Set([
    new Field("Earth's Gravity", new Vector2(0, -1), false, FieldType.gravitational, 9.8),
  ]);

  public readonly constants: Constants = {
    gravitationalConstant: 0,
    coulombConstant: 0,
    airDensity: 0
  };

  public canvas: Canvas;
  public camera: Camera = new Camera();
  public inputHandler: InputHandler;
  public controller: Controller = new Controller();

  private static _instance: Simulation;

  public static get instance(): Simulation {
    if (!this._instance) this._instance = new Simulation();
    
    return this._instance;
  }

  public init(): void {
    const canvas: HTMLCanvasElement | null = document.querySelector("#simulation-screen");
    if (!canvas) throw new Error("Failed to get canvas.");

    this.canvas = new Canvas(canvas);
    this.inputHandler = new InputHandler(canvas);

    const rubber: Material = new Material("Rubber", "brown", 0.9, 0.9, 0.7, 0.53, 100, 0.1);
    const steel: Material = new Material("Steel", "grey", 0.8, 0.6, 0.4, 0.47, 200, 0.01);
    const border: Obstacle = new Obstacle([new Vector2(-100, -100), new Vector2(100, -100), new Vector2(100, 100), new Vector2(-100, 100)], 2, true, steel);

    this.materials.add(rubber);
    this.materials.add(steel);
    this.obstacles.add(border);

    this.controller.init();

    this.start();
  }

  public update(deltaTime: number): void {
    const projectiles: Projectile[] = Array.from(this.projectiles);

    for (const projectile of projectiles) {
      projectile.clearForces();
    }

    for (let i = 0; i < projectiles.length; i++) {
      const projectile: Projectile = projectiles[i];

      for (const field of this.fields) {
        let force = field.getForce(projectile);
        let type: ForceType | undefined;

        if (field.type === FieldType.gravitational) type = ForceType.gravity;
        else if (field.type === FieldType.electric) type = ForceType.electrostatic;

        projectile.applyForce(force, false, type);
      }

      for (let j = i + 1; j < projectiles.length; j++) {
        const otherProj: Projectile = projectiles[j];

        const difference: Vector2 = otherProj.position.subtract(projectile.position);
        let gravMag: number = 0;
        let electricMag: number = 0;

        if (difference.magnitude > 0) {
          gravMag = this.constants.gravitationalConstant * projectile.mass * otherProj.mass / difference.magnitude ** 2;
          electricMag = -this.constants.coulombConstant * projectile.charge * otherProj.charge / difference.magnitude ** 2
        }

        projectile.applyForce(difference.unit.multiply(gravMag), false, ForceType.gravity);
        otherProj.applyForce(difference.unit.multiply(-gravMag), false, ForceType.gravity);

        projectile.applyForce(difference.unit.multiply(electricMag), false, ForceType.electrostatic);
        otherProj.applyForce(difference.unit.multiply(-electricMag), false, ForceType.electrostatic);
      }

      projectile.updateForces();
    }

    for (const constraint of [...this.springs, ...this.ropes]) {
      constraint.updateForces();
    }

    let i = 0;

    for (const projectile of this.projectiles) {
      projectile.updateKinematics(deltaTime);
    }

    for (const constraint of [...this.springs, ...this.ropes]) {
      constraint.updateKinematics();
    }
  }

  public render(): void {
    this.camera.update();
    this.canvas.render();
    this.controller.update();
  }
}

const sim = Simulation.instance;
sim.init();