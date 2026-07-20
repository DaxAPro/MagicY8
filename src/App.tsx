"use client"

import {
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Tabs,
  Text,
} from "@chakra-ui/react"
import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useState } from "react"
import {
  LuMenu,
  LuPenTool,
  LuSettings,
  LuSparkles,
  LuWandSparkles,
  LuX,
} from "react-icons/lu"
import { ApiStatusModal } from "./components/ApiStatusModal"
import { NailsVideoGenerator } from "./components/NailsVideoGenerator"
import { Sidebar } from "./components/Sidebar"
import { TattooVideoGenerator } from "./components/TattooVideoGenerator"
import { TrendingPanel } from "./components/TrendingPanel"
import { autoRetryPendingSaves, setupConnectivityRetry } from "./services/sheetRetryQueue"
import type {
  HistoryEntry,
  NailsVideoFormState,
  TattooVideoFormState,
  ToolType,
} from "./types"

const MotionBox = motion.create(Box)

const STORAGE_KEY_HISTORY = "magy8_history"

type ActiveTool = "nails_video" | "tattoo_video"

interface InitialState {
  tool: ActiveTool
  nailsForm?: Partial<NailsVideoFormState>
  tattooForm?: Partial<TattooVideoFormState>
}

function useLocalStorage<T>(key: string, initial: T): [T, (val: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : initial
    } catch {
      return initial
    }
  })

  const set = useCallback(
    (val: T) => {
      setValue(val)
      localStorage.setItem(key, JSON.stringify(val))
    },
    [key],
  )

  return [value, set]
}

function migrateHistory(entries: HistoryEntry[]): HistoryEntry[] {
  return entries.filter((entry) => entry.format !== "image").map((entry) => {
    if (entry.toolType) return entry
    // Migrate old entries into current nails/tattoo video tools.
    let toolType: ToolType = "nails_video"
    if (entry.category === "Tattoo Video") toolType = "tattoo_video"
    return { ...entry, toolType }
  })
}

