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
import { refreshLearnedPromptMemory } from "./services/learnedPromptMemory"
import { autoRetryPendingSaves, setupConnectivityRetry } from "./services/sheetRetryQueue"
import type {
  HistoryEntry,
  NailsVideoFormState,
  TattooVideoFormState,
  ToolType,
} from "./types"

const MotionBox = motion.create(Box)

const STORAGE_KEY_HISTORY = "magy8_history"
const MAX_HISTORY_ITEMS = 200

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
    // Migrate old entries into current nails/tattoo video tools.
    let toolType: ToolType = "nails_video"
    if (entry.toolType) toolType = entry.toolType
    else if (entry.category === "Tattoo Video") toolType = "tattoo_video"
    return {
      ...entry,
      toolType,
      duration: "10s",
    }
  })
}

export default function App() {
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(
    STORAGE_KEY_HISTORY,
    [],
  )
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === "undefined" ? true : !window.matchMedia("(max-width: 1024px)").matches,
  )
  const [trendingOpen, setTrendingOpen] = useState(() =>
    typeof window === "undefined" ? true : !window.matchMedia("(max-width: 1024px)").matches,
  )
  const [isCompactLayout, setIsCompactLayout] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 1024px)").matches,
  )
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

  useEffect(() => {
    refreshLearnedPromptMemory(history).catch(() => {
      // Learning is best-effort; prompt generation must keep working without it.
    })
  }, [history])

  const handlePromptGenerated = useCallback(
    (entry: HistoryEntry) => {
      setHistory([entry, ...history].slice(0, MAX_HISTORY_ITEMS))
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
    const syncLayout = () => {
      const compact = mq.matches
      setIsCompactLayout(compact)
      if (compact) {
        setSidebarOpen(false)
        setTrendingOpen(false)
      } else {
        setSidebarOpen(true)
        setTrendingOpen(true)
      }
    }
    syncLayout()
    mq.addEventListener("change", syncLayout)
    return () => mq.removeEventListener("change", syncLayout)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => {
      const next = !open
      if (next && isCompactLayout) setTrendingOpen(false)
      return next
    })
  }, [isCompactLayout])

  const toggleTrending = useCallback(() => {
    setTrendingOpen((open) => {
      const next = !open
      if (next && isCompactLayout) setSidebarOpen(false)
      return next
    })
  }, [isCompactLayout])

  // Sync active tool when initialState changes
  useEffect(() => {
    if (initialState?.tool) {
      setActiveTool(initialState.tool)
    }
  }, [initialState])

  const toolType: ToolType = activeTool

  return (
    <Box
      minH="100svh"
      position="relative"
      css={{
        background:
          "linear-gradient(135deg, #030712 0%, #080b14 50%, #020b18 100%)",
        overflowX: "hidden",
      }}
    >
      <Flex direction="column" h="100svh" minH="0" position="relative" zIndex={1}>
        {/* ===== HEADER ===== */}
        <Box
          px={{ base: "3", md: "4" }}
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
            <HStack gap={{ base: "2", md: "3" }} minW="0">
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Toggle sidebar"
                onClick={toggleSidebar}
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
                    fontSize: "clamp(1rem, 1rem + 0.6vw, 1.25rem)",
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
                Firebase Ready
              </Box>
            </HStack>

            {/* Right: API status + settings gear + trending toggle */}
            <HStack gap="2">
              {/* API Status pill */}
              <HStack
                gap="1.5"
                px={{ base: "2", sm: "3" }}
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
                  Firebase Sync
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
                onClick={toggleTrending}
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
          px={{ base: "2", md: "4" }}
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
            <Tabs.List gap="2" overflowX="auto" maxW="100%" px={{ base: "2", md: "0" }} css={{ scrollbarWidth: "none" }}>
              <Tabs.Trigger
                value="nails_video"
                css={{
                  borderRadius: "lg",
                  fontSize: "0.8rem",
                  fontWeight: "semibold",
                  color: "gray.500",
                  px: "3",
                  py: "2",
                  flexShrink: 0,
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
                  <Text whiteSpace="nowrap">Nails Style Video</Text>
                </HStack>
              </Tabs.Trigger>
              <Tabs.Trigger
                value="tattoo_video"
                css={{
                  borderRadius: "lg",
                  fontSize: "0.8rem",
                  fontWeight: "semibold",
                  color: "gray.500",
                  px: "3",
                  py: "2",
                  flexShrink: 0,
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
                  <Text whiteSpace="nowrap">Tattoo Style Video</Text>
                </HStack>
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </Box>

        {/* ===== MAIN CONTENT ===== */}
        <Flex flex="1" overflow="hidden" minW="0" minH="0" position="relative">
          {/* Left Sidebar */}
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <MotionBox
                key="sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: isCompactLayout ? Math.min(300, window.innerWidth * 0.86) : 260, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                // @ts-expect-error framer-motion types
                transition={{ duration: 0.3, ease: "easeInOut" }}
                flexShrink={0}
                overflow="hidden"
                position={isCompactLayout ? "fixed" : "relative"}
                left={isCompactLayout ? "0" : undefined}
                top={isCompactLayout ? "0" : undefined}
                bottom={isCompactLayout ? "0" : undefined}
                zIndex={isCompactLayout ? 50 : undefined}
              >
                <Box w={{ base: "min(86vw, 300px)", lg: "260px" }} h="100%">
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
            minW="0"
            overflow="auto"
            p={{ base: "3", md: "5" }}
            maxW="100%"
            css={{
              borderLeft: sidebarOpen && !isCompactLayout
                ? "1px solid rgba(255,255,255,0.05)"
                : "none",
              borderRight: trendingOpen && !isCompactLayout
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
                animate={{ width: isCompactLayout ? Math.min(320, window.innerWidth * 0.9) : 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                // @ts-expect-error framer-motion types
                transition={{ duration: 0.3, ease: "easeInOut" }}
                flexShrink={0}
                overflow="hidden"
                position={isCompactLayout ? "fixed" : "relative"}
                right={isCompactLayout ? "0" : undefined}
                top={isCompactLayout ? "0" : undefined}
                bottom={isCompactLayout ? "0" : undefined}
                zIndex={isCompactLayout ? 50 : undefined}
              >
                <Box
                  w={{ base: "min(90vw, 320px)", lg: "280px" }}
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
