import { Vector2 } from "../math/vector2.js";
import { Projectile } from "../projectiles/projectile.js";
import { Renderer } from "../rendering/canvas.js";
import { Loop } from "./loop.js";
import { Obstacle } from "../collisions/obstacle.js";
import { Rope } from "../constraints/constraint.js";
import { GraphHandler } from "../graphing/graphHandler.js";
import { Camera } from "../rendering/camera.js";
import { Controller } from "../interfacing/controller.js";

import "../interfacing/collapsible.js";
import { UIManager } from "../interfacing/uimanager.js";

export interface Constants {
    airDensity: number;
    gravitationalConstant: number;
    coloumbConstant: number;
}

export class Simulation extends Loop {
    public airDensity: number = 0;//1.225;
    public gravityDirection: Vector2 = new Vector2(0, -1);
    public gravityAcceleration: number = 9.81;
    public coloumbConstant: number = 30;
    public gravitationalConstant: number = 1;

    public camera: Camera = new Camera();
    public controller: Controller = new Controller();
    public uiManager: UIManager = new UIManager();
    public canvas: Renderer;
    // private graphHandler: GraphHandler = new GraphHandler();

    public readonly projectiles: Set<Projectile> = new Set();
    public readonly ropes: Set<Rope> = new Set();
    public readonly obstacles: Set<Obstacle> = new Set();

    private static _instance: Simulation;

    public static get instance(): Simulation {
        if (!this._instance) this._instance = new Simulation();

        return this._instance;
    }

    public init(): void {
        const canvas: HTMLCanvasElement | null = document.querySelector("#simulation-screen");
        if (!canvas) throw new Error("Failed to get canvas.");

        this.canvas = new Renderer(canvas);

        const proj = new Projectile(0.2, 2, 1, 1, 0.5, 0.5, 0.2, new Vector2(-5, 8));
        this.projectiles.add(proj);
        // this.projectiles.add(new Projectile(0.5, 1, 0, 1, 0.5, 0.5, 0.2, new Vector2(-4, 6)));
        // this.ropes.add(new Rope(Vector2.zero, 4, this.projectiles.get(0)));
        // this.obstacles.add(new Obstacle(0.25, 0.5, 0.5, [new Vector2(-8, -6), new Vector2(8, -6), new Vector2(8, -4), new Vector2(-8, -4)]));
        // this.obstacles.add(new Obstacle(0, 0.5, 0.5, [new Vector2(-8, 10), new Vector2(-8, -4), new Vector2(8, -4)]));

        this.obstacles.add(new Obstacle(0.5, 0.5, 0.5, [new Vector2(0, 0)], 10, true));

        proj.applyForce(new Vector2(40 * proj.mass, 0), true);

        this.start();

        this.uiManager.init();

        // const graphCanvas = document.getElementById("posGraph") as HTMLCanvasElement;
        // this.posGraph = new Graph(graphCanvas, "t", "dy");

        // const magCanvas = document.getElementById("magGraph") as HTMLCanvasElement;
        // this.magGraph = new Graph(magCanvas, "t", "v");

        // const accCanvas = document.getElementById("accGraph") as HTMLCanvasElement;
        // this.accGraph = new Graph(accCanvas, "t", "a");
    }

    public update(deltaTime: number): void {
        for (const projectile of this.projectiles) {
            projectile.clearForces();
            projectile.updateForces();
        }

        for (const rope of this.ropes) {
            rope.updateForces();
        }

        for (const projectile of this.projectiles) {
            projectile.updateKinematics(deltaTime);
        }

        for (const rope of this.ropes) {
            rope.updateKinematics();
        }
    }

    public render(): void {
        this.camera.update();
        // this.graphHandler.updateGraph(this.elapsedTime);
        this.canvas.render();
        this.uiManager.update();
    }
}

const sim: Simulation = Simulation.instance;
sim.init();
