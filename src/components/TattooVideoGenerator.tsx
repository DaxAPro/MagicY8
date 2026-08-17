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
import { preparePromptIdeaForGeneration } from "../services/promptValidation"
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
    { label: "Outer Forearm / පිටත forearm", value: "outer_forearm" },
    { label: "Inner Forearm / ඇතුළත forearm", value: "inner_forearm" },
    { label: "Wrist / මණිකටුව", value: "wrist" },
    { label: "Upper Arm / ඉහළ අත", value: "upper_arm" },
    { label: "Shoulder / උරහිස", value: "shoulder" },
    { label: "Upper Back / ඉහළ පිට", value: "upper_back" },
    { label: "Full Back / සම්පූර්ණ පිට", value: "full_back" },
    { label: "Chest / පපුව", value: "chest" },
    { label: "Side Ribs / පැත්ත", value: "side_ribs" },
    { label: "Thigh / කලවා", value: "thigh" },
    { label: "Calf / පහළ කකුල", value: "calf" },
    { label: "Ankle / වළලුකර", value: "ankle" },
    { label: "Hand / අත", value: "hand" },
    { label: "Finger / ඇඟිල්ල", value: "finger" },
    { label: "Side Neck / ගෙල පැත්ත", value: "side_neck" },
  ],
})

const tattooStyles = createListCollection({
  items: [
    { label: "Realistic / ඇත්ත වගේ", value: "Realistic" },
    { label: "Blackwork / කළු bold art", value: "Blackwork" },
    { label: "Fine Line / සිහින් line", value: "Fine line" },
    { label: "Traditional / පැරණි tattoo style", value: "Traditional" },
    { label: "Neo-Traditional / නව traditional", value: "Neo-traditional" },
    { label: "Watercolor / දියසායම් style", value: "Watercolor" },
    { label: "Geometric / ජ්‍යාමිතික", value: "Geometric" },
    { label: "Japanese / ජපන් style", value: "Japanese" },
    { label: "Tribal / ගෝත්‍රික style", value: "Tribal" },
    { label: "Minimalist / සරල clean", value: "Minimalist" },
  ],
})

const inkStyles = createListCollection({
  items: [
    { label: "Black Ink / කළු ink", value: "Black ink" },
    { label: "Color Ink / පාට ink", value: "Color ink" },
    { label: "Black & Grey / කළු-අළු", value: "Black and grey" },
    { label: "White Ink / සුදු ink", value: "White ink" },
    { label: "Red Ink / රතු ink", value: "Red ink" },
    { label: "Full Color / සම්පූර්ණ පාට", value: "Full color palette" },
  ],
})

const subjectGenders = createListCollection({
  items: [
    { label: "Woman / කාන්තාව", value: "woman" },
    { label: "Man / පිරිමි", value: "man" },
  ],
})

const cameraMovements = createListCollection({
  items: [
    { label: "Macro Close-up / ලඟින් view", value: "Macro close-up" },
    { label: "Slow Push-in / slow zoom", value: "Slow push-in" },
    { label: "Static Shot / camera එක fixed", value: "Static locked-off shot" },
    { label: "Slow Pan / පැත්තට camera", value: "Slow pan" },
    { label: "Handheld / අතින් camera", value: "Handheld" },
  ],
})

const lightings = createListCollection({
  items: [
    { label: "Studio Rim Lighting / studio edge light", value: "Studio rim lighting" },
    { label: "Soft Daylight / මෘදු දවල් එළිය", value: "Soft daylight" },
    { label: "Warm Tungsten / උණුසුම් light", value: "Warm tungsten" },
    { label: "Cool Overhead / උඩින් cool light", value: "Cool overhead" },
    { label: "Cinematic Spotlight / movie spotlight", value: "Cinematic spotlight" },
  ],
})

const processStyles = createListCollection({
  items: [
    { label: "Mystery Macro Build / මුලදී රහස් macro", value: "mystery_macro_build" },
    { label: "Fragment to Final / කොටස් එකතු වෙනවා", value: "fragment_to_final" },
    { label: "Fast Stroke Assembly / ඉක්මන් stroke build", value: "fast_stroke_assembly" },
    { label: "Stencil to Final / stencil එකෙන් final", value: "stencil_to_final" },
    { label: "Layer-by-Layer Color / layer වලින් පාට", value: "layer_by_layer_color" },
    { label: "Final Pullback View / අන්තිමට full view", value: "final_pullback_view" },
  ],
})

