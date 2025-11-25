import { SkeletonVisualizer } from "./visualizer";
import {BvhSkeleton} from "./BvhSkeleton.ts";

interface BindPoseData {
    positions: number[][]; // [x, y, z]
    rotations: number[][]; // [x, y, z, w]
    scales: number[][];    // [x, y, z]
}

export interface SkeletonInitMsg {
    type: "SKELETON_DEF"; // ou "SKELETON_DEF" selon votre code Python
    bone_names: string[];
    parents: number[];     // Indices des parents (-1 pour la racine)
    bind_pose: BindPoseData;
}

// Doit correspondre au serveur Python
const MAGIC_NUMBER = 0xBADDF00D;

export class AnimationClient {
    private static instance: AnimationClient | null = null;

    private ws: WebSocket | null = null;
    private visualizer: SkeletonVisualizer;
    private url: string;
    private infoDiv: HTMLElement;

    private constructor(url: string, visualizer: SkeletonVisualizer) {
        this.url = url;
        this.visualizer = visualizer;
        this.infoDiv = document.getElementById('info')!;
        this.AddClient();
    }

    public static getInstance(url: string = "", visualizer: SkeletonVisualizer | null = null): AnimationClient {
        if (!AnimationClient.instance) {
            AnimationClient.instance = new AnimationClient(url, visualizer!);
        }
        return AnimationClient.instance;
    }

    public static resetInstance(): void {
        if (AnimationClient.instance?.ws) {
            AnimationClient.instance.ws.close();
        }
        AnimationClient.instance = null;
    }

    public AddClient() {
        this.connect();
    }

    private connect() {
        this.ws = new WebSocket(this.url);
        this.ws.binaryType = "arraybuffer"; // CRUCIAL pour la perf

        this.ws.onopen = () => {
            console.log("Connecté au serveur Python");
            this.infoDiv.innerText = "Connecté. Attente handshake...";
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
            console.log("Déconnecté. Tentative de reconnexion...");
            this.infoDiv.innerText = "Déconnecté. Reconnexion...";
            // setTimeout(() => this.connect(), 2000);
        };
    }

    private handleMessage(data: any) {
        // 1. Si c'est du texte (JSON), c'est le Handshake
        if (typeof data === "string") {
            try {
                const msg = JSON.parse(data);

                if (msg.type === "SKELETON_DEF") {
                    const initData = msg as SkeletonInitMsg;
                    let skel = new BvhSkeleton();
                    skel.initializeSkeleton(initData);
                    this.visualizer.addSkeleton(skel);
                    // this.visualizer.initializeSkeleton(initData);
                    this.infoDiv.innerText = "Squelette & Hiérarchie chargés.";
                }
            } catch (e) {
                console.error("Erreur JSON", e);
            }
            return;
        }

        // 2. Si c'est du binaire, ce sont les matrices
        if (data instanceof ArrayBuffer) {
            this.processBinaryPacket(data);
            // this.ws?.close()
        }
    }

    private processBinaryPacket(buffer: ArrayBuffer) {
        // Lecture du Header
        // Header size = 12 bytes (Magic(4) + FrameID(4) + NumChars(4))
        if (buffer.byteLength < 12) return;

        const view = new DataView(buffer);
        const magic = view.getUint32(0, true); // true = Little Endian

        if (magic !== MAGIC_NUMBER) {
            console.warn("Magic number invalide !");
            return;
        }

        // const frameId = view.getUint32(4, true);
        // const numChars = view.getUint32(8, true);

        // Lecture du Body (Matrices)
        // On crée une vue Float32Array sur le reste du buffer
        // Offset 12 octets pour sauter le header
        const matricesData = new Float32Array(buffer, 12);

        // Mise à jour de la scène
        for (const skeleton of this.visualizer.Skeletons) {
            skeleton.updatePose(matricesData);
        }
    }
}