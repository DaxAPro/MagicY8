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
import { generatePrompt, GeminiError } from "../services/geminiApi"
import { getApiKey } from "../services/apiKeyStorage"
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
    { label: "Outer forearm", value: "outer_forearm" },
    { label: "Inner forearm", value: "inner_forearm" },
    { label: "Wrist", value: "wrist" },
    { label: "Upper arm / bicep", value: "upper_arm" },
    { label: "Shoulder", value: "shoulder" },
    { label: "Upper back", value: "upper_back" },
    { label: "Full back", value: "full_back" },
    { label: "Chest / pectoral area", value: "chest" },
    { label: "Side ribs", value: "side_ribs" },
    { label: "Thigh", value: "thigh" },
    { label: "Calf", value: "calf" },
    { label: "Ankle", value: "ankle" },
    { label: "Hand", value: "hand" },
    { label: "Finger", value: "finger" },
    { label: "Side of neck", value: "side_neck" },
  ],
})

const tattooStyles = createListCollection({
  items: [
    { label: "Realistic", value: "Realistic" },
    { label: "Blackwork", value: "Blackwork" },
    { label: "Fine Line", value: "Fine line" },
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
    { label: "Black ink", value: "Black ink" },
    { label: "Color ink", value: "Color ink" },
    { label: "Black & grey", value: "Black and grey" },
    { label: "White ink", value: "White ink" },
    { label: "Red ink", value: "Red ink" },
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
    { label: "Static locked-off", value: "Static locked-off shot" },
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

const revealStyles = createListCollection({
  items: [
    { label: "Botched Wipe Reveal", value: "botched_wipe_reveal" },
    { label: "Scribble Illusion", value: "scribble_illusion" },
    { label: "Second-Skin Peel", value: "second_skin_peel" },
    { label: "Single-Line Illusion", value: "single_line_illusion" },
    { label: "Ink Blot Galaxy", value: "ink_blot_galaxy" },
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
  onRequireApiKey,
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
    revealStyle: initialForm?.revealStyle ?? "botched_wipe_reveal",
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

    const apiKey = getApiKey()
    if (!apiKey) {
      setError("Add your Groq API key in API Settings.")
      onRequireApiKey?.()
      return
    }

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

      const {
        prompt,
        model,
        fallbackUsed,
        generationId: genId,
        sheetSaved,
        sheetError: sheetErr,
        syncToken,
      } =
        await generatePrompt("tattoo_video", {
          ...form,
          aspectRatio: fixedVerticalAspectRatio,
          bodyPartLabel,
          bodyPartDescription,
          variationSeed: crypto.randomUUID(),
        }, apiKey, lastPromptRef.current)
      const finalSheetSaved = sheetSaved
      const finalSheetError = sheetErr
      setOutput(prompt)
      onModelUsed?.(model)
      setGenerationId(genId)
      lastPromptRef.current = prompt

      if (finalSheetSaved) {
        setSheetStatus("saved")
      } else if (finalSheetError) {
        setSheetStatus("failed")
        if (genId && !genId.startsWith("local_")) {
          addPendingRecord({
            generationId: genId,
            toolType: "tattoo_video",
            formData: { ...form, aspectRatio: fixedVerticalAspectRatio, bodyPartLabel, bodyPartDescription } as Record<string, unknown>,
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
              All tattoo video prompts are designed for exactly 10 seconds — one
              continuous shot, one body part, professional studio setting.
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
            Style &amp; Placement
          </Text>
        </HStack>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
          <SelectField
            label="Tattoo Style"
            collection={tattooStyles}
            value={[form.tattooStyle]}
            onChange={([v]) => setField("tattooStyle", v ?? "Realistic")}
            accentColor="orange"
          />
          <SelectField
            label="Select Body Part"
            collection={bodyParts}
            value={[form.bodyPart]}
            onChange={([v]) => setField("bodyPart", v ?? "outer_forearm")}
            accentColor="orange"
          />
          <SelectField
            label="Ink Style / Color"
            collection={inkStyles}
            value={[form.inkStyle]}
            onChange={([v]) => setField("inkStyle", v ?? "Black ink")}
            accentColor="orange"
          />
          <SelectField
            label="Subject"
            collection={subjectGenders}
            value={[form.subjectGender]}
            onChange={([v]) => setField("subjectGender", v ?? "woman")}
            accentColor="orange"
          />
          <SelectField
            label="Reveal Style"
            collection={revealStyles}
            value={[form.revealStyle]}
            onChange={([v]) => setField("revealStyle", v ?? "botched_wipe_reveal")}
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
            Camera &amp; Lighting
          </Text>
        </HStack>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
          <SelectField
            label="Camera Movement"
            collection={cameraMovements}
            value={[form.cameraMovement]}
            onChange={([v]) => setField("cameraMovement", v ?? "Macro close-up")}
            accentColor="orange"
          />
          <SelectField
            label="Lighting"
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
            9:16 vertical · 10 seconds (fixed)
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
            loadingText="Groq is crafting your tattoo video prompt..."
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
                <Text fontWeight="bold">Generate Tattoo Video Prompt</Text>
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
        loadingText="Groq is crafting your tattoo video prompt..."
        tags={["10s", "One Continuous Shot", "Professional Studio"]}
        sheetStatus={sheetStatus}
        generationId={generationId}
      />
    </VStack>
  )
}
