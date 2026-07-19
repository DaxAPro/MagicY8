import { Box, Portal, Select, Text, createListCollection } from "@chakra-ui/react"
import {
  ACCENT_BORDERS,
  ACCENT_FOCUSES,
  ACCENT_GLOWS,
  ACCENT_HOVERS,
  ACCENT_LABELS,
  ACCENT_SELECTED,
  ACCENT_SELECTED_TEXT,
  type AccentColor,
  type CollectionItem,
} from "./formConstants"

export function SelectField({
  label,
  collection,
  value,
  onChange,
  accentColor = "purple",
}: {
  label: string
  collection: ReturnType<typeof createListCollection>
  value: string[]
  onChange: (val: string[]) => void
  accentColor?: AccentColor
}) {
  const border = ACCENT_BORDERS[accentColor]
  const focus = ACCENT_FOCUSES[accentColor]
  const shadow = ACCENT_GLOWS[accentColor]
  const labelColor = ACCENT_LABELS[accentColor]
  const hoverBg = ACCENT_HOVERS[accentColor]
  const selectedBg = ACCENT_SELECTED[accentColor]
  const selectedText = ACCENT_SELECTED_TEXT[accentColor]

  return (
    <Box>
      <Text
        fontWeight="semibold"
        color={labelColor}
        mb="1.5"
        letterSpacing="widest"
        css={{ textTransform: "uppercase", fontSize: "0.63rem" }}
      >
        {label}
      </Text>
      <Select.Root
        collection={collection}
        value={value}
        onValueChange={(e) => onChange(e.value)}
        size="sm"
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger
            css={{
              background: "rgba(255,255,255,0.04)",
              borderColor: border,
              color: "white",
              _hover: { borderColor: focus, background: "rgba(255,255,255,0.07)" },
              _focus: { borderColor: focus, boxShadow: shadow },
            }}
          >
            <Select.ValueText placeholder="Select..." />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator color={labelColor} />
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content
              css={{
                background: "#080b14",
                borderColor: border,
                boxShadow: shadow,
              }}
            >
              {collection.items.map((item: CollectionItem) => (
                <Select.Item
                  key={item.value}
                  item={item}
                  css={{
                    color: "gray.200",
                    _hover: { background: hoverBg },
                    _selected: { background: selectedBg, color: selectedText },
                  }}
                >
                  {item.label}
                  <Select.ItemIndicator color={focus} />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
    </Box>
  )
}
