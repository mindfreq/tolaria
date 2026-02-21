import { useState, type ComponentType } from 'react'
import {
  FileText, Wrench, Flask, Target, ArrowsClockwise, Users, CalendarBlank,
  Tag, StackSimple, BookOpen, CookingPot, Heart, Star, House, Lightbulb,
  Briefcase, Gear, Cube, Leaf, MusicNote, Camera, Airplane, GameController,
  PaintBrush, ShoppingCart, GraduationCap, Trophy, ChatCircle, Notebook,
  MapPin, Code, Barbell, PawPrint, Pill, Knife,
  type IconProps,
} from '@phosphor-icons/react'
import { ACCENT_COLORS } from '../utils/typeColors'
import { cn } from '@/lib/utils'

/** Curated Phosphor icons (normal weight) for type customization */
export const ICON_OPTIONS: { name: string; Icon: ComponentType<IconProps> }[] = [
  { name: 'file-text', Icon: FileText },
  { name: 'wrench', Icon: Wrench },
  { name: 'flask', Icon: Flask },
  { name: 'target', Icon: Target },
  { name: 'arrows-clockwise', Icon: ArrowsClockwise },
  { name: 'users', Icon: Users },
  { name: 'calendar-blank', Icon: CalendarBlank },
  { name: 'tag', Icon: Tag },
  { name: 'stack-simple', Icon: StackSimple },
  { name: 'book-open', Icon: BookOpen },
  { name: 'cooking-pot', Icon: CookingPot },
  { name: 'heart', Icon: Heart },
  { name: 'star', Icon: Star },
  { name: 'house', Icon: House },
  { name: 'lightbulb', Icon: Lightbulb },
  { name: 'briefcase', Icon: Briefcase },
  { name: 'gear', Icon: Gear },
  { name: 'cube', Icon: Cube },
  { name: 'leaf', Icon: Leaf },
  { name: 'music-note', Icon: MusicNote },
  { name: 'camera', Icon: Camera },
  { name: 'airplane', Icon: Airplane },
  { name: 'game-controller', Icon: GameController },
  { name: 'paint-brush', Icon: PaintBrush },
  { name: 'shopping-cart', Icon: ShoppingCart },
  { name: 'graduation-cap', Icon: GraduationCap },
  { name: 'trophy', Icon: Trophy },
  { name: 'chat-circle', Icon: ChatCircle },
  { name: 'notebook', Icon: Notebook },
  { name: 'map-pin', Icon: MapPin },
  { name: 'code', Icon: Code },
  { name: 'barbell', Icon: Barbell },
  { name: 'paw-print', Icon: PawPrint },
  { name: 'pill', Icon: Pill },
  { name: 'knife', Icon: Knife },
]

const ICON_MAP: Record<string, ComponentType<IconProps>> = Object.fromEntries(
  ICON_OPTIONS.map((o) => [o.name, o.Icon]),
)

/** Resolves a Phosphor icon name to its component, with fallback to FileText */
export function resolveIcon(name: string | null): ComponentType<IconProps> {
  return (name && ICON_MAP[name]) || FileText
}

interface TypeCustomizePopoverProps {
  currentIcon: string | null
  currentColor: string | null
  onChangeIcon: (icon: string) => void
  onChangeColor: (color: string) => void
  onClose: () => void
}

export function TypeCustomizePopover({
  currentIcon,
  currentColor,
  onChangeIcon,
  onChangeColor,
  onClose,
}: TypeCustomizePopoverProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor)
  const [selectedIcon, setSelectedIcon] = useState(currentIcon)

  const handleColorClick = (key: string) => {
    setSelectedColor(key)
    onChangeColor(key)
  }

  const handleIconClick = (name: string) => {
    setSelectedIcon(name)
    onChangeIcon(name)
  }

  return (
    <div
      className="bg-popover text-popover-foreground z-50 rounded-lg border shadow-md"
      style={{ width: 264, padding: 12 }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {/* Color section */}
      <div className="font-mono-overline mb-2 text-muted-foreground">COLOR</div>
      <div className="flex gap-2 mb-3">
        {ACCENT_COLORS.map((c) => (
          <button
            key={c.key}
            className={cn(
              "flex items-center justify-center rounded-full border-2 cursor-pointer transition-all",
              selectedColor === c.key ? "border-foreground scale-110" : "border-transparent hover:scale-105",
            )}
            style={{ width: 28, height: 28, backgroundColor: c.css, border: selectedColor === c.key ? '2px solid var(--foreground)' : '2px solid transparent' }}
            onClick={() => handleColorClick(c.key)}
            title={c.label}
          />
        ))}
      </div>

      {/* Icon section */}
      <div className="font-mono-overline mb-2 text-muted-foreground">ICON</div>
      <div className="flex flex-wrap gap-1" style={{ maxHeight: 200, overflowY: 'auto' }}>
        {ICON_OPTIONS.map(({ name, Icon }) => (
          <button
            key={name}
            className={cn(
              "flex items-center justify-center rounded cursor-pointer transition-colors",
              selectedIcon === name
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            style={{ width: 30, height: 30 }}
            onClick={() => handleIconClick(name)}
            title={name}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>

      {/* Done button */}
      <div className="mt-3 flex justify-end">
        <button
          className="rounded px-3 py-1 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors border-none bg-transparent"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  )
}
