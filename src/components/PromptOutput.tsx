"use client"

import { Box, Button, HStack, Icon, IconButton, Spinner, Text, VStack } from "@chakra-ui/react"
import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useState } from "react"
import { LuCheck, LuClipboardCopy, LuRefreshCw, LuTriangleAlert, LuZap } from "react-icons/lu"
import { retrySingleRecord } from "../services/sheetRetryQueue"
import type { SheetStatus } from "../types"

const MotionBox = motion.create(Box)

type AccentColor = "purple" | "blue" | "cyan" | "orange"

const ACCENT: Record<
  AccentColor,
  { glow: string; border: string; text: string; hover: string; icon: string }
> = {
  purple: {
    glow: "0 0 20px rgba(168,85,247,0.4)",
    border: "rgba(168,85,247,0.3)",
    text: "purple.300",
    hover: "rgba(168,85,247,0.12)",
    icon: "purple.400",
  },
  cyan: {
    glow: "0 0 30px rgba(6,182,212,0.5)",
    border: "rgba(6,182,212,0.3)",
    text: "cyan.300",
    hover: "rgba(6,182,212,0.12)",
    icon: "cyan.400",
  },
  orange: {
    glow: "0 0 30px rgba(249,115,22,0.5)",
    border: "rgba(249,115,22,0.3)",
    text: "orange.300",
    hover: "rgba(249,115,22,0.12)",
    icon: "orange.400",
  },
  blue: {
    glow: "0 0 20px rgba(59,130,246,0.4)",
    border: "rgba(59,130,246,0.3)",
    text: "blue.300",
    hover: "rgba(59,130,246,0.12)",
    icon: "blue.400",
  },
}

interface PromptOutputProps {
  output: string
  loading: boolean
  error: string
  copied: boolean
  onCopy: () => void
  accentColor: AccentColor
  title: string
  loadingText: string
  tags: string[]
  sheetStatus?: SheetStatus
  generationId?: string
}

