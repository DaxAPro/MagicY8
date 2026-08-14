"use client"

import {
  Badge,
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
import { LuPenTool, LuVideo } from "react-icons/lu"
import { getApiKey } from "../services/apiKeyStorage"
import { savePromptToFirebase } from "../services/firebasePromptStore"
import { GeminiError, generateLocalPrompt, generatePrompt } from "../services/geminiApi"
import { safeRandomId } from "../services/id"
import { getPromptIdeaFeedback, preparePromptIdeaForGeneration } from "../services/promptValidation"
import { addPendingRecord } from "../services/sheetRetryQueue"
import type { HistoryEntry, SheetStatus, TattooVideoFormState } from "../types"
import { PromptOutput } from "./PromptOutput"
import { SelectField } from "./formControls"

const MotionBox = motion.create(Box)
const glowOrange = "0 0 20px rgba(249,115,22,0.4)"
const fixedVerticalAspectRatio = "9:16"

const BODY_PART_DESCRIPTIONS: Record<string, string> = {
  outer_forearm: "the outer forearm between the wrist and elbow",
  inner_forearm: "the inner forearm between the wrist and elbow",
  wrist: "the wrist",
  upper_arm: "the upper arm",
  shoulder: "the shoulder",
  upper_back: "the upper back between the shoulder blades",
  full_back: "the full back",
  chest: "the chest",
  side_ribs: "the side ribs",
  thigh: "the thigh",
  calf: "the rear lower leg below the knee",
  ankle: "the ankle",
  hand: "the back of the hand",
  finger: "the finger",
  side_neck: "the side of the neck",
}

const bodyParts = createListCollection({
  items: [
    { label: "Outer forearm / bahira forearm", value: "outer_forearm" },
    { label: "Inner forearm / athule forearm", value: "inner_forearm" },
    { label: "Wrist / manik katuwa", value: "wrist" },
    { label: "Upper arm / ihala atha", value: "upper_arm" },
    { label: "Shoulder / urahisa", value: "shoulder" },
    { label: "Upper back / ihala pita", value: "upper_back" },
    { label: "Full back / sampurna pita", value: "full_back" },
    { label: "Chest / papuwa", value: "chest" },
    { label: "Side ribs / pattha", value: "side_ribs" },
    { label: "Thigh / kalawa", value: "thigh" },
    { label: "Calf / pahala kakula", value: "calf" },
    { label: "Ankle", value: "ankle" },
    { label: "Hand", value: "hand" },
    { label: "Finger", value: "finger" },
    { label: "Side of neck", value: "side_neck" },
  ],
})

const tattooStyles = createListCollection({
  items: [
    { label: "Realistic / aththa wage", value: "Realistic" },
    { label: "Blackwork / kalu bold art", value: "Blackwork" },
    { label: "Fine Line / sihin line", value: "Fine line" },
    { label: "Traditional", value: "Traditional" },
    { label: "Neo-Traditional", value: "Neo-traditional" },
    { label: "Watercolor", value: "Watercolor" },
    { label: "Geometric", value: "Geometric" },
    { label: "Japanese", value: "Japanese" },
    { label: "Tribal", value: "Tribal" },
    { label: "Minimalist", value: "Minimalist" },
  ],
})

const inkStyles = createListCollection({
  items: [
    { label: "Black ink / kalu ink", value: "Black ink" },
    { label: "Color ink / pata ink", value: "Color ink" },
    { label: "Black and grey / kalu-alu", value: "Black and grey" },
    { label: "White ink / sudu ink", value: "White ink" },
    { label: "Red ink / rathu ink", value: "Red ink" },
    { label: "Full color palette", value: "Full color palette" },
  ],
})

const subjectGenders = createListCollection({
  items: [
    { label: "Woman", value: "woman" },
    { label: "Man", value: "man" },
  ],
})

const cameraMovements = createListCollection({
  items: [
    { label: "Macro close-up", value: "Macro close-up" },
    { label: "Slow push-in", value: "Slow push-in" },
    { label: "Static locked-off shot", value: "Static locked-off shot" },
    { label: "Slow pan", value: "Slow pan" },
    { label: "Handheld", value: "Handheld" },
  ],
})

const lightings = createListCollection({
  items: [
    { label: "Studio rim lighting", value: "Studio rim lighting" },
    { label: "Soft daylight", value: "Soft daylight" },
    { label: "Warm tungsten", value: "Warm tungsten" },
    { label: "Cool overhead", value: "Cool overhead" },
    { label: "Cinematic spotlight", value: "Cinematic spotlight" },
  ],
})

const processStyles = createListCollection({
  items: [
    { label: "Mystery Macro Build", value: "mystery_macro_build" },
    { label: "Fragment to Final", value: "fragment_to_final" },
    { label: "Fast Stroke Assembly", value: "fast_stroke_assembly" },
    { label: "Stencil to Final", value: "stencil_to_final" },
    { label: "Layer-by-Layer Color", value: "layer_by_layer_color" },
    { label: "Final Pullback View", value: "final_pullback_view" },
  ],
})

const colorModes = createListCollection({
  items: [
    { label: "Black & White", value: "black_white" },
    { label: "Black & Grey", value: "black_grey" },
    { label: "Single Accent Color", value: "single_accent" },
    { label: "Full Color", value: "full_color" },
    { label: "Artist Choice", value: "artist_choice" },
  ],
})

interface TattooVideoGeneratorProps {
  onPromptGenerated: (entry: HistoryEntry) => void
  onGeneratingChange?: (generating: boolean) => void
  onModelUsed?: (model: string) => void
  onRequireApiKey?: () => void
  initialForm?: Partial<TattooVideoFormState>
}

export function TattooVideoGenerator({
  onPromptGenerated,
  onGeneratingChange,
  onModelUsed,
  initialForm,
}: TattooVideoGeneratorProps) {
  const [form, setForm] = useState<TattooVideoFormState>({
    coreIdea: initialForm?.coreIdea ?? "",
    tattooStyle: initialForm?.tattooStyle ?? "Realistic",
    bodyPart: initialForm?.bodyPart ?? "outer_forearm",
    inkStyle: initialForm?.inkStyle ?? "Black ink",
    cameraMovement: initialForm?.cameraMovement ?? "Macro close-up",
    lighting: initialForm?.lighting ?? "Studio rim lighting",
    aspectRatio: fixedVerticalAspectRatio,
    subjectGender: initialForm?.subjectGender ?? "woman",
    revealStyle: initialForm?.revealStyle ?? "mystery_macro_build",
    colorMode: initialForm?.colorMode ?? "black_grey",
  })
  const [output, setOutput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [sheetStatus, setSheetStatus] = useState<SheetStatus | undefined>()
  const [generationId, setGenerationId] = useState<string | undefined>()
  const generatingRef = useRef(false)
  const lastPromptRef = useRef<string | undefined>()

  const setField = useCallback(
    <K extends keyof TattooVideoFormState>(key: K, val: TattooVideoFormState[K]) =>
      setForm((f) => ({ ...f, [key]: val })),
    [],
  )

  const handleGenerate = async () => {
    if (!form.coreIdea.trim() || generatingRef.current) return
    generatingRef.current = true
    setLoading(true)
    setOutput("")
    setError("")
    onGeneratingChange?.(true)

    try {
      const bodyPartLabel = bodyParts.items.find((item) => item.value === form.bodyPart)?.label ?? "Outer forearm"
      const bodyPartDescription = BODY_PART_DESCRIPTIONS[form.bodyPart] ?? "the outer forearm"
      const upgradedCoreIdea = preparePromptIdeaForGeneration(form.coreIdea, "tattoo_video")
      const requestData = {
        ...form,
        coreIdea: upgradedCoreIdea,
        aspectRatio: fixedVerticalAspectRatio,
        bodyPartLabel,
        bodyPartDescription,
        variationSeed: safeRandomId("variation"),
      }
      const apiKey = getApiKey()
      const result = apiKey
        ? await generatePrompt("tattoo_video", requestData, apiKey, lastPromptRef.current).catch(() =>
          generateLocalPrompt("tattoo_video", requestData, lastPromptRef.current),
        )
        : await generateLocalPrompt("tattoo_video", requestData, lastPromptRef.current)

      const { prompt, model, fallbackUsed, generationId: genId, sheetSaved, sheetError: sheetErr, syncToken } = result
      setOutput(prompt)
      onModelUsed?.(model)
      setGenerationId(genId)
      lastPromptRef.current = prompt

      const firebaseResult = await savePromptToFirebase({
        generationId: genId,
        toolType: "tattoo_video",
        category: "Tattoo Video",
        coreIdea: form.coreIdea,
        finalPrompt: prompt,
        model,
        formData: requestData,
        fallbackUsed,
      })
      const finalSheetSaved = firebaseResult.saved || sheetSaved
      const finalSheetError = firebaseResult.error ?? sheetErr
      setSheetStatus(finalSheetSaved ? "saved" : finalSheetError ? "failed" : undefined)

      if (!finalSheetSaved && finalSheetError && genId && syncToken && !genId.startsWith("local_")) {
        addPendingRecord({
          generationId: genId,
          toolType: "tattoo_video",
          formData: requestData,
          finalPrompt: prompt,
          modelUsed: model,
          fallbackUsed: fallbackUsed ?? false,
          syncToken,
          createdAt: Date.now(),
        })
      }

      onPromptGenerated({
        id: safeRandomId("history"),
        timestamp: Date.now(),
        toolType: "tattoo_video",
        category: "Tattoo Video",
        format: "video",
        coreIdea: upgradedCoreIdea,
        prompt,
        model,
        videoRatio: fixedVerticalAspectRatio,
        duration: "10s",
        bodyPart: form.bodyPart,
        tattooStyle: form.tattooStyle,
        inkStyle: form.inkStyle,
        subjectGender: form.subjectGender,
        revealStyle: form.revealStyle,
        colorMode: form.colorMode,
        generationId: genId,
        sheetSaved: finalSheetSaved,
        sheetError: finalSheetError,
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

  const ideaFeedback = form.coreIdea.trim() ? getPromptIdeaFeedback(form.coreIdea, "tattoo_video") : undefined

  return (
    <VStack gap="4" align="stretch">
      <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} p="4" borderRadius="2xl" css={{ background: "rgba(249,115,22,0.06)", borderWidth: "1px", borderColor: "rgba(249,115,22,0.2)" }}>
        <Text fontWeight="bold" color="orange.200">Tattoo Video Generator / tattoo video hadanna</Text>
        <Text textStyle="xs" color="gray.500" mt="1">10-second vertical tattoo process prompts. Weak ideas auto-upgrade wenawa.</Text>
      </MotionBox>

      <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} p="4" borderRadius="2xl" css={{ background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderColor: "rgba(249,115,22,0.15)" }}>
        <Text fontWeight="semibold" color="orange.300" mb="1.5" css={{ textTransform: "uppercase", fontSize: "0.63rem" }}>Tattoo Design Idea / tattoo adahasa *</Text>
        <Textarea
          placeholder="e.g. geometric mandala with sacred geometry patterns"
          value={form.coreIdea}
          onChange={(e) => setField("coreIdea", e.target.value)}
          rows={3}
          resize="none"
          css={{
            background: "rgba(255,255,255,0.04)",
            borderColor: "rgba(249,115,22,0.3)",
            color: "white",
            _focus: { borderColor: "#f97316", boxShadow: glowOrange },
          }}
        />
        <HStack justify="space-between" align="center" mt="2" gap="3" flexWrap="wrap">
          <Text textStyle="xs" color="gray.500">9:16 vertical - 10 seconds fixed</Text>
          {ideaFeedback && (
            <Text textStyle="xs" color={ideaFeedback.label === "Weak" ? "red.300" : ideaFeedback.label === "Good" ? "yellow.300" : "green.300"}>
              Idea quality: {ideaFeedback.label} ({ideaFeedback.score}%)
            </Text>
          )}
        </HStack>
        {ideaFeedback?.label === "Weak" && (
          <Button type="button" size="xs" mt="2" variant="ghost" onClick={() => setField("coreIdea", ideaFeedback.suggestion)} css={{ color: "orange.300", _hover: { background: "rgba(249,115,22,0.12)" } }}>
            Auto-upgrade idea
          </Button>
        )}
      </MotionBox>

      <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} p="4" borderRadius="2xl" css={{ background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderColor: "rgba(249,115,22,0.15)" }}>
        <HStack gap="2" mb="3">
          <Icon color="orange.400" fontSize="sm"><LuPenTool /></Icon>
          <Text fontWeight="bold" color="orange.200" css={{ textTransform: "uppercase", fontSize: "0.68rem" }}>Style & Placement</Text>
        </HStack>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
          <SelectField label="Tattoo Style / tattoo style" collection={tattooStyles} value={[form.tattooStyle]} onChange={([v]) => setField("tattooStyle", v ?? "Realistic")} accentColor="orange" />
          <SelectField label="Body Part / sharira kotasa" collection={bodyParts} value={[form.bodyPart]} onChange={([v]) => setField("bodyPart", v ?? "outer_forearm")} accentColor="orange" />
          <SelectField label="Ink Style / ink pata" collection={inkStyles} value={[form.inkStyle]} onChange={([v]) => setField("inkStyle", v ?? "Black ink")} accentColor="orange" />
          <SelectField label="Subject / kena" collection={subjectGenders} value={[form.subjectGender]} onChange={([v]) => setField("subjectGender", v ?? "woman")} accentColor="orange" />
          <SelectField label="Video Style / video kramaya" collection={processStyles} value={[form.revealStyle]} onChange={([v]) => setField("revealStyle", v ?? "mystery_macro_build")} accentColor="orange" />
          <SelectField label="Color Mode / pata wargaya" collection={colorModes} value={[form.colorMode]} onChange={([v]) => setField("colorMode", v ?? "black_grey")} accentColor="orange" />
        </Grid>
      </MotionBox>

      <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} p="4" borderRadius="2xl" css={{ background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderColor: "rgba(249,115,22,0.15)" }}>
        <HStack gap="2" mb="3">
          <Icon color="orange.400" fontSize="sm"><LuVideo /></Icon>
          <Text fontWeight="bold" color="orange.200" css={{ textTransform: "uppercase", fontSize: "0.68rem" }}>Camera & Lighting</Text>
        </HStack>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
          <SelectField label="Camera Movement / camera gamana" collection={cameraMovements} value={[form.cameraMovement]} onChange={([v]) => setField("cameraMovement", v ?? "Macro close-up")} accentColor="orange" />
          <SelectField label="Lighting / alokaya" collection={lightings} value={[form.lighting]} onChange={([v]) => setField("lighting", v ?? "Studio rim lighting")} accentColor="orange" />
        </Grid>
      </MotionBox>

      <HStack justify="center">
        <Badge px="3" py="1.5" borderRadius="full" colorPalette="orange" variant="solid" fontSize="0.75rem">
          9:16 vertical - 10 seconds fixed
        </Badge>
      </HStack>

      <Button type="button" w="full" size={{ base: "lg", md: "xl" }} loading={loading} loadingText="Creating your tattoo video prompt..." onClick={handleGenerate} disabled={!form.coreIdea.trim() || loading} css={{ background: "linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #9a3412 100%)", color: "white", fontWeight: "bold", minH: "56px", height: "auto", py: "3", boxShadow: !loading ? glowOrange : "none" }}>
        {!loading && <HStack gap="2.5" justify="center" minW="0" w="full"><Icon fontSize="xl" flexShrink={0}><LuPenTool /></Icon><Text fontWeight="bold" whiteSpace="normal" lineHeight="1.35" textAlign="center" overflowWrap="anywhere">Generate Tattoo Video Prompt / tattoo prompt hadanna</Text><Icon fontSize="xl" flexShrink={0}><LuVideo /></Icon></HStack>}
      </Button>

      <PromptOutput output={output} loading={loading} error={error} copied={copied} onCopy={handleCopy} accentColor="orange" title="Tattoo Video Prompt" loadingText="Creating your tattoo video prompt..." tags={["9:16", "10s", "Professional Studio"]} sheetStatus={sheetStatus} generationId={generationId} />
    </VStack>
  )
}
