"use client"

import {
  Box,
  HStack,
  Heading,
  Icon,
  IconButton,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react"
import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import { LuFlame, LuRefreshCw, LuTriangleAlert } from "react-icons/lu"
import {
  getTrends,
  GeminiError,
  type TrendIdea,
  type TrendResult,
  type ToolType,
} from "../services/geminiApi"
import { getApiKey } from "../services/apiKeyStorage"

const glowBlue = "0 0 20px rgba(59,130,246,0.35), 0 0 40px rgba(59,130,246,0.15)"

const CACHE_KEY_PREFIX = "magy8_trends_"
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

const FALLBACK_AI: TrendIdea[] = [
  {
    title: "Pearl chrome French tips",
    description: "A glossy macro nail reveal with soft salon lighting.",
  },
  {
    title: "Pink aura almond nails",
    description: "Airbrushed pink glow building into a clean final hero shot.",
  },
  {
    title: "Cat eye magnetic gel",
    description: "Magnetic shimmer line moving across glossy nails.",
  },
  {
    title: "3D bow charm nails",
    description: "Tiny charms and chrome details revealed one by one.",
  },
  {
    title: "Milky white clean girl nails",
    description: "Minimal soft-gloss manicure with satisfying polish passes.",
  },
  {
    title: "Glitter ombre reveal",
    description: "Sparkle gradient catching light during a slow hand turn.",
  },
]

const FALLBACK_TATTOO: TrendIdea[] = [
  {
    title: "Fine line botanical sleeve",
    description: "Delicate single-needle floral arrangements on the forearm.",
  },
  {
    title: "Blackwork geometric mandala",
    description: "Symmetrical sacred geometry on the upper back.",
  },
  {
    title: "Watercolor splash tattoo",
    description: "Vibrant color bleeding effects on the shoulder.",
  },
  {
    title: "Minimalist constellation",
    description: "Small star-map connecting dots on the inner forearm.",
  },
  {
    title: "Neo-traditional koi fish",
    description: "Bold-lined flowing koi on the calf.",
  },
  {
    title: "Single-needle micro portrait",
    description: "Hyper-detailed small portrait on the wrist.",
  },
]

interface TrendingPanelProps {
  toolType: ToolType
  onSelectTopic: (topic: string) => void
  generating?: boolean
}

interface CachedTrend {
  result: TrendResult;
  cachedAt: number;
}

export function TrendingPanel({ toolType, onSelectTopic, generating }: TrendingPanelProps) {
  const [ideas, setIdeas] = useState<TrendIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isFallback, setIsFallback] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<number | undefined>(undefined)
  const [refreshKey, setRefreshKey] = useState(0)
  const mountedRef = useRef(true)
  const fetchingRef = useRef(false)

  const loadTrends = useCallback(
    async (force = false) => {
      if (fetchingRef.current) return
      fetchingRef.current = true
      setLoading(true)
      setError("")

      const cacheKey = `${CACHE_KEY_PREFIX}${toolType}`
      if (!force) {
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            const parsed = JSON.parse(cached) as CachedTrend
            if (
              parsed.cachedAt &&
              Date.now() - parsed.cachedAt < CACHE_TTL_MS &&
              parsed.result?.ideas?.length > 0
            ) {
              setIdeas(parsed.result.ideas)
              setIsFallback(parsed.result.fallback)
              setUpdatedAt(parsed.result.updatedAt)
              setLoading(false)
              fetchingRef.current = false
              return
            }
          }
        } catch {
          // ignore cache errors
        }
      }

      try {
        const apiKey = getApiKey()
        if (!apiKey) {
          if (!mountedRef.current) return
          const fallback =
            toolType === "tattoo_video" ? FALLBACK_TATTOO : FALLBACK_AI
          setIdeas(fallback)
          setIsFallback(true)
          setUpdatedAt(undefined)
          setError("")
          return
        }
        const result = await getTrends(toolType, apiKey)
        if (!mountedRef.current) return

        if (result.fallback || result.ideas.length === 0) {
          const fallback =
            toolType === "tattoo_video" ? FALLBACK_TATTOO : FALLBACK_AI
          setIdeas(fallback)
          setIsFallback(true)
          setUpdatedAt(undefined)
          setError(result.error ?? "")
        } else {
          setIdeas(result.ideas)
          setIsFallback(false)
          setUpdatedAt(result.updatedAt)
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({ result, cachedAt: Date.now() } satisfies CachedTrend),
            )
          } catch {
            // ignore storage errors
          }
        }
      } catch (err) {
        if (!mountedRef.current) return
        const fallback =
          toolType === "tattoo_video" ? FALLBACK_TATTOO : FALLBACK_AI
        setIdeas(fallback)
        setIsFallback(true)
        setUpdatedAt(undefined)
        setError(
          err instanceof GeminiError
            ? err.message
            : "Could not load live trends.",
        )
      } finally {
        if (mountedRef.current) setLoading(false)
        fetchingRef.current = false
      }
    },
    [toolType],
  )

  useEffect(() => {
    mountedRef.current = true
    // Skip fetching if a prompt is currently generating to avoid competing for quota
    if (generating) {
      setLoading(false)
      return
    }
    loadTrends()
    return () => {
      mountedRef.current = false
    }
  }, [loadTrends, refreshKey, toolType, generating])

  const heading = isFallback ? "Suggested Ideas" : "Trending Ideas Today"

  return (
    <VStack gap="5" align="stretch" h="100%" overflow="auto" p="5">
      {/* Trending list */}
      <Box
        p="5"
        borderRadius="2xl"
        css={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(16px)",
          borderWidth: "1px",
          borderColor: "rgba(59,130,246,0.15)",
          boxShadow:
            "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <HStack gap="2" mb="4" justify="space-between">
          <HStack gap="2">
            <motion.div
              animate={{ scale: [1, 1.25, 1] }}
              // @ts-expect-error framer-motion types
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Icon color="orange.400" fontSize="xl"><LuFlame /></Icon>
            </motion.div>
            <Heading
              size="xs"
              css={{
                background: "linear-gradient(90deg, #fb923c, #f87171)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {heading}
            </Heading>
          </HStack>
          <IconButton
            size="xs"
            variant="ghost"
            aria-label="Refresh trends"
            onClick={() => {
              if (generating) return
              setRefreshKey((k) => k + 1)
              loadTrends(true)
            }}
            disabled={loading || generating}
            css={{
              color: "blue.300",
              _hover: { background: "rgba(59,130,246,0.1)" },
            }}
          >
            <LuRefreshCw />
          </IconButton>
        </HStack>

        <Box
          h="1px"
          mb="4"
          css={{
            background: "linear-gradient(90deg, rgba(251,146,60,0.4), transparent)",
          }}
        />

        {/* Timestamp */}
        {updatedAt && !loading && (
          <Text textStyle="xs" color="gray.600" mb="3">
            Updated: {new Date(updatedAt).toLocaleString()}
          </Text>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <VStack gap="2" align="stretch">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Box
                key={i}
                p="2.5"
                borderRadius="lg"
                css={{
                  background: "rgba(255,255,255,0.02)",
                  borderWidth: "1px",
                  borderColor: "rgba(255,255,255,0.05)",
                }}
              >
                <Skeleton height="12px" width="70%" mb="2" />
                <Skeleton height="10px" width="90%" />
              </Box>
            ))}
          </VStack>
        ) : error && isFallback ? (
          <Box
            p="3"
            borderRadius="lg"
            mb="3"
            css={{
              background: "rgba(239,68,68,0.06)",
              borderWidth: "1px",
              borderColor: "rgba(239,68,68,0.2)",
            }}
          >
            <HStack gap="2" mb="1">
              <Icon color="red.400" fontSize="sm"><LuTriangleAlert /></Icon>
              <Text textStyle="xs" color="red.300" fontWeight="medium">
                Live trends unavailable
              </Text>
            </HStack>
            <Text textStyle="xs" color="gray.500" lineHeight="1.5">
              {error}
            </Text>
            <Box mt="2">
              <Text
                as="button"
                textStyle="xs"
                color="blue.300"
                fontWeight="semibold"
                onClick={() => loadTrends(true)}
                css={{ cursor: "pointer", _hover: { color: "blue.200" } }}
              >
                Retry
              </Text>
            </Box>
          </Box>
        ) : (
          <VStack gap="1.5" align="stretch">
            <AnimatePresence>
              {ideas.map((idea, i) => (
                <motion.div
                  key={idea.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  // @ts-expect-error framer-motion types
                  transition={{ delay: i * 0.06, duration: 0.35 }}
                  whileHover={{ x: 4, scale: 1.01 }}
                >
                  <HStack
                    gap="3"
                    p="2.5"
                    borderRadius="lg"
                    cursor="pointer"
                    onClick={() => onSelectTopic(idea.title)}
                    css={{
                      background: "rgba(255,255,255,0.02)",
                      borderWidth: "1px",
                      borderColor: "rgba(255,255,255,0.05)",
                      transition: "all 0.2s ease",
                      _hover: {
                        background: "rgba(59,130,246,0.08)",
                        borderColor: "rgba(59,130,246,0.25)",
                        boxShadow: glowBlue,
                      },
                    }}
                  >
                    <Box
                      minW="20px"
                      h="20px"
                      borderRadius="full"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                      css={{
                        background:
                          i < 3
                            ? "linear-gradient(135deg, #f97316, #ef4444)"
                            : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        fontSize: "0.6rem",
                        fontWeight: "bold",
                        color: "white",
                      }}
                    >
                      {i + 1}
                    </Box>
                    <VStack gap="0.5" align="start" flex="1">
                      <Text
                        textStyle="xs"
                        color={i < 3 ? "orange.200" : "gray.400"}
                        lineHeight="1.4"
                        fontWeight={i < 3 ? "medium" : "normal"}
                      >
                        {idea.title}
                      </Text>
                      <Text textStyle="xs" color="gray.600" lineHeight="1.4">
                        {idea.description}
                      </Text>
                      {idea.source?.uri && (
                        <Text
                          as="a"
                          href={idea.source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          textStyle="xs"
                          color="blue.500"
                          _hover={{ color: "blue.300", textDecoration: "underline" }}
                        >
                          {idea.source.name ?? idea.source.uri}
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                </motion.div>
              ))}
            </AnimatePresence>
          </VStack>
        )}

        <Box
          mt="4"
          p="2.5"
          borderRadius="lg"
          css={{
            background: "rgba(168,85,247,0.07)",
            borderWidth: "1px",
            borderColor: "rgba(168,85,247,0.18)",
          }}
        >
          <Text textStyle="xs" color="gray.600">
            {isFallback
              ? "Showing suggested ideas. Add an API key to refresh live trends."
              : "Click any topic to instantly fill your core idea."}
          </Text>
        </Box>
      </Box>
    </VStack>
  )
}
