import { Simulation } from "../core/simulation.js";
import { Vector2 } from "../math/vector2.js";
import { Projectile } from "../objects/projectile.js";

export class Canvas {
    private SCREEN_UNIT_SCALE: number = 50;

    private ARROW_HEIGHT: number = 20;
    private ARROW_ANGLE: number = 30 * Math.PI / 180;

    private context: CanvasRenderingContext2D;
    private width: number;
    private height: number;

    private projectiles: Projectile[] = [];

    constructor(private canvas: HTMLCanvasElement) {
        const context: CanvasRenderingContext2D | null = canvas.getContext("2d");
        if (!context) throw new Error("Failed to get canvas 2d context.");

        this.context = context;

        new ResizeObserver(() => {
            this.width = this.canvas.width = canvas.clientWidth;
            this.height = this.canvas.height = canvas.clientHeight;

        }).observe(canvas);
    }

    private pointToPixels(point: Vector2): Vector2 {
        return new Vector2(this.width / 2, this.height / 2).add(this.vecToPixels(point));
    }

    private vecToPixels(vector: Vector2): Vector2 {
        return new Vector2(vector.x * this.SCREEN_UNIT_SCALE, -vector.y * this.SCREEN_UNIT_SCALE);
    }

    private drawArrow(origin: Vector2, vector: Vector2, style: string): void {
        vector = vector.divide(5);

        const pixelOrigin: Vector2 = this.pointToPixels(origin);
        const pixelEnd: Vector2 = this.pointToPixels(origin.add(vector));
        const pixelDir: Vector2 = this.vecToPixels(vector).unit;
        const lineEnd: Vector2 = pixelEnd.subtract(pixelDir.multiply(this.ARROW_HEIGHT));

        const cornerDist: number = this.ARROW_HEIGHT / Math.cos(this.ARROW_ANGLE);
        const corner1: Vector2 = pixelEnd.subtract(pixelDir.rotate(-this.ARROW_ANGLE).multiply(cornerDist));
        const corner2: Vector2 = pixelEnd.subtract(pixelDir.rotate(this.ARROW_ANGLE).multiply(cornerDist));

        this.context.fillStyle = style;
        this.context.strokeStyle = style;
        this.context.lineWidth = 2;

        this.context.beginPath();
        this.context.moveTo(pixelOrigin.x, pixelOrigin.y);
        this.context.lineTo(lineEnd.x, lineEnd.y);
        this.context.stroke();

        this.context.beginPath();
        this.context.moveTo(pixelEnd.x, pixelEnd.y);
        this.context.lineTo(corner1.x, corner1.y);
        this.context.lineTo(corner2.x, corner2.y);
        this.context.lineTo(pixelEnd.x, pixelEnd.y);
        this.context.closePath();
        this.context.fill();
    }

    public render(): void {
        this.context.clearRect(0, 0, this.width, this.height);

        for (const obstacle of Simulation.instance.obstacles) {
            const screenVertices: Vector2[] = [];

            for (const vertex of obstacle.vertices) {
                screenVertices.push(this.pointToPixels(vertex));
            }
            
            this.context.fillStyle = "black";
            this.context.beginPath();
            this.context.moveTo(screenVertices[0].x, screenVertices[0].y);

            for (let i = 0; i < screenVertices.length; i++) {
                const vertex: Vector2 = screenVertices[(i + 1) % screenVertices.length];

                this.context.lineTo(vertex.x, vertex.y);
            }

            this.context.closePath();
            this.context.stroke();
            this.context.fill();
        }

        for (const projectile of Simulation.instance.projectiles) {
            const screenPos = this.pointToPixels(projectile.position);

            this.context.fillStyle = "black";
            this.context.beginPath();
            this.context.arc(screenPos.x, screenPos.y, projectile.radius * this.SCREEN_UNIT_SCALE, 0, 2 * Math.PI);
            this.context.fill();
        }

        for (const projectile of Simulation.instance.projectiles) {
            for (const force of projectile.forces) {
                this.drawArrow(projectile.position, force, "red");
            }

            this.drawArrow(projectile.position, projectile._velocity, "green");
        }
    }
}