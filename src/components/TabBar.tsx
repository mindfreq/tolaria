import { memo, useState, useRef, useCallback } from 'react'
import type { VaultEntry } from '../types'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { Plus, Columns, ArrowsOutSimple } from '@phosphor-icons/react'

interface Tab {
  entry: VaultEntry
  content: string
}

interface TabBarProps {
  tabs: Tab[]
  activeTabPath: string | null
  onSwitchTab: (path: string) => void
  onCloseTab: (path: string) => void
  onCreateNote?: () => void
  onReorderTabs?: (fromIndex: number, toIndex: number) => void
}

const DISABLED_ICON_STYLE = { opacity: 0.4, cursor: 'not-allowed' } as const

export const TabBar = memo(function TabBar({
  tabs, activeTabPath, onSwitchTab, onCloseTab, onCreateNote, onReorderTabs,
}: TabBarProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const dragNodeRef = useRef<HTMLDivElement | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    // Make the drag image slightly transparent
    if (e.currentTarget) {
      dragNodeRef.current = e.currentTarget
      requestAnimationFrame(() => {
        if (dragNodeRef.current) {
          dragNodeRef.current.style.opacity = '0.5'
        }
      })
    }
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = ''
    }
    dragNodeRef.current = null
    setDragIndex(null)
    setDropIndex(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIndex === null || dragIndex === index) {
      setDropIndex(null)
      return
    }
    // Determine drop position based on cursor within the tab
    const rect = e.currentTarget.getBoundingClientRect()
    const midpoint = rect.left + rect.width / 2
    const insertIndex = e.clientX < midpoint ? index : index + 1
    setDropIndex(insertIndex)
  }, [dragIndex])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex && onReorderTabs) {
      // Adjust target index: if dropping after the dragged item, account for removal
      const toIndex = dropIndex > dragIndex ? dropIndex - 1 : dropIndex
      if (toIndex !== dragIndex) {
        onReorderTabs(dragIndex, toIndex)
      }
    }
    handleDragEnd()
  }, [dragIndex, dropIndex, onReorderTabs, handleDragEnd])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if we're leaving the tab bar entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (!e.currentTarget.contains(relatedTarget)) {
      setDropIndex(null)
    }
  }, [])

  return (
    <div
      className="flex shrink-0 items-stretch"
      style={{ height: 45, background: 'var(--sidebar)', WebkitAppRegion: 'drag' } as React.CSSProperties}
      data-tauri-drag-region
      onDragLeave={handleDragLeave}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.entry.path === activeTabPath
        const showDropBefore = dropIndex === index
        const showDropAfter = dropIndex === index + 1 && index === tabs.length - 1
        return (
          <div
            key={tab.entry.path}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={handleDrop}
            className={cn(
              "group flex shrink-0 items-center gap-1.5 whitespace-nowrap max-w-[180px] transition-all relative",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-secondary-foreground"
            )}
            style={{
              background: isActive ? 'var(--background)' : 'transparent',
              borderRight: `1px solid ${isActive ? 'var(--border)' : 'var(--sidebar-border)'}`,
              borderBottom: isActive ? 'none' : '1px solid var(--sidebar-border)',
              padding: '0 12px',
              fontSize: 12,
              fontWeight: isActive ? 500 : 400,
              cursor: dragIndex !== null ? 'grabbing' : 'grab',
              WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}
            onClick={() => onSwitchTab(tab.entry.path)}
          >
            {showDropBefore && (
              <div
                style={{
                  position: 'absolute',
                  left: -1,
                  top: 8,
                  bottom: 8,
                  width: 2,
                  background: 'var(--primary)',
                  borderRadius: 1,
                  zIndex: 10,
                }}
              />
            )}
            <span className="truncate">{tab.entry.title}</span>
            <button
              className={cn(
                "shrink-0 rounded-sm p-0 bg-transparent border-none text-muted-foreground cursor-pointer transition-opacity hover:bg-accent hover:text-foreground",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              style={{ lineHeight: 0 }}
              draggable={false}
              onClick={(e) => {
                e.stopPropagation()
                onCloseTab(tab.entry.path)
              }}
            >
              <X size={14} />
            </button>
            {showDropAfter && (
              <div
                style={{
                  position: 'absolute',
                  right: -1,
                  top: 8,
                  bottom: 8,
                  width: 2,
                  background: 'var(--primary)',
                  borderRadius: 1,
                  zIndex: 10,
                }}
              />
            )}
          </div>
        )
      })}

      <div className="flex-1" style={{ borderBottom: '1px solid var(--border)' }} />

      <div
        className="flex shrink-0 items-center"
        style={{
          borderLeft: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          gap: 12,
          padding: '0 12px',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        <button
          className="flex items-center justify-center border-none bg-transparent p-0 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          onClick={onCreateNote}
          title="New note"
        >
          <Plus size={16} />
        </button>
        <button
          className="flex items-center justify-center border-none bg-transparent p-0 text-muted-foreground"
          style={DISABLED_ICON_STYLE}
          title="Coming soon"
          tabIndex={-1}
        >
          <Columns size={16} />
        </button>
        <button
          className="flex items-center justify-center border-none bg-transparent p-0 text-muted-foreground"
          style={DISABLED_ICON_STYLE}
          title="Coming soon"
          tabIndex={-1}
        >
          <ArrowsOutSimple size={16} />
        </button>
      </div>
    </div>
  )
})
