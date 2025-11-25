import { ImGui, ImGuiImplWeb } from "@mori2003/jsimgui";
import {AnimationClient} from "./network.ts";

export async function InitializeGUI(myCanvas: HTMLCanvasElement)
{
    await ImGuiImplWeb.Init({
        canvas: myCanvas,
        // device: myGPUDevice, // Required for WebGPU
    });

}

const stopRotation : [boolean] = [false]
const cubeColor: [number, number, number] = [0.0, 0.0, 0.5];

export function render() {


    ImGui.Text("Hello, world!");
    ImGui.Checkbox("Stop Rotation", stopRotation);
    ImGui.Text("Rotate ? " + (stopRotation[0] ? "No" : "Yes"));

    ImGui.ColorPicker3("cube.material.color", cubeColor);

    if (ImGui.Button("Add BVH Skeleton")) {
        console.log("Button clicked!");
        AnimationClient.getInstance().AddClient();
    }

}