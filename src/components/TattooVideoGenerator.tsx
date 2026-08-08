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
import { generateLocalPrompt, generatePrompt, GeminiError } from "../services/geminiApi"
import { getApiKey } from "../services/apiKeyStorage"
import { savePromptToFirebase } from "../services/firebasePromptStore"
import { addPendingRecord } from "../services/sheetRetryQueue"
import type { HistoryEntry, SheetStatus, TattooVideoFormState } from "../types"
import { PromptOutput } from "./PromptOutput"
import { SelectField } from "./formControls"

const MotionBox = motion.create(Box)

const glowOrange = "0 0 20px rgba(249,115,22,0.4)"

const BODY_PART_DESCRIPTIONS: Record<string, string> = {
  outer_forearm: "the outer forearm between the wrist and elbow",
  inner_forearm: "the inner forearm between the wrist and elbow",
  wrist: "the wrist",
  upper_arm: "the upper arm / bicep area",
  shoulder: "the shoulder area",
  upper_back: "the upper back between the shoulder blades",
  full_back: "the full back",
  chest: "the chest / pectoral area",
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
    { label: "Outer forearm / බාහිර forearm", value: "outer_forearm" },
    { label: "Inner forearm / ඇතුල් forearm", value: "inner_forearm" },
    { label: "Wrist / මැණික් කටුව", value: "wrist" },
    { label: "Upper arm / ඉහළ අත", value: "upper_arm" },
    { label: "Shoulder / උරහිස", value: "shoulder" },
    { label: "Upper back / ඉහළ පිට", value: "upper_back" },
    { label: "Full back / සම්පූර්ණ පිට", value: "full_back" },
    { label: "Chest / පපුව", value: "chest" },
    { label: "Side ribs / පැත්ත", value: "side_ribs" },
    { label: "Thigh / කලවා", value: "thigh" },
    { label: "Calf / පහළ කකුල", value: "calf" },
    { label: "Ankle / ankle", value: "ankle" },
    { label: "Hand / අත", value: "hand" },
    { label: "Finger / ඇඟිල්ල", value: "finger" },
    { label: "Side of neck / බෙල්ල පැත්ත", value: "side_neck" },
  ],
})

const tattooStyles = createListCollection({
  items: [
    { label: "Realistic / ඇත්ත වගේ", value: "Realistic" },
    { label: "Blackwork / කළු bold art", value: "Blackwork" },
    { label: "Fine Line / සිහින් line", value: "Fine line" },
    { label: "Traditional / classic tattoo", value: "Traditional" },
    { label: "Neo-Traditional / modern classic", value: "Neo-traditional" },
    { label: "Watercolor / දියසායම් look", value: "Watercolor" },
    { label: "Geometric / හැඩතල art", value: "Geometric" },
    { label: "Japanese / Japanese style", value: "Japanese" },
    { label: "Tribal / tribal pattern", value: "Tribal" },
    { label: "Minimalist / simple clean", value: "Minimalist" },
  ],
})

const inkStyles = createListCollection({
  items: [
    { label: "Black ink / කළු ink", value: "Black ink" },
    { label: "Color ink / පාට ink", value: "Color ink" },
    { label: "Black & grey / කළු-අළු", value: "Black and grey" },
    { label: "White ink / සුදු ink", value: "White ink" },
    { label: "Red ink / රතු ink", value: "Red ink" },
    { label: "Full color palette / full පාට", value: "Full color palette" },
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
    { label: "Macro close-up / ලඟම shot", value: "Macro close-up" },
    { label: "Slow push-in / හෙමින් zoom", value: "Slow push-in" },
    { label: "Static locked-off / camera නොසෙලවෙන", value: "Static locked-off shot" },
    { label: "Slow pan / පැත්තට slow move", value: "Slow pan" },
    { label: "Handheld / අතින් camera feel", value: "Handheld" },
  ],
})

const lightings = createListCollection({
  items: [
    { label: "Studio rim lighting / studio edge light", value: "Studio rim lighting" },
    { label: "Soft daylight / soft daylight", value: "Soft daylight" },
    { label: "Warm tungsten / උණුසුම් light", value: "Warm tungsten" },
    { label: "Cool overhead / ඉහළ cool light", value: "Cool overhead" },
    { label: "Cinematic spotlight / film spotlight", value: "Cinematic spotlight" },
  ],
})

