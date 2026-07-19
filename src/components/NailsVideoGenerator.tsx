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
import { generatePrompt, GeminiError } from "../services/geminiApi"
import { getApiKey } from "../services/apiKeyStorage"
import { addPendingRecord } from "../services/sheetRetryQueue"
import { savePromptDirectToGoogleSheets } from "../services/directGoogleSheets"
import type { HistoryEntry, NailsVideoFormState, SheetStatus } from "../types"
import { PromptOutput } from "./PromptOutput"
import { SelectField } from "./formControls"

const MotionBox = motion.create(Box)
const glowPink = "0 0 20px rgba(236,72,153,0.38)"

const durations = createListCollection({
  items: [
    { label: "8 seconds", value: "8s" },
    { label: "10 seconds", value: "10s" },
  ],
})

const nailStyles = createListCollection({
  items: [
    { label: "Glossy Chrome", value: "Glossy chrome" },
    { label: "French Tip", value: "Modern French tip" },
    { label: "Cat Eye Gel", value: "Cat eye gel" },
    { label: "Glitter Ombre", value: "Glitter ombre" },
    { label: "3D Bow Charms", value: "3D bow charms" },
    { label: "Minimal Clean Girl", value: "Minimal clean girl nails" },
    { label: "Aura Nails", value: "Aura nails" },
    { label: "Marble Luxury", value: "Luxury marble nails" },
  ],
})

const nailShapes = createListCollection({
  items: [
    { label: "Almond", value: "Almond" },
    { label: "Square", value: "Square" },
    { label: "Coffin", value: "Coffin" },
    { label: "Stiletto", value: "Stiletto" },
    { label: "Short Natural", value: "Short natural" },
  ],
})

const nailColors = createListCollection({
  items: [
    { label: "Pearl Pink", value: "Pearl pink" },
    { label: "Milky White", value: "Milky white" },
    { label: "Rose Gold", value: "Rose gold" },
    { label: "Cherry Red", value: "Cherry red" },
    { label: "Black Chrome", value: "Black chrome" },
    { label: "Soft Lavender", value: "Soft lavender" },
  ],
})

const cameraMovements = createListCollection({
  items: [
    { label: "Macro Push-in", value: "Macro push-in" },
    { label: "Slow Orbit", value: "Slow orbit" },
    { label: "Top-down Beauty Shot", value: "Top-down beauty shot" },
    { label: "Rack Focus", value: "Rack focus" },
  ],
})

const lightings = createListCollection({
  items: [
    { label: "Soft Beauty Lighting", value: "Soft beauty lighting" },
    { label: "Glossy Studio Light", value: "Glossy studio light" },
    { label: "Warm Salon Glow", value: "Warm salon glow" },
    { label: "Luxury Product Light", value: "Luxury product light" },
  ],
})

