import { Simulation } from "../core/simulation.js";
import { Util } from "../math/util.js";
import { Collapsible } from "./displaycomponents.js";
import { DisplayLabel } from "./displaycomponents.js";
import { FieldItem, ItemList, MaterialItem } from "./listcomponents.js";
import { QuantityInput, TextInput, AngleInput, VectorInput, UnitContainer } from "./inputcomponents.js";
import { Projectile } from "../objects/projectile.js";
import { OptionSelect, OptionItem } from "./inputcomponents.js";
import { Material as Material } from "../objects/material.js";
import { Obstacle } from "../objects/obstacle.js";
import { Vector2 } from "../math/vector2.js";

export class Controller {
  private _hovering: Projectile | Obstacle | undefined;
  private _selected: Projectile | Obstacle | undefined;

  public get hovering(): Projectile | Obstacle | undefined {
    return this._hovering;
  }

  public get selected(): Projectile | Obstacle | undefined {
    return this._selected;
  }

  public init(): void {
    document.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });
    
    customElements.define("collapsible-dropdown", Collapsible);
    customElements.define("display-label", DisplayLabel);

    customElements.define("text-input", TextInput);
    customElements.define("unit-container", UnitContainer);
    customElements.define("quantity-input", QuantityInput);
    customElements.define("angle-input", AngleInput);
    customElements.define("vector-input", VectorInput);

    customElements.define("material-item", MaterialItem);
    customElements.define("field-item", FieldItem);
    customElements.define("item-list", ItemList);

    customElements.define("option-item", OptionItem);
    customElements.define("option-select", OptionSelect);

    // Promise.all([
    //   customElements.whenDefined("collapsible-dropdown"),
    //   customElements.whenDefined("display-label"),
    //   customElements.whenDefined("text-input"),
    //   customElements.whenDefined("quantity-input"),
    //   customElements.whenDefined("vector-input"),
    //   customElements.whenDefined("item-lister"),
    //   customElements.whenDefined("field-item"),
    //   customElements.whenDefined("option-select"),
    //   customElements.whenDefined("option-item")

    // ]).then(() => {
      this.initSimulationControls();
      this.initProjectileControls();
      this.initMaterialControls();
      this.initConstantsControls();
    // });
  }

  private initSimulationControls(): void {
    const pauseButton = document.querySelector("button#sim-pause")!;
    const reverseButton = document.querySelector("button#sim-reverse")!;
    const skipButton: HTMLButtonElement = document.querySelector("button#sim-skip")!;
    const doubleSkipButton: HTMLButtonElement = document.querySelector("button#sim-double-skip")!;
    const backButton: HTMLButtonElement = document.querySelector("button#sim-back")!;
    const doubleBackButton: HTMLButtonElement = document.querySelector("button#sim-double-back")!;

    const timeSlider: QuantityInput = document.getElementById("sim-time-slider") as QuantityInput;

    timeSlider.value = Simulation.instance.timeScale;

    timeSlider.addInputListener(() => {
      Simulation.instance.timeScale = timeSlider.value;
    });
    
    const displayPause = () => {
      if (Simulation.instance.running) {
        pauseButton.classList.remove("paused");
  
      } else {
        pauseButton.classList.add("paused");
      }
    };

    const displayReverse = () => {
      if (Simulation.instance.timeReverse) reverseButton.classList.add("reversed");
      else reverseButton.classList.remove("reversed");
    };

    pauseButton.addEventListener("click", () => {
      if (Simulation.instance.running) Simulation.instance.pause();
      else Simulation.instance.resume();

      displayPause();
    });

    document.addEventListener("visibilitychange", () => {
      Simulation.instance.pause();
      displayPause();
    });

    reverseButton.addEventListener("click", () => {
      Simulation.instance.timeReverse = !Simulation.instance.timeReverse;
      displayReverse();
    });

    const handleSkipButton = (button: HTMLButtonElement, amount: number) => {
      button.addEventListener("click", () => {
        button.classList.remove("skipped");
        void button.offsetWidth;
        button.classList.add("skipped");
  
        Simulation.instance.advance(amount);
      });
    }

    handleSkipButton(skipButton, 0.1);
    handleSkipButton(doubleSkipButton, 1);
    handleSkipButton(backButton, -0.1);
    handleSkipButton(doubleBackButton, -1);

    displayPause();
    displayReverse();
  }

  private initProjectileControls(): void {
    const positionInput: VectorInput = document.getElementById("proj-spawn-pos") as VectorInput;
    const velocityInput: VectorInput = document.getElementById("proj-spawn-vel") as VectorInput;

    const radiusInput: QuantityInput = document.getElementById("proj-radius") as QuantityInput;
    const massInput: QuantityInput = document.getElementById("proj-mass") as QuantityInput;
    const chargeInput: QuantityInput = document.getElementById("proj-charge") as QuantityInput;
    const materialInput: OptionSelect<Material> = document.getElementById("proj-material") as OptionSelect<Material>;
    materialInput.optionObjects = Simulation.instance.materials;

    const spawnButton: HTMLButtonElement = document.getElementById("proj-spawn") as HTMLButtonElement;

    spawnButton.addEventListener("click", () => {
      if (materialInput.value) {
        Simulation.instance.projectiles.add(new Projectile(radiusInput.value, massInput.value, chargeInput.value, materialInput.value, positionInput.value, velocityInput.value));
      }
    });
  }
  
  private initMaterialControls(): void {
    const materialList: ItemList = document.getElementById("material-list") as ItemList;

    for (const material of Simulation.instance.materials) {
      materialList.createItem(material);
    }
  }

  private initConstantsControls(): void {
    const gInput: QuantityInput = document.getElementById("grav-constant-input") as QuantityInput;
    const coulombInput: QuantityInput = document.getElementById("coulomb-constant-input") as QuantityInput;
    const airInput: QuantityInput = document.getElementById("air-density-input") as QuantityInput;
    const fieldList: ItemList = document.getElementById("field-list") as ItemList;

    gInput.value = Simulation.instance.constants.gravitationalConstant;
    coulombInput.value = Simulation.instance.constants.coulombConstant;
    airInput.value = Simulation.instance.constants.airDensity;

    gInput.addInputListener(() => {
      Simulation.instance.constants.gravitationalConstant = gInput.value;
    });

    coulombInput.addInputListener(() => {
      Simulation.instance.constants.coulombConstant = coulombInput.value;
    });

    airInput.addInputListener(() => {
      Simulation.instance.constants.airDensity = airInput.value;
    });

    for (const field of Simulation.instance.fields) {
      fieldList.createItem(field);
    }
  }

  public update(): void {
    const timeElapsed: HTMLSpanElement = document.getElementById("sim-time-elapsed") as HTMLSpanElement;
    timeElapsed.innerText = Util.formatTime(Simulation.instance.elapsedTime);

    const currentHover: Projectile | Obstacle | undefined = Simulation.instance.inputHandler.getCursorObject();

    this._hovering = currentHover;
    if (Simulation.instance.inputHandler.clicked) this._selected = currentHover;

    Simulation.instance.inputHandler.setHoverMode(this._hovering !== undefined);
  }
}