export default function App() {
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(
    STORAGE_KEY_HISTORY,
    [],
  )
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [trendingOpen, setTrendingOpen] = useState(true)
  const [activeTool, setActiveTool] = useState<ActiveTool>("nails_video")
  const [initialState, setInitialState] = useState<InitialState | undefined>()
  const [generating, setGenerating] = useState(false)
  const [lastUsedModel, setLastUsedModel] = useState<string | undefined>()
  const [apiKeySignal, setApiKeySignal] = useState(0)

  // Remove old image entries and migrate legacy video history once on mount
  useEffect(() => {
    const migrated = migrateHistory(history)
    if (migrated.length !== history.length || history.some((entry) => !entry.toolType)) {
      setHistory(migrated)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-retry pending sheet saves on mount and when connectivity returns
  useEffect(() => {
    autoRetryPendingSaves()
    const cleanup = setupConnectivityRetry()
    return cleanup
  }, [])

  const handlePromptGenerated = useCallback(
    (entry: HistoryEntry) => {
      setHistory([entry, ...history].slice(0, 50))
    },
    [history, setHistory],
  )

  const handleSelectHistory = useCallback((entry: HistoryEntry) => {
    if (entry.toolType === "tattoo_video") {
      setInitialState({
        tool: "tattoo_video",
        tattooForm: {
          coreIdea: entry.coreIdea,
          bodyPart: entry.bodyPart,
          tattooStyle: entry.tattooStyle,
          inkStyle: entry.inkStyle,
          aspectRatio: "9:16",
          subjectGender: entry.subjectGender,
          revealStyle: entry.revealStyle,
          colorMode: entry.colorMode,
        },
      })
    } else {
      setInitialState({
        tool: "nails_video",
        nailsForm: {
          coreIdea: entry.coreIdea,
          duration: entry.duration,
          nailStyle: entry.nailStyle,
          nailShape: entry.nailShape,
          nailColor: entry.nailColor,
          revealStyle: entry.revealStyle,
          colorMode: entry.colorMode,
        },
      })
    }
  }, [])

  const handleClearHistory = useCallback(() => {
    setHistory([])
  }, [setHistory])

  const handleSelectTrending = useCallback((topic: string) => {
    setInitialState((prev) => ({
      ...prev,
      tool: prev?.tool ?? "nails_video",
      nailsForm: { ...(prev?.nailsForm ?? {}), coreIdea: topic },
      tattooForm: { ...(prev?.tattooForm ?? {}), coreIdea: topic },
    }))
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)")
    if (mq.matches) {
      setSidebarOpen(false)
      setTrendingOpen(false)
    }
  }, [])

  // Sync active tool when initialState changes
  useEffect(() => {
    if (initialState?.tool) {
      setActiveTool(initialState.tool)
    }
  }, [initialState])

  const toolType: ToolType = activeTool

  return (
    <Box
      minH="100dvh"
      position="relative"
      css={{
        background:
          "linear-gradient(135deg, #030712 0%, #080b14 50%, #020b18 100%)",
      }}
    >
      {/* Ambient orbs */}
      <Box
        position="fixed"
        top="-20%"
        left="5%"
        w="500px"
        h="500px"
        borderRadius="full"
        opacity={0.1}
        pointerEvents="none"
        zIndex={0}
        css={{
          background: "radial-gradient(circle, #a855f7 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <Box
        position="fixed"
        bottom="-10%"
        right="5%"
        w="450px"
        h="450px"
        borderRadius="full"
        opacity={0.08}
        pointerEvents="none"
        zIndex={0}
        css={{
          background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <Flex direction="column" h="100dvh" position="relative" zIndex={1}>
        {/* ===== HEADER ===== */}
        <Box
          px="4"
          py="3"
          flexShrink={0}
          css={{
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <HStack justify="space-between">
            {/* Left: sidebar toggle + logo */}
            <HStack gap="3">
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Toggle sidebar"
                onClick={() => setSidebarOpen((v) => !v)}
                css={{
                  color: "gray.500",
                  borderRadius: "lg",
                  _hover: {
                    background: "rgba(168,85,247,0.1)",
                    color: "purple.300",
                  },
                }}
              >
                {sidebarOpen ? <LuX /> : <LuMenu />}
              </IconButton>

              <HStack gap="2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  // @ts-expect-error framer-motion types
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                >
                  <Icon color="purple.400" fontSize="lg">
                    <LuWandSparkles />
                  </Icon>
                </motion.div>
                <Text
                  fontWeight="black"
                  css={{
                    fontSize: "1.25rem",
                    letterSpacing: "-0.02em",
                    background:
                      "linear-gradient(135deg, #c084fc 0%, #818cf8 40%, #67e8f9 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: "drop-shadow(0 0 12px rgba(168,85,247,0.5))",
                  }}
                >
                  MagicY8
                </Text>
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
                  // @ts-expect-error framer-motion types
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                >
                  <Icon color="cyan.400" fontSize="sm">
                    <LuSparkles />
                  </Icon>
                </motion.div>
              </HStack>

              <Box
                display={{ base: "none", md: "block" }}
                px="2.5"
                py="1"
                borderRadius="full"
                css={{
                  background: "rgba(168,85,247,0.08)",
                  borderWidth: "1px",
                  borderColor: "rgba(168,85,247,0.2)",
                  fontSize: "0.6rem",
                  color: "#c084fc",
                  fontWeight: "semibold",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                }}
              >
                Powered by Groq
              </Box>
            </HStack>

            {/* Right: API status + settings gear + trending toggle */}
            <HStack gap="2">
              {/* API Status pill */}
              <HStack
                gap="1.5"
                px="3"
                py="1.5"
                borderRadius="full"
                css={{
                  background: "rgba(168,85,247,0.08)",
                  borderWidth: "1px",
                  borderColor: "rgba(168,85,247,0.2)",
                }}
              >
                <Box
                  w="6px"
                  h="6px"
                  borderRadius="full"
                  flexShrink={0}
                  css={{
                    background: "#a855f7",
                    boxShadow: "0 0 6px rgba(168,85,247,0.9)",
                  }}
                />
                <Text
                  textStyle="xs"
                  color="purple.300"
                  fontWeight="medium"
                  display={{ base: "none", sm: "block" }}
                >
                  Groq API
                </Text>
              </HStack>

              {/* API Connection modal */}
              <ApiStatusModal
                trigger={
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label="Open API settings"
                    css={{
                      color: "gray.400",
                      borderRadius: "lg",
                      borderWidth: "1px",
                      borderColor: "rgba(255,255,255,0.08)",
                      _hover: {
                        background: "rgba(168,85,247,0.12)",
                        color: "purple.300",
                        borderColor: "rgba(168,85,247,0.3)",
                      },
                    }}
                  >
                    <LuSettings />
                  </IconButton>
                }
                generating={generating}
                lastUsedModel={lastUsedModel}
                forceOpenSignal={apiKeySignal}
              />

              {/* Trending toggle */}
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Toggle trending panel"
                onClick={() => setTrendingOpen((v) => !v)}
                css={{
                  color: "gray.500",
                  borderRadius: "lg",
                  _hover: {
                    background: "rgba(59,130,246,0.1)",
                    color: "blue.300",
                  },
                }}
              >
                {trendingOpen ? <LuX /> : <LuMenu />}
              </IconButton>
            </HStack>
          </HStack>
        </Box>

        {/* ===== TOOL TABS ===== */}
        <Box
          px="4"
          py="2"
          flexShrink={0}
          css={{
            background: "rgba(255,255,255,0.01)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Tabs.Root
            value={activeTool}
            onValueChange={(e) => {
              setActiveTool(e.value as ActiveTool)
              setInitialState(undefined)
            }}
            variant="plain"
          >
            <Tabs.List gap="2">
              <Tabs.Trigger
                value="nails_video"
                css={{
                  borderRadius: "lg",
                  fontSize: "0.8rem",
                  fontWeight: "semibold",
                  color: "gray.500",
                  px: "4",
                  py: "2",
                  _selected: {
                    color: "purple.300",
                    background: "rgba(168,85,247,0.12)",
                    boxShadow: "0 0 10px rgba(168,85,247,0.2)",
                  },
                  _hover: { color: "gray.300" },
                }}
              >
                <HStack gap="1.5">
                  <Icon fontSize="sm"><LuWandSparkles /></Icon>
                  <Text>Nails Style Video / නිය වීඩියෝ</Text>
                </HStack>
              </Tabs.Trigger>
              <Tabs.Trigger
                value="tattoo_video"
                css={{
                  borderRadius: "lg",
                  fontSize: "0.8rem",
                  fontWeight: "semibold",
                  color: "gray.500",
                  px: "4",
                  py: "2",
                  _selected: {
                    color: "orange.300",
                    background: "rgba(249,115,22,0.12)",
                    boxShadow: "0 0 10px rgba(249,115,22,0.2)",
                  },
                  _hover: { color: "gray.300" },
                }}
              >
                <HStack gap="1.5">
                  <Icon fontSize="sm"><LuPenTool /></Icon>
                  <Text>Tattoo Video Generator / ටැටූ වීඩියෝ</Text>
                </HStack>
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </Box>

        {/* ===== MAIN CONTENT ===== */}
        <Flex flex="1" overflow="hidden">
          {/* Left Sidebar */}
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <MotionBox
                key="sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 260, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                // @ts-expect-error framer-motion types
                transition={{ duration: 0.3, ease: "easeInOut" }}
                flexShrink={0}
                overflow="hidden"
              >
                <Box w="260px" h="100%">
                  <Sidebar
                    history={history}
                    onSelectHistory={handleSelectHistory}
                    onClearHistory={handleClearHistory}
                  />
                </Box>
              </MotionBox>
            )}
          </AnimatePresence>

          {/* Center Workspace */}
          <Box
            flex="1"
            overflow="auto"
            p="5"
            css={{
              borderLeft: sidebarOpen
                ? "1px solid rgba(255,255,255,0.05)"
                : "none",
              borderRight: trendingOpen
                ? "1px solid rgba(255,255,255,0.05)"
                : "none",
            }}
          >
            {activeTool === "nails_video" ? (
              <NailsVideoGenerator
                key={initialState?.tool === "nails_video" ? "nails-init" : "nails"}
                onPromptGenerated={handlePromptGenerated}
                onGeneratingChange={setGenerating}
                onModelUsed={setLastUsedModel}
                onRequireApiKey={() => setApiKeySignal((s) => s + 1)}
                initialForm={initialState?.nailsForm}
              />
            ) : (
              <TattooVideoGenerator
                key={initialState?.tool === "tattoo_video" ? "tattoo-init" : "tattoo"}
                onPromptGenerated={handlePromptGenerated}
                onGeneratingChange={setGenerating}
                onModelUsed={setLastUsedModel}
                onRequireApiKey={() => setApiKeySignal((s) => s + 1)}
                initialForm={initialState?.tattooForm}
              />
            )}
          </Box>

          {/* Right Trending Panel */}
          <AnimatePresence initial={false}>
            {trendingOpen && (
              <MotionBox
                key="trending"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                // @ts-expect-error framer-motion types
                transition={{ duration: 0.3, ease: "easeInOut" }}
                flexShrink={0}
                overflow="hidden"
              >
                <Box
                  w="280px"
                  h="100%"
                  overflow="auto"
                  css={{
                    background: "rgba(255,255,255,0.01)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <TrendingPanel
                    toolType={toolType}
                    onSelectTopic={handleSelectTrending}
                    generating={generating}
                  />
                </Box>
              </MotionBox>
            )}
          </AnimatePresence>
        </Flex>
      </Flex>
    </Box>
  )
}
