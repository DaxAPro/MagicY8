import type { ToolType } from "./geminiApi";
import { getLearnedPromptMemory } from "./learnedPromptMemory";

export interface LocalTrendIdea {
  title: string;
  description: string;
}

export const LOCAL_NAIL_TRENDS: LocalTrendIdea[] = [
  { title: "soap nails with sheer glossy finish", description: "Clean translucent shine, natural base, and beauty-commercial macro polish passes." },
  { title: "cat-eye magnetic gel shimmer", description: "A reflective magnetic streak that moves through the nail during close-up lighting." },
  { title: "chrome French micro tips", description: "Tiny chrome edge details built in fast clean strokes before the final glossy hero view." },
  { title: "aura blush nails", description: "Soft airbrushed color glow that stays abstract until the final pullback." },
  { title: "3D bow and pearl accents", description: "Small luxury charms added in cropped macro steps on one nail." },
  { title: "velvet glass nails", description: "Layered translucent gel and shimmer texture with a premium salon finish." },
];

export const LOCAL_TATTOO_TRENDS: LocalTrendIdea[] = [
  { title: "fine-line botanical tattoo", description: "Single-needle floral fragments built from cropped linework into a clean final view." },
  { title: "ornamental blackwork placement", description: "Symmetric black-grey details, negative space, and premium macro needle passes." },
  { title: "cyber sigil tattoo", description: "Sharp futuristic symbols and circuit-like line fragments revealed only at the end." },
  { title: "micro-realism portrait detail", description: "Hyper-detailed shading fragments that stay unreadable until the final hero shot." },
  { title: "abstract geometric animal motif", description: "Cropped curves and shaded geometry that connect into the full subject late." },
  { title: "red accent blackwork", description: "Black-grey base with one controlled red accent introduced near the final detail pass." },
];

function processStyleInstruction(toolType: ToolType, processStyle: string): string {
  if (toolType === "tattoo_video") {
    const styles: Record<string, string> = {
      mystery_macro_build: "keep the first 60-70% in extreme macro fragments so the final tattoo subject cannot be identified",
      fragment_to_final: "show disconnected but beautiful partial details forming rapidly section by section",
      fast_stroke_assembly: "make the tattoo appear quickly like an image being generated live through realistic rapid needle passes",
      stencil_to_final: "begin with only a tiny cropped stencil fragment, then convert it into ink step by step",
      layer_by_layer_color: "build color or black-grey values in controlled layers from tiny close-up fragments",
      final_pullback_view: "stay tightly cropped on abstract details, then use one smooth final pullback",
    };
    return styles[processStyle] ?? styles.mystery_macro_build;
  }

  const styles: Record<string, string> = {
    mystery_macro_build: "keep the first 60-70% in extreme macro fragments of one nail so the final design cannot be guessed early",
    fragment_to_final: "build disconnected beautiful nail-art fragments that only connect during the final pullback",
    fast_brush_assembly: "make the nail art appear quickly like an image being generated live through realistic rapid brush strokes",
    base_to_final: "begin with a clean base color, then add cropped partial details in stages",
    layer_by_layer_color: "build polish colors, highlights, glitter, chrome, or gel accents in controlled layers",
    final_pullback_view: "stay tightly cropped on abstract nail details, then pull back slightly for the first complete view",
  };
  return styles[processStyle] ?? styles.mystery_macro_build;
}

function colorModeInstruction(toolType: ToolType, colorMode: string): string {
  if (toolType === "tattoo_video") {
    const modes: Record<string, string> = {
      black_white: "Use high-contrast black and white tattoo values only.",
      black_grey: "Use smooth black and grey tattoo shading with no random colors.",
      single_accent: "Use mostly black-grey ink with one controlled accent color.",
      full_color: "Use a controlled full-color tattoo palette with consistent colors.",
      artist_choice: "Choose a tasteful tattoo color palette that best fits the user's idea.",
    };
    return modes[colorMode] ?? modes.black_grey;
  }

  const modes: Record<string, string> = {
    black_white: "Use a black and white nail-art palette with glossy contrast.",
    soft_pastel: "Use soft pastel polish colors with a clean beauty finish.",
    neon_accent: "Use one or two neon accents while keeping the design polished.",
    full_color: "Use a controlled full-color nail-art palette with consistent polish colors.",
    artist_choice: "Choose a tasteful nail color palette that best fits the user's idea.",
  };
  return modes[colorMode] ?? modes.soft_pastel;
}

function chooseVariant(seedText: string, previousPrompt?: string): number {
  const combined = `${seedText} ${previousPrompt ?? ""}`;
  let score = 0;
  for (let i = 0; i < combined.length; i++) score = (score + combined.charCodeAt(i) * (i + 3)) % 997;
  return score % 6;
}

function cleanIdea(value: unknown, fallback: string): string {
  const idea = String(value ?? "").trim().replace(/\s+/g, " ");
  return idea.length > 0 ? idea : fallback;
}

