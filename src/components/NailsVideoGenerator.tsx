"use client"

import {
  Box,
  Button,
  Grid,
  HStack,
  Icon,
  Text,
  Textarea,
  VStack,
  createListCollection,
} from "@chakra-ui/react"
import { motion } from "framer-motion"
import { useCallback, useRef, useState } from "react"
import { LuSparkles, LuWandSparkles } from "react-icons/lu"
import { generateLocalPrompt, generatePrompt, GeminiError, shouldUseLocalPromptFallback } from "../services/geminiApi"
import { getApiKey } from "../services/apiKeyStorage"
import { savePromptToFirebase } from "../services/firebasePromptStore"
import {
  normalizeGeneratedPrompt,
  normalizeFormDataForSave,
  preparePromptIdeaForGeneration,
} from "../services/promptValidation"
import { safeRandomId } from "../services/id"
import { addPendingRecord } from "../services/sheetRetryQueue"
import type { HistoryEntry, NailsVideoFormState, SheetStatus } from "../types"
import { PromptOutput } from "./PromptOutput"
import { SelectField } from "./formControls"

const MotionBox = motion.create(Box)
const glowPink = "0 0 20px rgba(236,72,153,0.38)"

const nailStyles = createListCollection({
  items: [
    { label: "Glossy Chrome / දිලිසෙන chrome", value: "Glossy chrome" },
    { label: "French Tip / සුදු tip style", value: "Modern French tip" },
    { label: "Cat Eye Gel / cat-eye gel", value: "Cat eye gel" },
    { label: "Glitter Ombre / glitter පාට mix", value: "Glitter ombre" },
    { label: "3D Bow Charms / 3D bow design", value: "3D bow charms" },
    { label: "Minimal Clean / simple clean look", value: "Minimal clean girl nails" },
    { label: "Aura Nails / aura glow", value: "Aura nails" },
    { label: "Marble Luxury / marble luxury", value: "Luxury marble nails" },
  ],
})

const nailShapes = createListCollection({
  items: [
    { label: "Almond / almond හැඩය", value: "Almond" },
    { label: "Square / කොටු හැඩය", value: "Square" },
    { label: "Coffin / coffin හැඩය", value: "Coffin" },
    { label: "Stiletto / pointed හැඩය", value: "Stiletto" },
    { label: "Short Natural / short natural", value: "Short natural" },
  ],
})


const cameraMovements = createListCollection({
  items: [
    { label: "Macro Push-in / ලඟින් zoom", value: "Macro push-in" },
    { label: "Slow Orbit / වටේට slow camera", value: "Slow orbit" },
    { label: "Top-down Beauty Shot / උඩින් view", value: "Top-down beauty shot" },
    { label: "Rack Focus / focus මාරුව", value: "Rack focus" },
  ],
})

const lightings = createListCollection({
  items: [
    { label: "Soft Beauty Lighting / soft beauty light", value: "Soft beauty lighting" },
    { label: "Glossy Studio Light / studio shine", value: "Glossy studio light" },
    { label: "Warm Salon Glow / warm salon light", value: "Warm salon glow" },
    { label: "Luxury Product Light / product ad light", value: "Luxury product light" },
  ],
})

const processStyles = createListCollection({
  items: [
    { label: "Mystery Macro Build / මුලදී රහස් macro", value: "mystery_macro_build" },
    { label: "Fragment to Final / කොටස් එකතු වෙනවා", value: "fragment_to_final" },
    { label: "Fast Brush Assembly / ඉක්මන් brush build", value: "fast_brush_assembly" },
    { label: "Base to Final / base එකෙන් final", value: "base_to_final" },
    { label: "Layer-by-Layer Color / layer වලින් පාට", value: "layer_by_layer_color" },
    { label: "Final Pullback View / අන්තිමට full view", value: "final_pullback_view" },
  ],
})


interface NailsVideoGeneratorProps {
  onPromptGenerated: (entry: HistoryEntry) => void
  onGeneratingChange?: (generating: boolean) => void
  onModelUsed?: (model: string) => void
  onRequireApiKey?: () => void
  initialForm?: Partial<NailsVideoFormState>
}

