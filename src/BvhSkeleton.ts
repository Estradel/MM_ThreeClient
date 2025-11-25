import * as THREE from "three";
import type {SkeletonInitMsg} from "./network.ts";
import {Object3D} from "three";

export class BvhSkeleton {

    private bonesMeshes: THREE.Object3D[] = [];
    private root: THREE.Object3D;
    private isInitialized: boolean = false;

    constructor() {
        this.root = new THREE.Group();

        // Move the root by a random offset for better visibility when multiple skeletons are present
        const offsetX = (Math.random() - 0.5) * 50;
        const offsetZ = (Math.random() - 0.5) * 50;
        this.root.position.set(offsetX, 0, offsetZ);
    }

    get Root(): Object3D {
        return this.root;
    }

    public initializeSkeleton(data: SkeletonInitMsg): Object3D {
        // Nettoyage
        for (const b of this.bonesMeshes) {
            // On retire du parent (scene ou autre os)
            if (b.parent) b.parent.remove(b);
        }
        this.bonesMeshes = [];

        console.log(`Initialisation squelette avec ${data.bone_names.length} os.`);

        for (const [i, name] of data.bone_names.entries()) {
            // Visuel : Axes + Cube
            const boneObj = new THREE.AxesHelper(0.3); // Plus petit pour lisibilité
            const geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
            const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
            const cube = new THREE.Mesh(geometry, material);
            boneObj.add(cube);

            boneObj.name = name;

            // IMPORTANT : Réactiver l'update auto car ThreeJS va calculer le FK
            boneObj.matrixAutoUpdate = false;

            // Appliquer la Bind Pose (Pose de repos locale)
            const pos = data.bind_pose.positions[i];
            const rot = data.bind_pose.rotations[i];
            const scl = data.bind_pose.scales[i];

            boneObj.position.set(pos[0], pos[1], pos[2]);
            boneObj.quaternion.set(rot[0], rot[1], rot[2], rot[3]);
            boneObj.scale.set(scl[0], scl[1], scl[2]);

            this.bonesMeshes.push(boneObj);
        }

        // 2. Reconstruction de l'arbre (Parenting)
        for (const [childIdx, parentIdx] of data.parents.entries()) {
            const childBone = this.bonesMeshes[childIdx];

            if (parentIdx === -1) {
                // C'est une racine (Root), on l'ajoute à la scène
                this.root.add(childBone);
            } else {
                // On l'ajoute à son parent
                // Three.js gère la transformation relative automatiquement
                const parentBone = this.bonesMeshes[parentIdx];
                parentBone.add(childBone);
            }

            childBone.updateMatrix();
        }

        this.isInitialized = true;
        return this.root;
    }

    /**
     * Appelé à chaque frame binaire reçue.
     * @param floatData Le tableau plat de floats contenant toutes les matrices
     */
    public updatePose(floatData: Float32Array) {
        if (!this.isInitialized) return;

        // Une matrice 4x4 contient 16 floats
        const MATRIX_SIZE = 16;

        // Sécurité
        const numBones = Math.min(this.bonesMeshes.length, Math.floor(floatData.length / MATRIX_SIZE));

        for (let i = 0; i < numBones; i++) {
            const bone = this.bonesMeshes[i];
            const offset = i * MATRIX_SIZE;

            // Charger la matrice depuis le buffer
            // NumPy envoie en Row-Major, ThreeJS attend du Column-Major
            bone.matrix.fromArray(floatData, offset);
            bone.matrix.transpose();

            // console.log(new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld));
        }
    }
}