export function getLocalTrends(toolType: ToolType): LocalTrendIdea[] {
  const learnedTrends = getLearnedPromptMemory()[toolType].trends;
  const builtInTrends = toolType === "tattoo_video" ? LOCAL_TATTOO_TRENDS : LOCAL_NAIL_TRENDS;
  return [...learnedTrends, ...builtInTrends].slice(0, 12);
}

export function buildBrowserLocalPrompt(
  toolType: ToolType,
  data: Record<string, unknown>,
  previousPrompt?: string,
): string {
  return toolType === "tattoo_video"
    ? buildTattooPrompt(data, previousPrompt)
    : buildNailsPrompt(data, previousPrompt);
}

function buildNailsPrompt(data: Record<string, unknown>, previousPrompt?: string): string {
  const coreIdea = cleanIdea(data.coreIdea, "pink chrome French tip nails with glossy pearl highlights");
  const duration = "10s";
  const nailStyle = String(data.nailStyle ?? "Glossy chrome");
  const nailShape = String(data.nailShape ?? "Almond");
  const nailColor = String(data.nailColor ?? "Pearl pink");
  const camera = String(data.cameraMovement ?? "Macro push-in");
  const lighting = String(data.lighting ?? "Soft beauty lighting");
  const processStyle = String(data.revealStyle ?? "mystery_macro_build");
  const colorMode = String(data.colorMode ?? "soft_pastel");
  const variant = chooseVariant(coreIdea + nailStyle + nailColor, previousPrompt);
  const trends = getLocalTrends("nails_video");
  const trend = trends[variant % trends.length] ?? LOCAL_NAIL_TRENDS[0];
  const learnedSnippet = getLearnedPromptMemory().nails_video.promptSnippets[variant];
  const hooks = [
    "Start with extreme macro fragments of one clean adult fingernail: a tiny highlight, a cropped brush tip, and glossy texture only, so the final design cannot be guessed.",
    "Open on a tight texture close-up of wet gel reflecting salon lights, with the brush entering frame before any full pattern is visible.",
    "Begin with a fast beauty macro shot of small dots, thin strokes, and shimmer particles appearing on one nail, keeping the full design unreadable.",
    "Use a cropped side angle where only the nail edge, tool tip, and partial color trail are visible, creating curiosity before the final view.",
    "Start with rack focus from a polish droplet to one small line detail, avoiding a full hand and avoiding any complete finished design.",
    "Open with a clean base coat and fast micro strokes appearing section by section like an image being generated live through real nail tools.",
  ];
  const buildBeats = [
    "0.0-2.0s: macro fragments and tool contact; 2.0-5.5s: rapid brush assembly with controlled strokes; 5.5-7.0s: detail accents and glossy top coat; final seconds: first full nail-art hero view.",
    "Use cropped steps: base shine, first line, color fill, small accent, reflection pass, then one smooth final pullback.",
    "Make every stage visibly cause the next stage: brush stroke creates line, dotting tool creates accents, top coat creates final shine.",
    "Keep the camera moving through parallax and rack focus, never holding a static full design before the end.",
    "Build the art in fast readable passes without AI morphing, melting polish, duplicated nails, or changing nail shape.",
    "Let the final pattern connect only during the last 1.5 seconds, then hold a sharp social-media thumbnail frame.",
  ];

  return [
    `A premium 9:16 vertical ${duration} AI video prompt for Google Flow, Veo, Sora, Runway, or Kling.`,
    `Main concept: ${coreIdea}.`,
    `Creative direction: make a luxury salon macro reveal of ${nailStyle} on a ${nailShape} nail using ${nailColor}; use ${trend.title} only as a refined trend influence, not as a copied template.`,
    learnedSnippet ? `Learned quality pattern: borrow pacing, clarity, and final-frame discipline from this saved style: ${learnedSnippet}` : "",
    `Opening hook: ${hooks[variant]}` ,
    `Process rule: ${processStyleInstruction("nails_video", processStyle)}. Show real nail-tool cause and effect: brush contact, gel thickness, chrome reflection, glitter placement, top-coat shine, and clean curing-like finish.`,
    `Color direction: ${colorModeInstruction("nails_video", colorMode)} Keep the palette intentional, premium, and consistent across every frame.`,
    `Camera and light: ${camera}; ${lighting}; shallow depth of field, stable hand framing, glossy beauty-commercial texture, crisp highlights, no shaky drift.`,
    `Timeline: ${buildBeats[variant]} Use a curiosity hook in the first second, satisfying progress in the middle, and one clean reveal at the end.`,
    `Final frame: the last 1.5-2 seconds must be the first clean full finished nail-art hero view, sharp, glossy, centered, fully inside the frame, thumbnail-ready, no text overlay.`,
    "Quality guardrails: preserve the same nail shape, same finger count, same color palette, and same design geometry from start to finish.",
    "Avoid: full hands unless necessary, extra fingers, warped cuticles, changing nail length, melted polish, messy failure looks, random scribbles, early full reveal, captions, logos, watermarks, blur, flicker, and AI morphing.",
  ].join(" ");
}