export function NailsVideoGenerator({
  onPromptGenerated,
  onGeneratingChange,
  onModelUsed,
  initialForm,
}: NailsVideoGeneratorProps) {
  const [form, setForm] = useState<NailsVideoFormState>({
    coreIdea: initialForm?.coreIdea ?? "",
    duration: "10s",
    nailStyle: initialForm?.nailStyle ?? "Glossy chrome",
    nailShape: initialForm?.nailShape ?? "Almond",
    nailColor: initialForm?.nailColor ?? "artist choice from the exact user idea",
    cameraMovement: initialForm?.cameraMovement ?? "Macro push-in",
    lighting: initialForm?.lighting ?? "Soft beauty lighting",
    revealStyle: initialForm?.revealStyle ?? "mystery_macro_build",
    colorMode: initialForm?.colorMode ?? "artist_choice",
  })
  const [output, setOutput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [sheetStatus, setSheetStatus] = useState<SheetStatus | undefined>()
  const [generationId, setGenerationId] = useState<string | undefined>()
  const lastPromptRef = useRef<string | undefined>()
  const generatingRef = useRef(false)

  const setField = useCallback(
    <K extends keyof NailsVideoFormState>(key: K, val: NailsVideoFormState[K]) =>
      setForm((f) => ({ ...f, [key]: val })),
    [],
  )

  const handleGenerate = async () => {
    if (!form.coreIdea.trim() || generatingRef.current) return
    generatingRef.current = true
    setLoading(true)
    setError("")
    setOutput("")
    onGeneratingChange?.(true)
    try {
      const upgradedCoreIdea = preparePromptIdeaForGeneration(form.coreIdea, "nails_video")
      const requestData = normalizeFormDataForSave(
        { ...form, coreIdea: upgradedCoreIdea, duration: "10s", videoRatio: "9:16", variationSeed: safeRandomId("variation") },
        "nails_video",
      )
      const apiKey = getApiKey()
      const result = apiKey
        ? await generatePrompt("nails_video", requestData, apiKey, lastPromptRef.current).catch((err) => {
          if (!shouldUseLocalPromptFallback(err)) throw err
          return generateLocalPrompt("nails_video", requestData, lastPromptRef.current)
        })
        : await generateLocalPrompt("nails_video", requestData, lastPromptRef.current)
      const prompt = normalizeGeneratedPrompt(result.prompt, "nails_video")
      setOutput(prompt)
      setGenerationId(result.generationId)
      const firebaseResult = await savePromptToFirebase({
        generationId: result.generationId,
        toolType: "nails_video",
        category: "Nails Style Video",
        coreIdea: form.coreIdea,
        finalPrompt: prompt,
        model: result.model,
        formData: requestData,
        fallbackUsed: result.fallbackUsed,
      })
      const dataSaved = firebaseResult.saved || result.sheetSaved
      const dataError = firebaseResult.error ?? result.sheetError
      setSheetStatus(dataSaved ? "saved" : dataError ? "failed" : undefined)
      onModelUsed?.(result.model)
      lastPromptRef.current = prompt
      if (!dataSaved && result.sheetError && result.generationId && result.syncToken && !result.generationId.startsWith("local_")) {
        addPendingRecord({
          generationId: result.generationId,
          toolType: "nails_video",
          formData: requestData,
          finalPrompt: prompt,
          modelUsed: result.model,
          fallbackUsed: result.fallbackUsed ?? false,
          syncToken: result.syncToken,
          createdAt: Date.now(),
        })
      }
      onPromptGenerated({
        id: safeRandomId("history"),
        timestamp: Date.now(),
        toolType: "nails_video",
        category: "Nails Style Video",
        format: "video",
        coreIdea: upgradedCoreIdea,
        prompt,
        model: result.model,
        videoRatio: "9:16",
        duration: "10s",
        nailStyle: form.nailStyle,
        nailShape: form.nailShape,
        nailColor: form.nailColor,
        revealStyle: form.revealStyle,
        colorMode: form.colorMode,
        generationId: result.generationId,
        sheetSaved: dataSaved,
        sheetError: dataError,
      })
    } catch (err) {
      setError(err instanceof GeminiError ? err.message : "Something went wrong. Please try again.")
    } finally {
      generatingRef.current = false
      setLoading(false)
      onGeneratingChange?.(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }


  return (
    <VStack gap="4" align="stretch">
      <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} p="4" borderRadius="2xl" css={{ background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderColor: "rgba(236,72,153,0.18)" }}>
        <Text fontWeight="bold" color="pink.200">Nails Style Video / නියපොතු වීඩියෝ</Text>
        <Text textStyle="xs" color="gray.500" mt="1">Prompt English වලින් හැදෙයි. මෙතන settings Sinhala hint එක්ක තෝරන්න.</Text>
      </MotionBox>

      <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} p="4" borderRadius="2xl" css={{ background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderColor: "rgba(236,72,153,0.15)" }}>
        <Text fontWeight="semibold" color="pink.300" mb="1.5" css={{ textTransform: "uppercase", fontSize: "0.63rem" }}>Nail Video Idea / නිය වීඩියෝ අදහස *</Text>
        <Textarea placeholder="e.g. cat, sea and panda nail art, exact subject must appear clearly on the nails" value={form.coreIdea} onChange={(e) => setField("coreIdea", e.target.value)} rows={3} resize="none" css={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(236,72,153,0.3)", color: "white", _focus: { borderColor: "#ec4899", boxShadow: glowPink } }} />
        <HStack justify="space-between" align="center" mt="2" gap="3" flexWrap="wrap">
          <Text textStyle="xs" color="gray.500">Duration fixed: 10 seconds / කාලය තත්පර 10යි</Text>
        </HStack>
      </MotionBox>

      <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} p="4" borderRadius="2xl" css={{ background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderColor: "rgba(236,72,153,0.15)" }}>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
          <SelectField label="Nail Style / නිය style" collection={nailStyles} value={[form.nailStyle]} onChange={([v]) => setField("nailStyle", v ?? "Glossy chrome")} accentColor="pink" />
          <SelectField label="Nail Shape / නිය හැඩය" collection={nailShapes} value={[form.nailShape]} onChange={([v]) => setField("nailShape", v ?? "Almond")} accentColor="pink" />
          <SelectField label="Camera / කැමරා ගමන" collection={cameraMovements} value={[form.cameraMovement]} onChange={([v]) => setField("cameraMovement", v ?? "Macro push-in")} accentColor="pink" />
          <SelectField label="Lighting / ආලෝකය" collection={lightings} value={[form.lighting]} onChange={([v]) => setField("lighting", v ?? "Soft beauty lighting")} accentColor="pink" />
          <SelectField label="Video Style / වීඩියෝ ක්‍රමය" collection={processStyles} value={[form.revealStyle]} onChange={([v]) => setField("revealStyle", v ?? "mystery_macro_build")} accentColor="pink" />
        </Grid>
      </MotionBox>

      <Button type="button" w="full" size={{ base: "lg", md: "xl" }} loading={loading} loadingText="Creating your nails video prompt..." onClick={handleGenerate} disabled={!form.coreIdea.trim() || loading} css={{ background: "linear-gradient(135deg, #db2777 0%, #7c3aed 55%, #0891b2 100%)", color: "white", fontWeight: "bold", minH: "56px", height: "auto", py: "3", boxShadow: !loading ? glowPink : "none" }}>
        {!loading && <HStack gap="2.5" justify="center" minW="0" w="full"><Icon fontSize="xl" flexShrink={0}><LuWandSparkles /></Icon><Text whiteSpace="normal" lineHeight="1.35" textAlign="center" overflowWrap="anywhere">Generate Nails Video Prompt / නිය prompt හදන්න</Text><Icon fontSize="xl" flexShrink={0}><LuSparkles /></Icon></HStack>}
      </Button>

      <PromptOutput output={output} loading={loading} error={error} copied={copied} onCopy={handleCopy} accentColor="pink" title="Nails Style Video Prompt" loadingText="Creating your nails video prompt..." tags={["9:16", "10s", "Nails Style"]} sheetStatus={sheetStatus} generationId={generationId} />
    </VStack>
  )
}