export function PromptOutput({
  output,
  loading,
  error,
  copied,
  onCopy,
  accentColor,
  title,
  loadingText,
  tags,
  sheetStatus,
  generationId,
}: PromptOutputProps) {
  const a = ACCENT[accentColor]
  const [retrying, setRetrying] = useState(false)
  const [localSheetStatus, setLocalSheetStatus] = useState<SheetStatus | undefined>(sheetStatus)

  const effectiveStatus = localSheetStatus ?? sheetStatus

  const handleRetrySheet = useCallback(async () => {
    if (!generationId || retrying) return
    setRetrying(true)
    try {
      const success = await retrySingleRecord(generationId)
      if (success) {
        setLocalSheetStatus("saved")
      }
    } finally {
      setRetrying(false)
    }
  }, [generationId, retrying])

  return (
    <>
      {/* Error display */}
      <AnimatePresence>
        {error && (
          <MotionBox
            key="error"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            // @ts-expect-error framer-motion types
            transition={{ duration: 0.2 }}
            p="4"
            borderRadius="xl"
            css={{
              background: "rgba(239,68,68,0.08)",
              borderWidth: "1px",
              borderColor: "rgba(239,68,68,0.35)",
            }}
          >
            <HStack gap="2.5" align="flex-start">
              <Icon color="red.400" fontSize="md" flexShrink={0} mt="0.5">
                <LuTriangleAlert />
              </Icon>
              <VStack gap="0.5" align="stretch">
                <Text color="red.300" textStyle="sm" fontWeight="semibold">
                  Generation Failed
                </Text>
                <Text color="red.400" textStyle="xs" lineHeight="1.6">
                  {error}
                </Text>
              </VStack>
            </HStack>
          </MotionBox>
        )}
      </AnimatePresence>

      {/* Output Panel */}
      <AnimatePresence>
        {(output || loading) && (
          <MotionBox
            key="output"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            // @ts-expect-error framer-motion types
            transition={{ duration: 0.5 }}
            p="5"
            borderRadius="2xl"
            css={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(16px)",
              borderWidth: "1px",
              borderColor: output ? a.border : "rgba(168,85,247,0.2)",
              boxShadow: output
                ? `0 8px 32px rgba(0,0,0,0.5), ${a.glow}`
                : "0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            <HStack justify="space-between" mb="4">
              <HStack gap="2">
                <motion.div
                  animate={output ? { rotate: [0, 360] } : {}}
                  // @ts-expect-error framer-motion types
                  transition={{ duration: 0.7 }}
                >
                  <Icon color={a.icon} fontSize="lg"><LuZap /></Icon>
                </motion.div>
                <Text
                  fontWeight="bold"
                  color={a.text}
                  letterSpacing="widest"
                  css={{ textTransform: "uppercase", fontSize: "0.63rem" }}
                >
                  {title}
                </Text>
              </HStack>
              {output && (
                <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label="Copy prompt"
                    onClick={onCopy}
                    css={{
                      color: copied ? "#34d399" : a.text,
                      borderRadius: "lg",
                      _hover: { background: a.hover, boxShadow: a.glow },
                    }}
                  >
                    {copied ? <LuCheck /> : <LuClipboardCopy />}
                  </IconButton>
                </motion.div>
              )}
            </HStack>

            {loading && !output ? (
              <VStack gap="3" py="8">
                <HStack gap="2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      // @ts-expect-error framer-motion types
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        delay: i * 0.12,
                        ease: "easeInOut",
                      }}
                    >
                      <Box
                        w="8px"
                        h="8px"
                        borderRadius="full"
                        css={{ background: `hsl(${250 + i * 20}, 80%, 65%)` }}
                      />
                    </motion.div>
                  ))}
                </HStack>
                <Text color="gray.500" textStyle="sm">
                  {loadingText}
                </Text>
              </VStack>
            ) : (
              output && (
                <AnimatePresence>
                  <MotionBox
                    key={output.slice(0, 20)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    // @ts-expect-error framer-motion types
                    transition={{ duration: 0.5 }}
                  >
                    <Text
                      color="gray.100"
                      fontSize="sm"
                      lineHeight="1.9"
                      whiteSpace="pre-wrap"
                      css={{
                        background: "rgba(0,0,0,0.25)",
                        padding: "1.25rem",
                        borderRadius: "0.875rem",
                        borderLeft: `3px solid ${a.border}`,
                      }}
                    >
                      {output}
                    </Text>

                    <HStack mt="4" gap="2" flexWrap="wrap">
                      {tags.map((tag) => (
                        <Box
                          key={tag}
                          px="2.5"
                          py="1"
                          borderRadius="full"
                          css={{
                            background: a.hover,
                            borderWidth: "1px",
                            borderColor: a.border,
                            fontSize: "0.6rem",
                            color: a.text,
                            fontWeight: "semibold",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                          }}
                        >
                          {tag}
                        </Box>
                      ))}
                    </HStack>

                    {/* Google Sheets save status */}
                    {effectiveStatus && (
                      <Box
                        mt="3"
                        p="2.5"
                        borderRadius="lg"
                        css={{
                          background:
                            effectiveStatus === "saved"
                              ? "rgba(34,197,94,0.06)"
                              : effectiveStatus === "pending"
                                ? "rgba(245,158,11,0.06)"
                                : "rgba(239,68,68,0.06)",
                          borderWidth: "1px",
                          borderColor:
                            effectiveStatus === "saved"
                              ? "rgba(34,197,94,0.2)"
                              : effectiveStatus === "pending"
                                ? "rgba(245,158,11,0.2)"
                                : "rgba(239,68,68,0.2)",
                        }}
                      >
                        <HStack gap="2" justify="space-between">
                          <HStack gap="2">
                            <Icon
                              color={
                                effectiveStatus === "saved"
                                  ? "green.400"
                                  : effectiveStatus === "pending"
                                    ? "yellow.400"
                                    : "red.400"
                              }
                              fontSize="sm"
                            >
                              {effectiveStatus === "saved" ? (
                                <LuCheck />
                              ) : effectiveStatus === "pending" ? (
                                <LuRefreshCw />
                              ) : (
                                <LuTriangleAlert />
                              )}
                            </Icon>
                            <Text
                              textStyle="xs"
                              fontWeight="medium"
                              color={
                                effectiveStatus === "saved"
                                  ? "green.300"
                                  : effectiveStatus === "pending"
                                    ? "yellow.300"
                                    : "red.300"
                              }
                            >
                              {effectiveStatus === "saved"
                                ? "Saved to Google Sheets"
                                : effectiveStatus === "pending"
                                  ? "Sheet sync pending"
                                  : "Google Sheets sync failed"}
                            </Text>
                          </HStack>
                          {effectiveStatus === "failed" && generationId && (
                            <Button
                              size="2xs"
                              variant="ghost"
                              onClick={handleRetrySheet}
                              disabled={retrying}
                              css={{
                                color: "red.300",
                                _hover: { background: "rgba(239,68,68,0.1)" },
                                fontSize: "0.65rem",
                              }}
                            >
                              <HStack gap="1">
                                {retrying ? (
                                  <Spinner size="2xs" />
                                ) : (
                                  <Icon fontSize="xs"><LuRefreshCw /></Icon>
                                )}
                                <Text>Retry</Text>
                              </HStack>
                            </Button>
                          )}
                        </HStack>
                      </Box>
                    )}

                    <motion.div
                      style={{ marginTop: "1rem" }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Button
                        w="full"
                        size="md"
                        onClick={onCopy}
                        variant="outline"
                        css={{
                          borderColor: copied
                            ? "rgba(34,197,94,0.5)"
                            : a.border,
                          color: copied ? "green.400" : a.text,
                          background: copied
                            ? "rgba(34,197,94,0.07)"
                            : a.hover,
                          borderRadius: "xl",
                          fontWeight: "semibold",
                          _hover: { background: a.hover, boxShadow: a.glow },
                        }}
                      >
                        <HStack gap="2">
                          <Icon fontSize="md">
                            {copied ? <LuCheck /> : <LuClipboardCopy />}
                          </Icon>
                          <Text>
                            {copied ? "Copied to clipboard!" : "Copy Prompt to Clipboard"}
                          </Text>
                        </HStack>
                      </Button>
                    </motion.div>
                  </MotionBox>
                </AnimatePresence>
              )
            )}
          </MotionBox>
        )}
      </AnimatePresence>
    </>
  )
}
