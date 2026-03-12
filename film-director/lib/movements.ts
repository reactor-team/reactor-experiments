export interface Movement {
  name: string;
  description: string;
  instruction: string;
}

export const MOVEMENTS: Movement[] = [
  {
    name: "Pan Left",
    description: "Camera pans horizontally to the left",
    instruction: "Rewrite this scene description so the camera slowly pans horizontally to the left throughout the shot. Describe what new elements enter the frame from the left side as the camera reveals more of the environment. Keep all the original scene details but frame them from a gradually shifting leftward perspective.",
  },
  {
    name: "Pan Right",
    description: "Camera pans horizontally to the right",
    instruction: "Rewrite this scene description so the camera slowly pans horizontally to the right throughout the shot. Describe what new elements enter the frame from the right side as the camera reveals more of the environment. Keep all the original scene details but frame them from a gradually shifting rightward perspective.",
  },
  {
    name: "Tilt Up",
    description: "Camera tilts upward",
    instruction: "Rewrite this scene description so the camera gradually tilts upward from its starting position. Begin by describing what's at the current eye level, then describe what comes into view above — sky, ceilings, treetops, upper floors, etc. The scene should feel like a slow vertical reveal upward.",
  },
  {
    name: "Tilt Down",
    description: "Camera tilts downward",
    instruction: "Rewrite this scene description so the camera gradually tilts downward. Start with what's visible at the current level, then describe what the downward tilt reveals — ground details, floors, reflections, textures underfoot. The scene should feel like a slow vertical reveal downward.",
  },
  {
    name: "Zoom In",
    description: "Camera zooms into the subject",
    instruction: "Rewrite this scene description so the camera slowly zooms in on the main subject or focal point. Start wide with the full scene context, then progressively focus on finer details — textures, expressions, small objects — as the frame tightens. The zoom should feel deliberate and cinematic.",
  },
  {
    name: "Zoom Out",
    description: "Camera pulls back to reveal more",
    instruction: "Rewrite this scene description so the camera slowly zooms out, starting from a close or medium view and progressively revealing the wider environment. Describe the expanding context: surrounding space, other elements, the broader setting that becomes visible as the frame widens.",
  },
  {
    name: "Dolly Forward",
    description: "Camera moves forward through the scene",
    instruction: "Rewrite this scene description so the camera physically moves forward through the scene (dolly shot). Unlike a zoom, the perspective changes as the camera travels — objects pass by on the sides, parallax reveals depth, and the viewer feels like they're walking or gliding into the scene. Describe the sense of moving through the space.",
  },
  {
    name: "Dolly Back",
    description: "Camera moves backward away from subject",
    instruction: "Rewrite this scene description so the camera physically moves backward, pulling away from the subject (reverse dolly). The perspective shifts as the camera retreats — foreground elements grow larger as they pass, more of the surrounding space is revealed, and there's a sense of the viewer withdrawing from the scene. Describe this spatial retreat.",
  },
  {
    name: "Orbit",
    description: "Camera circles around the subject",
    instruction: "Rewrite this scene description so the camera orbits around the central subject in a slow circular motion. Describe how the lighting, background, and visible details change as the viewpoint rotates — different angles reveal new facets of the subject and different parts of the surrounding environment come in and out of view.",
  },
  {
    name: "Crane Up",
    description: "Camera rises vertically like a crane shot",
    instruction: "Rewrite this scene description as a crane shot where the camera rises vertically from a low position upward. Start with ground-level or close-up detail, then describe the expanding aerial view as the camera ascends — rooftops, landscapes, the full scope of the scene from above. Convey the dramatic sense of elevation.",
  },
  {
    name: "Tracking",
    description: "Camera follows alongside a moving subject",
    instruction: "Rewrite this scene description as a tracking shot where the camera moves alongside a subject in motion. The camera keeps pace with the subject, so describe the changing background and environment that streams past as they move together. Include the sense of speed, direction, and the passing scenery.",
  },
  {
    name: "Static",
    description: "Camera stays completely still",
    instruction: "Rewrite this scene description for a completely static camera. The camera does not move at all — all motion and change comes from within the scene itself. Emphasize the action, movement of subjects, changes in light, or environmental motion that happen within the fixed frame. Describe what unfolds in front of the locked-off camera.",
  },
];

export const MOVEMENT_SYSTEM_PROMPT = `You are a cinematography expert helping rewrite video generation prompts to incorporate specific camera movements. You will receive a scene description and instructions for a camera movement. Your job is to rewrite the scene description so it naturally incorporates the specified camera movement.

Guidelines:
- Integrate the camera movement seamlessly into the scene description
- Keep all the important visual details from the original prompt
- Write in present tense, describing what is visible and happening
- Be vivid and specific about what the camera movement reveals
- Keep the result concise (2-4 sentences)
- Output only the rewritten prompt, nothing else`;
