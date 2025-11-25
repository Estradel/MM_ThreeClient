import * as THREE from "three"
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from "three/examples/jsm/libs/stats.module.js";
import * as GUI from "./gui.ts";
import {ImGuiImplWeb} from "@mori2003/jsimgui";
import  {type BvhSkeleton} from "./BvhSkeleton.ts";



export class SkeletonVisualizer {

    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;

    // Stockage des objets "Os" (des cubes ou axes)
    // Structure: un tableau plat qui matche l'index du serveur
    private _skeletons: BvhSkeleton[] = [];

    get Skeletons(): BvhSkeleton[] {
        return this._skeletons;
    }

    private readonly stats: Stats = new Stats();

    constructor() {
        this.stats.showPanel(0);
        document.body.appendChild(this.stats.dom);

        // 1. Initialisation ThreeJS de base
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);

        // Grille pour se repérer
        const grid = new THREE.GridHelper(10, 10);
        this.scene.add(grid);
        this.scene.add(new THREE.AxesHelper(1)); // Origine monde

        // Lumières
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 3);
        this.scene.add(hemiLight);

        // Caméra & Rendu
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 2, 5);

        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Contrôles
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 1, 0);
        this.controls.update();


        // Gestion du resize
        window.addEventListener('resize', () => this.onWindowResize(), false);

        GUI.InitializeGUI(this.renderer.domElement).then(_ => {
            // Boucle de rendu
            this.renderer.setAnimationLoop(time => {
                this.animate()
            });
        });
    }

    public addSkeleton(skel: BvhSkeleton) {
        this._skeletons.push(skel);
        this.scene.add(skel.Root);
    }

    private animate() {
        ImGuiImplWeb.BeginRender();
        this.stats.begin();

        GUI.render();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);

        this.stats.end();
        this.renderer.resetState();
        ImGuiImplWeb.EndRender();
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}