const colorModes = createListCollection({
  items: [
    { label: "Black & White / කළු සුදු", value: "black_white" },
    { label: "Black & Grey / කළු අළු", value: "black_grey" },
    { label: "Single Accent / එක highlight පාටක්", value: "single_accent" },
    { label: "Full Color / full පාට", value: "full_color" },
    { label: "Artist Choice / AI හොඳම පාට", value: "artist_choice" },
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
    cameraMovement: initialForm?.cameraMovement ?? "Macro Close-up / ලඟින් view",
    lighting: initialForm?.lighting ?? "Studio Rim Lighting / studio edge light",
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


  return (
    <VStack gap="4" align="stretch">
      <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} p="4" borderRadius="2xl" css={{ background: "rgba(249,115,22,0.06)", borderWidth: "1px", borderColor: "rgba(249,115,22,0.2)" }}>
        <Text fontWeight="bold" color="orange.200">Tattoo Style Video / ටැටූ වීඩියෝ</Text>
        <Text textStyle="xs" color="gray.500" mt="1">Prompt English වලින් හැදෙයි. මෙතන settings Sinhala hint එක්ක තෝරන්න.</Text>
      </MotionBox>

      <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} p="4" borderRadius="2xl" css={{ background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderColor: "rgba(249,115,22,0.15)" }}>
        <Text fontWeight="semibold" color="orange.300" mb="1.5" css={{ textTransform: "uppercase", fontSize: "0.63rem" }}>Tattoo Video Idea / ටැටූ වීඩියෝ අදහස *</Text>
        <Textarea
          placeholder="e.g. fine-line rose tattoo, black grey shading, final design only at the end"
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
          <Text textStyle="xs" color="gray.500">Duration fixed: 10 seconds / කාලය තත්පර 10යි</Text>
        </HStack>
      </MotionBox>

      <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} p="4" borderRadius="2xl" css={{ background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderColor: "rgba(249,115,22,0.15)" }}>
        <HStack gap="2" mb="3">
          <Icon color="orange.400" fontSize="sm"><LuPenTool /></Icon>
          <Text fontWeight="bold" color="orange.200" css={{ textTransform: "uppercase", fontSize: "0.68rem" }}>Style & Placement / style සහ තැන</Text>
        </HStack>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
          <SelectField label="Tattoo Style / ටැටූ style" collection={tattooStyles} value={[form.tattooStyle]} onChange={([v]) => setField("tattooStyle", v ?? "Realistic")} accentColor="orange" />
          <SelectField label="Body Part / ශරීර කොටස" collection={bodyParts} value={[form.bodyPart]} onChange={([v]) => setField("bodyPart", v ?? "outer_forearm")} accentColor="orange" />
          <SelectField label="Ink Style / ink පාට" collection={inkStyles} value={[form.inkStyle]} onChange={([v]) => setField("inkStyle", v ?? "Black ink")} accentColor="orange" />
          <SelectField label="Subject / කෙනා" collection={subjectGenders} value={[form.subjectGender]} onChange={([v]) => setField("subjectGender", v ?? "woman")} accentColor="orange" />
          <SelectField label="Video Style / වීඩියෝ ක්‍රමය" collection={processStyles} value={[form.revealStyle]} onChange={([v]) => setField("revealStyle", v ?? "mystery_macro_build")} accentColor="orange" />
          <SelectField label="Color Mode / පාට වර්ගය" collection={colorModes} value={[form.colorMode]} onChange={([v]) => setField("colorMode", v ?? "black_grey")} accentColor="orange" />
        </Grid>
      </MotionBox>

      <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} p="4" borderRadius="2xl" css={{ background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderColor: "rgba(249,115,22,0.15)" }}>
        <HStack gap="2" mb="3">
          <Icon color="orange.400" fontSize="sm"><LuVideo /></Icon>
          <Text fontWeight="bold" color="orange.200" css={{ textTransform: "uppercase", fontSize: "0.68rem" }}>Camera & Lighting / කැමරා සහ ආලෝකය</Text>
        </HStack>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
          <SelectField label="Camera / කැමරා ගමන" collection={cameraMovements} value={[form.cameraMovement]} onChange={([v]) => setField("cameraMovement", v ?? "Macro Close-up / ලඟින් view")} accentColor="orange" />
          <SelectField label="Lighting / ආලෝකය" collection={lightings} value={[form.lighting]} onChange={([v]) => setField("lighting", v ?? "Studio Rim Lighting / studio edge light")} accentColor="orange" />
        </Grid>
      </MotionBox>

      <HStack justify="center">
        <Badge px="3" py="1.5" borderRadius="full" colorPalette="orange" variant="solid" fontSize="0.75rem">
          Duration fixed: 10 seconds / කාලය තත්පර 10යි
        </Badge>
      </HStack>

      <Button type="button" w="full" size={{ base: "lg", md: "xl" }} loading={loading} loadingText="Creating your tattoo video prompt..." onClick={handleGenerate} disabled={!form.coreIdea.trim() || loading} css={{ background: "linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #9a3412 100%)", color: "white", fontWeight: "bold", minH: "56px", height: "auto", py: "3", boxShadow: !loading ? glowOrange : "none" }}>
        {!loading && <HStack gap="2.5" justify="center" minW="0" w="full"><Icon fontSize="xl" flexShrink={0}><LuPenTool /></Icon><Text fontWeight="bold" whiteSpace="normal" lineHeight="1.35" textAlign="center" overflowWrap="anywhere">Generate Tattoo Video Prompt / ටැටූ prompt හදන්න</Text><Icon fontSize="xl" flexShrink={0}><LuVideo /></Icon></HStack>}
      </Button>

      <PromptOutput output={output} loading={loading} error={error} copied={copied} onCopy={handleCopy} accentColor="orange" title="Tattoo Video Prompt" loadingText="Creating your tattoo video prompt..." tags={["9:16", "10s", "Professional Studio"]} sheetStatus={sheetStatus} generationId={generationId} />
    </VStack>
  )
}
