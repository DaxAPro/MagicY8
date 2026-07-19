"use client"

import {
  Box,
  Button,
  HStack,
  Icon,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useEffect, useRef, useState } from "react"
import {
  LuCheck,
  LuEye,
  LuEyeOff,
  LuKey,
  LuKeyRound,
  LuPlug,
  LuShieldCheck,
  LuTrash2,
  LuTriangleAlert,
  LuX,
} from "react-icons/lu"
import { GeminiError, testGeminiConnection } from "../services/geminiApi"
import {
  getApiKey,
  maskApiKey,
  removeApiKey,
  saveApiKey,
  validateKeyFormat,
} from "../services/apiKeyStorage"
import {
  getGoogleSheetConfig,
  getGoogleSheetWebhookUrlDraft,
  maskSecret,
  removeGoogleSheetConfig,
  saveGoogleSheetConfig,
} from "../services/googleSheetConfig"
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"

const glowPurple = "0 0 20px rgba(168,85,247,0.4)"

type ConnState = "not_configured" | "key_saved" | "testing" | "connected" | "setup_missing" | "invalid_key" | "rate_limited" | "model_unavailable" | "connection_failed"

interface ApiStatusModalProps {
  trigger: React.ReactNode
  generating?: boolean
  lastUsedModel?: string
  forceOpenSignal?: number
  onKeyChange?: (hasKey: boolean) => void
}