const revealStyles = createListCollection({
  items: [
    { label: "Wet Polish Drop", value: "wet_polish_drop" },
    { label: "Drag Marble Reveal", value: "drag_marble_reveal" },
    { label: "Cat Eye Magnet Pull", value: "cat_eye_magnet_pull" },
    { label: "Messy Glitter Cleanup", value: "messy_glitter_cleanup" },
    { label: "Blooming Gel Flower", value: "blooming_gel_flower" },
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
  onRequireApiKey,
  initialForm,
}: NailsVideoGeneratorProps) {
  const [form, setForm] = useState<NailsVideoFormState>({
    coreIdea: initialForm?.coreIdea ?? "",
    duration: initialForm?.duration ?? "8s",
    nailStyle: initialForm?.nailStyle ?? "Glossy chrome",
    nailShape: initialForm?.nailShape ?? "Almond",
    nailColor: initialForm?.nailColor ?? "Pearl pink",
    cameraMovement: initialForm?.cameraMovement ?? "Macro push-in",
    lighting: initialForm?.lighting ?? "Soft beauty lighting",
    revealStyle: initialForm?.revealStyle ?? "wet_polish_drop",
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
    const apiKey = getApiKey()
    if (!apiKey) {
      setError("Add your Groq API key in API Settings.")
      onRequireApiKey?.()
      return
    }
    generatingRef.current = true
    setLoading(true)
    setError("")
    setOutput("")
    onGeneratingChange?.(true)
    try {
      const requestData = { ...form, videoRatio: "9:16", variationSeed: crypto.randomUUID() }
      const result = await generatePrompt("nails_video", requestData, apiKey, lastPromptRef.current)
      if (!result.sheetSaved) {
        const sheet = await savePromptDirectToGoogleSheets({
          generationId: result.generationId,
          toolType: "nails_video",
          coreIdea: form.coreIdea,
          finalPrompt: result.prompt,
          model: result.model,
          duration: form.duration,
          nailStyle: form.nailStyle,
          nailShape: form.nailShape,
          nailColor: form.nailColor,
          revealStyle: form.revealStyle,
        })
        result.sheetSaved = sheet.saved
        result.sheetError = sheet.saved ? undefined : sheet.error ?? result.sheetError
      }
      setOutput(result.prompt)
      setGenerationId(result.generationId)
      setSheetStatus(result.sheetSaved ? "saved" : result.sheetError ? "failed" : "pending")
      onModelUsed?.(result.model)
      lastPromptRef.current = result.prompt
      if (result.sheetError && result.generationId && !result.generationId.startsWith("local_")) {
        addPendingRecord({
          generationId: result.generationId,
          toolType: "nails_video",
          formData: requestData,
          finalPrompt: result.prompt,
          modelUsed: result.model,
          fallbackUsed: result.fallbackUsed ?? false,
          syncToken: result.syncToken,
          createdAt: Date.now(),
        })
      }
      onPromptGenerated({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        toolType: "nails_video",
        category: "Nails Style Video",
        format: "video",
        coreIdea: form.coreIdea,
        prompt: result.prompt,
        model: result.model,
        videoRatio: "9:16",
        duration: form.duration,
        nailStyle: form.nailStyle,
        nailShape: form.nailShape,
        nailColor: form.nailColor,
        revealStyle: form.revealStyle,
        generationId: result.generationId,
        sheetSaved: result.sheetSaved,
        sheetError: result.sheetError,
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
        <Text fontWeight="bold" color="pink.200">Nails Style Video</Text>
        <Text textStyle="xs" color="gray.500" mt="1">9:16 girls nail style video prompts with curiosity hook and clean final reveal.</Text>
      </MotionBox>

      <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} p="4" borderRadius="2xl" css={{ background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderColor: "rgba(236,72,153,0.15)" }}>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
          <SelectField label="Duration" collection={durations} value={[form.duration]} onChange={([v]) => setField("duration", v ?? "8s")} accentColor="pink" />
          <SelectField label="Nail Style" collection={nailStyles} value={[form.nailStyle]} onChange={([v]) => setField("nailStyle", v ?? "Glossy chrome")} accentColor="pink" />
          <SelectField label="Nail Shape" collection={nailShapes} value={[form.nailShape]} onChange={([v]) => setField("nailShape", v ?? "Almond")} accentColor="pink" />
          <SelectField label="Color Palette" collection={nailColors} value={[form.nailColor]} onChange={([v]) => setField("nailColor", v ?? "Pearl pink")} accentColor="pink" />
          <SelectField label="Camera" collection={cameraMovements} value={[form.cameraMovement]} onChange={([v]) => setField("cameraMovement", v ?? "Macro push-in")} accentColor="pink" />
          <SelectField label="Lighting" collection={lightings} value={[form.lighting]} onChange={([v]) => setField("lighting", v ?? "Soft beauty lighting")} accentColor="pink" />
          <SelectField label="Reveal Style" collection={revealStyles} value={[form.revealStyle]} onChange={([v]) => setField("revealStyle", v ?? "wet_polish_drop")} accentColor="pink" />
        </Grid>
      </MotionBox>

      <MotionBox initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} p="4" borderRadius="2xl" css={{ background: "rgba(255,255,255,0.03)", borderWidth: "1px", borderColor: "rgba(236,72,153,0.15)" }}>
        <Text fontWeight="semibold" color="pink.300" mb="1.5" css={{ textTransform: "uppercase", fontSize: "0.63rem" }}>Nail Video Idea *</Text>
        <Textarea placeholder="e.g. pink chrome French tip nails with glitter reveal" value={form.coreIdea} onChange={(e) => setField("coreIdea", e.target.value)} rows={3} resize="none" css={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(236,72,153,0.3)", color: "white", _focus: { borderColor: "#ec4899", boxShadow: glowPink } }} />
      </MotionBox>

      <Button w="full" size="xl" loading={loading} loadingText="Groq is crafting your nails video prompt..." onClick={handleGenerate} disabled={!form.coreIdea.trim() || loading} css={{ background: "linear-gradient(135deg, #db2777 0%, #7c3aed 55%, #0891b2 100%)", color: "white", fontWeight: "bold", minH: "56px", boxShadow: !loading ? glowPink : "none" }}>
        {!loading && <HStack gap="2.5"><Icon fontSize="xl"><LuWandSparkles /></Icon><Text>Generate Nails Video Prompt</Text><Icon fontSize="xl"><LuSparkles /></Icon></HStack>}
      </Button>

      <PromptOutput output={output} loading={loading} error={error} copied={copied} onCopy={handleCopy} accentColor="pink" title="Nails Style Video Prompt" loadingText="Groq is crafting your nails video prompt..." tags={["9:16", form.duration, "Nails Style"]} sheetStatus={sheetStatus} generationId={generationId} />
    </VStack>
  )
}
