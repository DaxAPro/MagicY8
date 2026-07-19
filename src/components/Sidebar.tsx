"use client"

import {
  Box,
  Button,
  HStack,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react"
import { AnimatePresence, motion } from "framer-motion"
import { LuClock, LuTrash2 } from "react-icons/lu"
import type { HistoryEntry, ToolType } from "../types"

const MotionBox = motion.create(Box)

const glowPurple = "0 0 20px rgba(168,85,247,0.4)"

interface SidebarProps {
  history: HistoryEntry[]
  onSelectHistory: (entry: HistoryEntry) => void
  onClearHistory: () => void
}

function toolBadgeColor(toolType: ToolType): string {
  return toolType === "tattoo_video" ? "#fdba74" : "#ec4899"
}

function toolLabel(toolType: ToolType): string {
  return toolType === "tattoo_video" ? "Tattoo Video" : "Nails Style Video"
}

function HistoryTab({
  history,
  onSelectHistory,
  onClearHistory,
}: Pick<SidebarProps, "history" | "onSelectHistory" | "onClearHistory">) {
  if (history.length === 0) {
    return (
      <VStack gap="4" py="12" px="4" textAlign="center">
        <Icon color="gray.600" fontSize="3xl">
          <LuClock />
        </Icon>
        <Text color="gray.600" textStyle="sm" lineHeight="1.6">
          No history yet. Generate your first prompt to see it here.
        </Text>
      </VStack>
    )
  }

  return (
    <VStack gap="2" align="stretch">
      <HStack justify="space-between" mb="1">
        <Text
          textStyle="xs"
          color="gray.500"
          letterSpacing="widest"
          css={{ textTransform: "uppercase" }}
        >
          {history.length} saved
        </Text>
        <Button
          size="xs"
          variant="ghost"
          onClick={onClearHistory}
          css={{
            color: "rgba(239,68,68,0.7)",
            _hover: {
              color: "#ef4444",
              background: "rgba(239,68,68,0.1)",
            },
          }}
        >
          <Icon fontSize="xs"><LuTrash2 /></Icon>
          Clear all
        </Button>
      </HStack>
      <AnimatePresence>
        {history.map((entry, i) => (
          <MotionBox
            key={entry.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            // @ts-expect-error framer-motion types
            transition={{ delay: i * 0.04 }}
          >
            <Box
              p="3"
              borderRadius="lg"
              cursor="pointer"
              onClick={() => onSelectHistory(entry)}
              css={{
                background: "rgba(255,255,255,0.03)",
                borderWidth: "1px",
                borderColor: "rgba(255,255,255,0.07)",
                transition: "all 0.2s",
                _hover: {
                  background: "rgba(168,85,247,0.1)",
                  borderColor: "rgba(168,85,247,0.3)",
                  boxShadow: glowPurple,
                },
              }}
            >
              <HStack gap="2" mb="1">
                <Box
                  px="1.5"
                  py="0.5"
                  borderRadius="sm"
                  css={{
                    background:
                      entry.toolType === "tattoo_video"
                        ? "rgba(249,115,22,0.12)"
                        : "rgba(168,85,247,0.12)",
                    borderWidth: "1px",
                    borderColor:
                      entry.toolType === "tattoo_video"
                        ? "rgba(249,115,22,0.25)"
                        : "rgba(168,85,247,0.25)",
                    fontSize: "0.55rem",
                    color: toolBadgeColor(entry.toolType),
                    fontWeight: "semibold",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {toolLabel(entry.toolType)}
                </Box>
                <Text
                  textStyle="xs"
                  color="gray.500"
                  css={{ fontSize: "0.6rem" }}
                >
                  {new Date(entry.timestamp).toLocaleDateString()}
                </Text>
              </HStack>
              <Text
                textStyle="sm"
                color="gray.300"
                lineHeight="1.4"
                css={{
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: "2",
                  WebkitBoxOrient: "vertical",
                }}
              >
                {entry.coreIdea}
              </Text>
              {entry.videoRatio && (
                <Text textStyle="xs" color="purple.400" mt="1.5">
                  {entry.videoRatio}
                  {entry.duration ? ` · ${entry.duration}` : ""}
                </Text>
              )}
            </Box>
          </MotionBox>
        ))}
      </AnimatePresence>
    </VStack>
  )
}

export function Sidebar({
  history,
  onSelectHistory,
  onClearHistory,
}: SidebarProps) {
  return (
    <Box
      h="100%"
      css={{
        background: "rgba(255,255,255,0.02)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Sidebar Header */}
      <Box
        px="4"
        py="5"
        css={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background:
            "linear-gradient(180deg, rgba(168,85,247,0.08) 0%, transparent 100%)",
        }}
      >
        <Text
          fontWeight="black"
          letterSpacing="widest"
          css={{
            fontSize: "0.65rem",
            textTransform: "uppercase",
            background: "linear-gradient(90deg, #c084fc, #818cf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          MagicY8 Studio
        </Text>
      </Box>

      {/* History */}
      <Box flex="1" overflow="auto" p="3" h="calc(100% - 80px)">
        <HistoryTab
          history={history}
          onSelectHistory={onSelectHistory}
          onClearHistory={onClearHistory}
        />
      </Box>
    </Box>
  )
}