const STATUS_CONFIG: Record<ConnState, { label: string; color: string; bg: string; glow: string }> = {
  not_configured: { label: "Not configured", color: "#a1a1aa", bg: "rgba(161,161,170,0.1)", glow: "0 0 6px rgba(161,161,170,0.5)" },
  key_saved: { label: "API key saved", color: "#60a5fa", bg: "rgba(96,165,250,0.1)", glow: "0 0 6px rgba(96,165,250,0.8)" },
  testing: { label: "Testing", color: "#a855f7", bg: "rgba(168,85,247,0.1)", glow: "0 0 6px rgba(168,85,247,0.9)" },
  connected: { label: "Connected", color: "#22c55e", bg: "rgba(34,197,94,0.1)", glow: "0 0 6px rgba(34,197,94,0.9)" },
  setup_missing: { label: "App setup missing", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", glow: "0 0 6px rgba(245,158,11,0.9)" },
  invalid_key: { label: "Invalid key", color: "#ef4444", bg: "rgba(239,68,68,0.1)", glow: "0 0 6px rgba(239,68,68,0.9)" },
  rate_limited: { label: "Rate limited", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", glow: "0 0 6px rgba(245,158,11,0.9)" },
  model_unavailable: { label: "Model unavailable", color: "#f97316", bg: "rgba(249,115,22,0.1)", glow: "0 0 6px rgba(249,115,22,0.9)" },
  connection_failed: { label: "Connection failed", color: "#ef4444", bg: "rgba(239,68,68,0.1)", glow: "0 0 6px rgba(239,68,68,0.9)" },
}

export function ApiStatusModal({ trigger, generating, lastUsedModel, forceOpenSignal, onKeyChange }: ApiStatusModalProps) {
  const [open, setOpen] = useState(false)
  const [connState, setConnState] = useState<ConnState>("not_configured")
  const [showKey, setShowKey] = useState(false)
  const [keyInput, setKeyInput] = useState("")
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [sheetUrlInput, setSheetUrlInput] = useState(getGoogleSheetWebhookUrlDraft)
  const [sheetSecretInput, setSheetSecretInput] = useState("")
  const [savedSheetConfig, setSavedSheetConfig] = useState<ReturnType<typeof getGoogleSheetConfig>>(null)
  const [editingSheetConfig, setEditingSheetConfig] = useState(false)
  const [sheetMessage, setSheetMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load saved key on mount
  useEffect(() => {
    const k = getApiKey()
    requestAnimationFrame(() => {
      setSavedKey(k)
      if (k) setConnState("key_saved")
      const sheetConfig = getGoogleSheetConfig()
      setSavedSheetConfig(sheetConfig)
      setSheetUrlInput(sheetConfig?.webhookUrl ?? getGoogleSheetWebhookUrlDraft())
    })
  }, [])

  // Handle force-open signal (when user clicks Generate without a key)
  useEffect(() => {
    if (forceOpenSignal && forceOpenSignal > 0) {
      requestAnimationFrame(() => setOpen(true))
    }
  }, [forceOpenSignal])

  // Focus input when modal opens without a saved key
  useEffect(() => {
    if (open && !savedKey) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, savedKey])

  const notifyKeyChange = (hasKey: boolean) => {
    onKeyChange?.(hasKey)
  }

  const handleSave = () => {
    const err = validateKeyFormat(keyInput.trim())
    if (err) {
      setValidationError(err)
      return
    }
    setValidationError(null)
    saveApiKey(keyInput.trim())
    setSavedKey(keyInput.trim())
    setConnState("key_saved")
    setKeyInput("")
    setShowKey(false)
    setTestMessage(null)
    notifyKeyChange(true)
  }

  const handleRemove = () => {
    removeApiKey()
    setSavedKey(null)
    setConnState("not_configured")
    setKeyInput("")
    setValidationError(null)
    setTestMessage(null)
    notifyKeyChange(false)
  }

  const handleSaveSheet = () => {
    const webhookUrl = sheetUrlInput.trim()
    const webhookSecret = sheetSecretInput.trim()
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/(?:exec|dev)$/i.test(webhookUrl)) {
      setSheetMessage("Paste the Google Apps Script Web App /exec or /dev URL.")
      return
    }
    if (webhookSecret.length < 16) {
      setSheetMessage("Use a Sheet secret with at least 16 characters.")
      return
    }
    saveGoogleSheetConfig({ webhookUrl, webhookSecret })
    setSavedSheetConfig({ webhookUrl, webhookSecret })
    setEditingSheetConfig(false)
    setSheetUrlInput(webhookUrl)
    setSheetSecretInput("")
    setSheetMessage("Google Sheet sync saved permanently in this browser.")
  }

  const handleChangeSheet = () => {
    setEditingSheetConfig(true)
    setSheetUrlInput(savedSheetConfig?.webhookUrl ?? getGoogleSheetWebhookUrlDraft())
    setSheetSecretInput("")
    setSheetMessage("Edit the URL or secret, then click Save Sheet Sync.")
  }

  const handleRemoveSheet = () => {
    removeGoogleSheetConfig()
    setSavedSheetConfig(null)
    setEditingSheetConfig(false)
    setSheetUrlInput(getGoogleSheetWebhookUrlDraft())
    setSheetSecretInput("")
    setSheetMessage("Google Sheet sync removed.")
  }

  const handleTest = async () => {
    const keyToTest = savedKey ?? keyInput.trim()
    if (!keyToTest) {
      setValidationError("Add your Groq API key to generate prompts.")
      return
    }
    const fmtErr = validateKeyFormat(keyToTest)
    if (fmtErr) {
      setValidationError(fmtErr)
      return
    }
    if (!savedKey) {
      saveApiKey(keyToTest)
      setSavedKey(keyToTest)
      setKeyInput("")
      notifyKeyChange(true)
      setConnState("key_saved")
    }
    setValidationError(null)
    setConnState("testing")
    setTestMessage(null)
    try {
      const result = await testGeminiConnection(keyToTest)
      if (result.ok) {
        setConnState("connected")
        setTestMessage("Connection successful! Groq is ready.")
      } else {
        setConnState("connection_failed")
        setTestMessage("Connection failed. Check your API key.")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed."
      if (err instanceof GeminiError && err.code === "configuration") {
        setConnState("setup_missing")
        setTestMessage("API key saved. Direct Groq mode is ready. Google Sheets live sync needs a secure server connector.")
      } else if (msg.includes("invalid") || msg.includes("revoked") || msg.includes("401") || err && typeof err === 'object' && 'code' in err && (err as {code?: string}).code === "invalid_key") {
        setConnState("invalid_key")
      } else if (msg.includes("rate limit") || msg.includes("429") || err && typeof err === 'object' && 'code' in err && (err as {code?: string}).code === "rate_limit") {
        setConnState("rate_limited")
      } else if (msg.includes("unavailable") || msg.includes("503") || err && typeof err === 'object' && 'code' in err && (err as {code?: string}).code === "model_unavailable") {
        setConnState("model_unavailable")
      } else if (msg.includes("timed out") || err && typeof err === 'object' && 'code' in err && (err as {code?: string}).code === "timeout") {
        setConnState("connection_failed")
        setTestMessage("The AI request timed out.")
      } else {
        setConnState("connection_failed")
      }
      if (!(err instanceof GeminiError && err.code === "configuration")) setTestMessage(msg)
    }
  }

  const statusCfg = STATUS_CONFIG[connState]
  const hasKey = savedKey !== null

  return (
    <DialogRoot size="md" open={open} onOpenChange={(e) => setOpen(e.open)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent
        css={{
          background: "linear-gradient(135deg, #0c0a1a 0%, #080b14 100%)",
          borderWidth: "1px",
          borderColor: "rgba(168,85,247,0.3)",
          boxShadow: `0 24px 80px rgba(0,0,0,0.8), ${glowPurple}`,
          backdropFilter: "blur(40px)",
        }}
      >
        <DialogHeader pb="2">
          <HStack gap="3">
            <Box
              p="2"
              borderRadius="xl"
              css={{
                background: "rgba(168,85,247,0.12)",
                borderWidth: "1px",
                borderColor: "rgba(168,85,247,0.25)",
              }}
            >
              <Icon color="purple.400" fontSize="xl"><LuKey /></Icon>
            </Box>
            <Box>
              <DialogTitle
                css={{
                  background: "linear-gradient(90deg, #c084fc, #818cf8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                }}
              >
                API Settings
              </DialogTitle>
              <Text textStyle="xs" color="gray.600" mt="0.5">
                Provider: Groq — Bring Your Own API Key
              </Text>
            </Box>
          </HStack>
        </DialogHeader>

        <DialogCloseTrigger
          css={{
            color: "gray.500",
            _hover: { color: "white", background: "rgba(255,255,255,0.08)" },
          }}
        >
          <LuX />
        </DialogCloseTrigger>

        <DialogBody py="4">
          <VStack gap="4" align="stretch">
            {/* Connection status badge */}
            <HStack gap="2" align="center">
              <Box
                w="8px" h="8px" borderRadius="full" flexShrink={0}
                css={{ background: statusCfg.color, boxShadow: statusCfg.glow }}
              />
              <Text textStyle="sm" fontWeight="semibold" color="purple.200">
                {statusCfg.label}
              </Text>
              {connState === "testing" && <Spinner size="xs" color="purple.400" />}
            </HStack>

            {/* Test result message */}
            {testMessage && (
              <Box
                p="2.5" borderRadius="lg"
                css={{
                  background: connState === "connected" ? "rgba(34,197,94,0.06)" : connState === "setup_missing" ? "rgba(245,158,11,0.06)" : "rgba(239,68,68,0.06)",
                  borderWidth: "1px",
                  borderColor: connState === "connected" ? "rgba(34,197,94,0.2)" : connState === "setup_missing" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.2)",
                }}
              >
                <HStack gap="2">
                  <Icon
                    color={connState === "connected" ? "green.400" : connState === "setup_missing" ? "yellow.400" : "red.400"}
                    fontSize="sm"
                  >
                    {connState === "connected" ? <LuCheck /> : <LuTriangleAlert />}
                  </Icon>
                  <Text textStyle="xs" color={connState === "connected" ? "green.300" : connState === "setup_missing" ? "yellow.300" : "red.300"}>
                    {testMessage}
                  </Text>
                </HStack>
              </Box>
            )}

            {/* Saved key display or input */}
            {hasKey ? (
              <Box
                p="3" borderRadius="lg"
                css={{
                  background: "rgba(255,255,255,0.03)",
                  borderWidth: "1px",
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text textStyle="xs" color="gray.600" mb="1" letterSpacing="widest"
                  css={{ textTransform: "uppercase", fontSize: "0.6rem" }}
                >
                  Saved API Key (this browser tab)
                </Text>
                <HStack gap="2">
                  <Icon color="green.400" fontSize="sm"><LuKeyRound /></Icon>
                  <Text textStyle="sm" color="gray.300" fontFamily="mono">
                    {maskApiKey(savedKey!)}
                  </Text>
                </HStack>
              </Box>
            ) : (
              <VStack gap="2" align="stretch">
                <Text textStyle="xs" color="gray.500" fontWeight="medium">
                  Groq API Key
                </Text>
                <HStack gap="2">
                  <Input
                    ref={inputRef}
                    type={showKey ? "text" : "password"}
                    placeholder="gsk_..."
                    value={keyInput}
                    onChange={(e) => {
                      setKeyInput(e.target.value)
                      setValidationError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave()
                    }}
                    css={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(168,85,247,0.2)",
                      color: "gray.200",
                      fontFamily: "mono",
                      _placeholder: { color: "gray.700" },
                      _focus: { borderColor: "rgba(168,85,247,0.5)" },
                    }}
                  />
                  <Button
                    size="sm" variant="ghost" flexShrink={0}
                    aria-label={showKey ? "Hide API key" : "Show API key"}
                    onClick={() => setShowKey(!showKey)}
                    css={{
                      color: "gray.500",
                      borderRadius: "lg",
                      borderWidth: "1px",
                      borderColor: "rgba(255,255,255,0.08)",
                      _hover: { background: "rgba(168,85,247,0.1)", color: "purple.300" },
                    }}
                  >
                    <Icon fontSize="sm">{showKey ? <LuEyeOff /> : <LuEye />}</Icon>
                  </Button>
                </HStack>
                {validationError && (
                  <Text textStyle="xs" color="red.400">
                    {validationError}
                  </Text>
                )}
                {!validationError && (
                  <Text textStyle="xs" color="gray.600">
                    Add your Groq API key to generate prompts.
                  </Text>
                )}
              </VStack>
            )}

            {/* Model info */}
            {lastUsedModel && (
              <Box
                p="3" borderRadius="lg"
                css={{
                  background: "rgba(255,255,255,0.03)",
                  borderWidth: "1px",
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text textStyle="xs" color="gray.600" mb="1" letterSpacing="widest"
                  css={{ textTransform: "uppercase", fontSize: "0.6rem" }}
                >
                  Model Used (Last Generation)
                </Text>
                <Text textStyle="sm" color="gray.300" fontFamily="mono">
                  {lastUsedModel}
                </Text>
              </Box>
            )}

            {/* Google Sheet sync */}
            <Box
              p="3" borderRadius="lg"
              css={{
                background: "rgba(34,197,94,0.05)",
                borderWidth: "1px",
                borderColor: "rgba(34,197,94,0.18)",
              }}
            >
              <HStack justify="space-between" gap="3" mb="2">
                <Box>
                  <Text textStyle="xs" fontWeight="semibold" color="green.300">
                    Google Sheet Sync
                  </Text>
                  <Text textStyle="xs" color="gray.600">
                    Saved in this browser until you remove or change it.
                  </Text>
                </Box>
                {savedSheetConfig && !editingSheetConfig && (
                  <HStack gap="1">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={handleChangeSheet}
                      css={{ color: "green.200", _hover: { background: "rgba(34,197,94,0.1)" } }}
                    >
                      Change
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={handleRemoveSheet}
                      css={{ color: "red.300", _hover: { background: "rgba(239,68,68,0.1)" } }}
                    >
                      Remove
                    </Button>
                  </HStack>
                )}
              </HStack>
              {savedSheetConfig && !editingSheetConfig ? (
                <VStack gap="1" align="stretch">
                  <Text textStyle="xs" color="gray.500" fontFamily="mono" css={{ wordBreak: "break-all" }}>
                    URL saved: {savedSheetConfig.webhookUrl}
                  </Text>
                  <Text textStyle="xs" color="gray.500" fontFamily="mono">
                    Secret: {maskSecret(savedSheetConfig.webhookSecret)}
                  </Text>
                </VStack>
              ) : (
                <VStack gap="2" align="stretch">
                  <Input
                    placeholder="https://script.google.com/macros/s/.../exec or /dev"
                    value={sheetUrlInput}
                    onChange={(e) => setSheetUrlInput(e.target.value)}
                    css={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(34,197,94,0.2)", color: "gray.200", fontSize: "0.78rem" }}
                  />
                  <Input
                    type="password"
                    placeholder="MAGICY8_WEBHOOK_SECRET"
                    value={sheetSecretInput}
                    onChange={(e) => setSheetSecretInput(e.target.value)}
                    css={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(34,197,94,0.2)", color: "gray.200", fontSize: "0.78rem" }}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveSheet}
                    css={{ background: "rgba(34,197,94,0.16)", color: "green.200", borderRadius: "lg", _hover: { background: "rgba(34,197,94,0.22)" } }}
                  >
                    Save Sheet Sync
                  </Button>
                </VStack>
              )}
              {sheetMessage && (
                <Text textStyle="xs" color={savedSheetConfig ? "green.300" : "yellow.300"} mt="2">
                  {sheetMessage}
                </Text>
              )}
            </Box>

            {/* Security notice */}
            <Box
              p="3" borderRadius="lg"
              css={{
                background: "rgba(59,130,246,0.06)",
                borderWidth: "1px",
                borderColor: "rgba(59,130,246,0.2)",
              }}
            >
              <HStack gap="2" mb="1">
                <Icon color="blue.400" fontSize="sm"><LuShieldCheck /></Icon>
                <Text textStyle="xs" fontWeight="semibold" color="blue.300">
                  Browser-Only Storage
                </Text>
              </HStack>
              <Text textStyle="xs" color="gray.500" lineHeight="1.6">
                Your API key is stored only in this browser tab. It clears when the tab is closed. Do not use this
                feature on a shared or public device.
              </Text>
            </Box>
          </VStack>
        </DialogBody>

        <DialogFooter gap="2" pt="2" flexWrap="wrap">
          {/* Remove / Forget key button */}
          {hasKey && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              css={{
                color: "red.400",
                _hover: { background: "rgba(239,68,68,0.1)" },
              }}
            >
              <HStack gap="1.5">
                <Icon fontSize="sm"><LuTrash2 /></Icon>
                <Text>Forget API Key</Text>
              </HStack>
            </Button>
          )}

          <DialogActionTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              css={{
                color: "gray.500",
                _hover: { background: "rgba(255,255,255,0.06)" },
              }}
            >
              Close
            </Button>
          </DialogActionTrigger>

          {/* Test Connection button */}
          <Button
            size="sm"
            onClick={handleTest}
            disabled={connState === "testing" || generating}
            variant="outline"
            css={{
              color: "purple.300",
              borderColor: "rgba(168,85,247,0.3)",
              borderRadius: "lg",
              _hover: { background: "rgba(168,85,247,0.08)" },
              _disabled: { opacity: 0.5, cursor: "not-allowed" },
            }}
          >
            <HStack gap="1.5">
              {connState === "testing" ? <Spinner size="xs" /> : <Icon fontSize="sm"><LuPlug /></Icon>}
              <Text>Test Connection</Text>
            </HStack>
          </Button>

          {/* Save button (only when no key is saved) */}
          {!hasKey && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!keyInput.trim() || generating}
              css={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: "white",
                fontWeight: "semibold",
                borderRadius: "lg",
                border: "1px solid rgba(168,85,247,0.4)",
                _hover: { background: "linear-gradient(135deg, #6d28d9, #4338ca)" },
                _disabled: { opacity: 0.5, cursor: "not-allowed" },
              }}
            >
              <HStack gap="1.5">
                <Icon fontSize="sm"><LuKeyRound /></Icon>
                <Text>Save API Key</Text>
              </HStack>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