const processStyles = createListCollection({
  items: [
    { label: "Mystery Macro Build / මුලදී රහස් macro", value: "mystery_macro_build" },
    { label: "Fragment to Final / කොටස් එකතු වෙනවා", value: "fragment_to_final" },
    { label: "Fast Stroke Assembly / ඉක්මන් line build", value: "fast_stroke_assembly" },
    { label: "Stencil to Final / stencil සිට final", value: "stencil_to_final" },
    { label: "Layer-by-Layer Color / layer වලින් පාට", value: "layer_by_layer_color" },
    { label: "Final Pullback View / අන්තිමට full view", value: "final_pullback_view" },
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

const aspectRatios = createListCollection({
  items: [
    { label: "9:16 — Shorts / Reels", value: "9:16" },
    { label: "16:9 — Wide / YouTube", value: "16:9" },
    { label: "1:1 — Square / Instagram", value: "1:1" },
  ],
})
const fixedVerticalAspectRatio = aspectRatios.items[0]?.value ?? "9:16"

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
    <K extends keyof TattooVideoFormState>(
      key: K,
      val: TattooVideoFormState[K],
    ) => setForm((f) => ({ ...f, [key]: val })),
    [],
  )

  const handleGenerate = async () => {
    if (!form.coreIdea.trim()) return
    if (generatingRef.current) return

    generatingRef.current = true
    setLoading(true)
    setOutput("")
    setError("")
    onGeneratingChange?.(true)

    try {
      const bodyPartLabel =
        bodyParts.items.find((item) => item.value === form.bodyPart)?.label ??
        "Outer forearm"
      const bodyPartDescription =
        BODY_PART_DESCRIPTIONS[form.bodyPart] ?? "the outer forearm"

      const requestData = {
        ...form,
        aspectRatio: fixedVerticalAspectRatio,
        bodyPartLabel,
        bodyPartDescription,
        variationSeed: crypto.randomUUID(),
      }
      const apiKey = getApiKey()
      const result = apiKey
        ? await generatePrompt("tattoo_video", requestData, apiKey, lastPromptRef.current).catch(async (err) => {
          if (err instanceof GeminiError) {
            return generateLocalPrompt("tattoo_video", requestData, lastPromptRef.current)
          }
          throw err
        })
        : await generateLocalPrompt("tattoo_video", requestData, lastPromptRef.current)
      const {
        prompt,
        model,
        fallbackUsed,
        generationId: genId,
        sheetSaved,
        sheetError: sheetErr,
        syncToken,
      } = result
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

      if (finalSheetSaved) {
        setSheetStatus("saved")
      } else if (finalSheetError) {
        setSheetStatus("failed")
        if (genId && syncToken && !genId.startsWith("local_")) {
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
      } else {
        setSheetStatus("pending")
      }

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        toolType: "tattoo_video",
        category: "Tattoo Video",
        format: "video",
        coreIdea: form.coreIdea,
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
      }
      onPromptGenerated(entry)
    } catch (err) {
      setError(
        err instanceof GeminiError
          ? err.message
          : "Something went wrong. Please try again.",
      )
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
      {/* Info banner */}
      <MotionBox
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        // @ts-expect-error framer-motion types
        transition={{ duration: 0.4 }}
        p="4"
        borderRadius="2xl"
        css={{
          background: "rgba(249,115,22,0.06)",
          backdropFilter: "blur(16px)",
          borderWidth: "1px",
          borderColor: "rgba(249,115,22,0.2)",
        }}
      >
        <HStack gap="3" mb="3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            // @ts-expect-error framer-motion types
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <Icon color="orange.400" fontSize="xl"><LuPenTool /></Icon>
          </motion.div>
          <Box>
            <Text textStyle="xs" color="gray.500">
              Cinematic 10-second tattoo process videos, generated by Groq
            </Text>
          </Box>
        </HStack>
        <Box
          p="3"
          borderRadius="lg"
          css={{
            background: "rgba(249,115,22,0.08)",
            borderWidth: "1px",
            borderColor: "rgba(249,115,22,0.15)",
          }}
        >
          <HStack gap="2" wrap="wrap">
            <Text textStyle="xs" color="gray.500" lineHeight="1.6">
              <Text as="span" color="orange.400" fontWeight="medium">
                Fixed duration:
              </Text>{" "}
              All tattoo video prompts are designed for exactly 10 seconds - එක
              continuous shot, එක body part, professional studio setting.
            </Text>
          </HStack>
        </Box>
      </MotionBox>

      {/* Tattoo design idea */}
      <MotionBox
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        // @ts-expect-error framer-motion types
        transition={{ duration: 0.4, delay: 0.05 }}
        p="4"
        borderRadius="2xl"
        css={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(16px)",
          borderWidth: "1px",
          borderColor: "rgba(249,115,22,0.15)",
        }}
      >
        <HStack gap="2" mb="3">
          <Icon color="orange.400" fontSize="sm"><LuPenTool /></Icon>
          <Text
            fontWeight="bold"
            color="orange.200"
            letterSpacing="wider"
            css={{ textTransform: "uppercase", fontSize: "0.68rem" }}
          >
            Tattoo Design
          </Text>
        </HStack>
        <Box>
          <Text
            fontWeight="semibold"
            color="orange.300"
            mb="1.5"
            letterSpacing="widest"
            css={{ textTransform: "uppercase", fontSize: "0.63rem" }}
          >
            Tattoo Design Idea *
          </Text>
          <Textarea
            placeholder="e.g. 'A geometric mandala with sacred geometry patterns'"
            value={form.coreIdea}
            onChange={(e) => setField("coreIdea", e.target.value)}
            rows={3}
            resize="none"
            css={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(249,115,22,0.3)",
              color: "white",
              fontSize: "0.9rem",
              lineHeight: "1.7",
              _placeholder: { color: "rgba(255,255,255,0.18)" },
              _hover: { borderColor: "#f97316" },
              _focus: {
                borderColor: "#f97316",
                boxShadow: glowOrange,
                background: "rgba(255,255,255,0.05)",
              },
            }}
          />
        </Box>
      </MotionBox>

      {/* Style & Placement */}
      <MotionBox
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        // @ts-expect-error framer-motion types
        transition={{ duration: 0.4, delay: 0.1 }}
        p="4"
        borderRadius="2xl"
        css={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(16px)",
          borderWidth: "1px",
          borderColor: "rgba(249,115,22,0.15)",
        }}
      >
        <HStack gap="2" mb="3">
          <Icon color="orange.400" fontSize="sm"><LuVideo /></Icon>
          <Text
            fontWeight="bold"
            color="orange.200"
            letterSpacing="wider"
            css={{ textTransform: "uppercase", fontSize: "0.68rem" }}
          >
            Style &amp; Placement / Style සහ ස්ථානය
          </Text>
        </HStack>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
          <SelectField
            label="Tattoo Style / ටැටූ style"
            collection={tattooStyles}
            value={[form.tattooStyle]}
            onChange={([v]) => setField("tattooStyle", v ?? "Realistic")}
            accentColor="orange"
          />
          <SelectField
            label="Select Body Part / ශරීර කොටස"
            collection={bodyParts}
            value={[form.bodyPart]}
            onChange={([v]) => setField("bodyPart", v ?? "outer_forearm")}
            accentColor="orange"
          />
          <SelectField
            label="Ink Style / Color / ink පාට"
            collection={inkStyles}
            value={[form.inkStyle]}
            onChange={([v]) => setField("inkStyle", v ?? "Black ink")}
            accentColor="orange"
          />
          <SelectField
            label="Subject / කෙනා"
            collection={subjectGenders}
            value={[form.subjectGender]}
            onChange={([v]) => setField("subjectGender", v ?? "woman")}
            accentColor="orange"
          />
          <SelectField
            label="Video Style / වීඩියෝ ක්‍රමය"
            collection={processStyles}
            value={[form.revealStyle]}
            onChange={([v]) => setField("revealStyle", v ?? "mystery_macro_build")}
            accentColor="orange"
          />
          <SelectField
            label="Color Mode / පාට වර්ගය"
            collection={colorModes}
            value={[form.colorMode]}
            onChange={([v]) => setField("colorMode", v ?? "black_grey")}
            accentColor="orange"
          />
        </Grid>
      </MotionBox>

      {/* Camera & Lighting */}
      <MotionBox
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        // @ts-expect-error framer-motion types
        transition={{ duration: 0.4, delay: 0.15 }}
        p="4"
        borderRadius="2xl"
        css={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(16px)",
          borderWidth: "1px",
          borderColor: "rgba(249,115,22,0.15)",
        }}
      >
        <HStack gap="2" mb="3">
          <Icon color="orange.400" fontSize="sm"><LuVideo /></Icon>
          <Text
            fontWeight="bold"
            color="orange.200"
            letterSpacing="wider"
            css={{ textTransform: "uppercase", fontSize: "0.68rem" }}
          >
            Camera &amp; Lighting / කැමරා සහ ආලෝකය
          </Text>
        </HStack>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
          <SelectField
            label="Camera Movement / කැමරා ගමන"
            collection={cameraMovements}
            value={[form.cameraMovement]}
            onChange={([v]) => setField("cameraMovement", v ?? "Macro close-up")}
            accentColor="orange"
          />
          <SelectField
            label="Lighting / ආලෝකය"
            collection={lightings}
            value={[form.lighting]}
            onChange={([v]) => setField("lighting", v ?? "Studio rim lighting")}
            accentColor="orange"
          />
        </Grid>
      </MotionBox>

      {/* Fixed duration badge */}
      <MotionBox
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        // @ts-expect-error framer-motion types
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <HStack gap="3" justify="center">
          <Badge
            px="3"
            py="1.5"
            borderRadius="full"
            colorPalette="orange"
            variant="solid"
            fontSize="0.75rem"
          >
            9:16 vertical / සිරස් video - 10 seconds fixed
          </Badge>
        </HStack>
      </MotionBox>

      {/* Generate Button */}
      <MotionBox
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        // @ts-expect-error framer-motion types
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
          <Button
            w="full"
            size="xl"
            loading={loading}
            loadingText="Creating your tattoo video prompt..."
            onClick={handleGenerate}
            disabled={!form.coreIdea.trim() || loading}
            css={{
              background: loading
                ? "rgba(249,115,22,0.2)"
                : "linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #9a3412 100%)",
              color: "white",
              fontWeight: "bold",
              fontSize: "1rem",
              letterSpacing: "0.04em",
              borderRadius: "xl",
              border: "1px solid rgba(249,115,22,0.4)",
              minH: "56px",
              boxShadow: !loading ? glowOrange : "none",
              _hover: {
                background:
                  "linear-gradient(135deg, #c2410c 0%, #9a3412 50%, #7c2d12 100%)",
                boxShadow:
                  "0 0 30px rgba(249,115,22,0.6), 0 0 60px rgba(249,115,22,0.3)",
              },
              _disabled: {
                opacity: 0.35,
                cursor: "not-allowed",
                background:
                  "linear-gradient(135deg, #7c2d12 0%, #5c1d0e 50%, #450a04 100%)",
                boxShadow: "none",
              },
            }}
          >
            {!loading && (
              <HStack gap="2.5">
                <motion.span
                  animate={{ rotate: [0, 15, -15, 0] }}
                  // @ts-expect-error framer-motion types
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  <Icon fontSize="xl"><LuPenTool /></Icon>
                </motion.span>
                <Text fontWeight="bold">Generate Tattoo Video Prompt / ටැටූ prompt හදන්න</Text>
                <Icon fontSize="xl"><LuVideo /></Icon>
              </HStack>
            )}
          </Button>
        </motion.div>
      </MotionBox>

      <PromptOutput
        output={output}
        loading={loading}
        error={error}
        copied={copied}
        onCopy={handleCopy}
        accentColor="orange"
        title="Tattoo Video Prompt"
        loadingText="Creating your tattoo video prompt..."
        tags={["10s", "One Continuous Shot", "Professional Studio"]}
        sheetStatus={sheetStatus}
        generationId={generationId}
      />
    </VStack>
  )
}