function buildTattooPrompt(data: Record<string, unknown>, previousPrompt?: string): string {
  const coreIdea = cleanIdea(data.coreIdea, "fine-line rose tattoo with black and grey botanical shading on the outer forearm");
  const tattooStyle = String(data.tattooStyle ?? "Realistic");
  const bodyPart = String(data.bodyPartDescription ?? data.bodyPartLabel ?? data.bodyPart ?? "the outer forearm");
  const inkStyle = String(data.inkStyle ?? "Black ink");
  const subjectGender = String(data.subjectGender ?? "woman") === "man" ? "adult man age 21+" : "adult woman age 21+";
  const camera = String(data.cameraMovement ?? "Macro close-up");
  const lighting = String(data.lighting ?? "Studio rim lighting");
  const processStyle = String(data.revealStyle ?? "mystery_macro_build");
  const colorMode = String(data.colorMode ?? "black_grey");
  const variant = chooseVariant(coreIdea + tattooStyle + bodyPart, previousPrompt);
  const trends = getLocalTrends("tattoo_video");
  const trend = trends[variant % trends.length] ?? LOCAL_TATTOO_TRENDS[0];
  const learnedSnippet = getLearnedPromptMemory().tattoo_video.promptSnippets[variant];
  const hooks = [
    "Start with extreme macro fragments: a needle tip, a partial curved line, skin texture, and a tiny stencil section only, so the final tattoo subject cannot be identified.",
    "Open on cropped ink texture and gloved-hand movement across one selected body part, showing progress without revealing the full stencil.",
    "Begin with fast linework appearing in small disconnected fragments, like an image being generated live through realistic tattoo needle passes.",
    "Use a shallow-focus macro path across texture strokes, ink caps, and partial shading patches before the viewer understands the final design.",
    "Start with a tight rack-focus shot from the tattoo machine to one small line detail, keeping the overall artwork unreadable.",
    "Open with controlled micro strokes and partial shading in a premium studio setup, never showing the completed tattoo at the beginning.",
  ];
  const buildBeats = [
    "0.0-1.5s: curiosity macro hook; 1.5-4.0s: cropped build progress; 4.0-7.2s: fast meaningful needle passes; 7.2-8.0s: final connecting details; 8.0-10.0s: first full hero view.",
    "Use preparation, cropped stencil fragment, rapid linework, shading pass, highlight detail, then a clean final pullback.",
    "Make each visible tool step create real progress, with consistent placement, consistent tattoo shape, and normal ink behavior.",
    "Keep the camera choreographed with macro glide, parallax, and focus pulls, saving the complete readable design for the last two seconds.",
    "Show satisfying professional process, not a botched tattoo, not a chaotic scribble, and not a wipe-away hidden-art trick.",
    "End with an unobstructed, sharp, fully framed finished tattoo suitable as a vertical social-media thumbnail.",
  ];

  return [
    "A premium 9:16 vertical 10-second AI video prompt for Google Flow, Veo, Sora, Runway, or Kling.",
    `Tattoo concept: ${coreIdea}.`,
    `Subject and placement: ${subjectGender}, tasteful non-explicit styling, natural skin texture, stable anatomy; place the design only on ${bodyPart}.`,
    `Creative direction: ${tattooStyle} tattoo process with ${inkStyle}; use ${trend.title} only as a refined influence, not as a copied template.`,
    learnedSnippet ? `Learned quality pattern: borrow pacing, clarity, and final-frame discipline from this saved style: ${learnedSnippet}` : "",
    `Opening hook: ${hooks[variant]}` ,
    `Process rule: ${processStyleInstruction("tattoo_video", processStyle)}. Show believable tattoo-tool cause and effect: stencil fragment, needle pass, clean linework, controlled shading, ink settling, and skin-safe professional wiping.`,
    `Color direction: ${colorModeInstruction("tattoo_video", colorMode)} Keep ink values consistent and premium across every frame.`,
    `Camera and light: ${camera}; ${lighting}; premium studio macro, realistic tool movement, consistent placement, shallow depth of field, no shaky drift.`,
    `Timeline: ${buildBeats[variant]} Use a curiosity hook in the first second, satisfying progress in the middle, and one clean reveal at the end.`,
    "Final frame: the final two seconds must be the first complete finished-art hero view, unobstructed, sharp, centered, fully inside the frame, thumbnail-ready, no text overlay.",
    "Quality guardrails: preserve the same body part, same tattoo scale, same stencil geometry, same ink palette, and natural skin texture from start to finish.",
    "Avoid: full body framing, extra fingers, duplicated hands, warped limbs, rubber skin, excessive blood, nudity, unsafe needle behavior, early full stencil reveal, captions, logos, watermarks, blur, flicker, and AI morphing.",
  ].join(" ");
}
