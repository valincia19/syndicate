# Design Assets Hub v2 — Component Catalog

## Tech Stack
Vite 8 • React 19 • Tailwind CSS 4.3 • TypeScript 6 • ShadCN/UI (new-york style)

## Available Components (33)

### Layout & Navigation
| Component | File | Usage |
|-----------|------|-------|
| **Accordion** | `components/ui/accordion.tsx` | Collapsible sections with smooth animations |
| **Tabs** | `components/ui/tabs.tsx` | Tabbed content panels |
| **Dialog** | `components/ui/dialog.tsx` | Modal dialogs |
| **Sheet** | `components/ui/sheet.tsx` | Slide-in panel (drawer) |
| **Dropdown Menu** | `components/ui/dropdown-menu.tsx` | Context menus |
| **Popover** | `components/ui/popover.tsx` | Floating content |
| **Command** | `components/ui/command.tsx` | Command palette (Ctrl+K) with cmdk |
| **Scroll Area** | `components/ui/scroll-area.tsx` | Custom scrollable containers |
| **Collapsible** | `components/ui/collapsible.tsx` | Toggle content visibility |
| **Separator** | `components/ui/separator.tsx` | Visual dividers |
| **Resizable** | `components/ui/resizable.tsx` | Split panels (react-resizable-panels) |
| **Carousel** | `components/ui/carousel.tsx` | Content sliders (embla-carousel) |

### Data Display
| Component | File | Usage |
|-----------|------|-------|
| **Data Table** | `components/ui/data-table.tsx` | Sort, filter, paginate (@tanstack/react-table) |
| **Table** | `components/ui/table.tsx` | Simple HTML tables |
| **Card** | `components/ui/card.tsx` | Content containers |
| **Chart** | `components/ui/chart.tsx` | Recharts wrapper with tooltip/legend |
| **Badge** | `components/ui/badge.tsx` | Status indicators |
| **Avatar** | `components/ui/avatar.tsx` | User avatars |
| **Skeleton** | `components/ui/skeleton.tsx` | Loading placeholders |
| **Progress** | `components/ui/progress.tsx` | Progress bars |
| **Tooltip** | `components/ui/tooltip.tsx` | Hover tooltips |
| **Hover Card** | `components/ui/hover-card.tsx` | Rich hover previews |

### Forms & Inputs
| Component | File | Usage |
|-----------|------|-------|
| **Input** | `components/ui/input.tsx` | Text inputs |
| **Textarea** | `components/ui/textarea.tsx` | Multiline inputs |
| **Select** | `components/ui/select.tsx` | Dropdown selects |
| **Checkbox** | `components/ui/checkbox.tsx` | Checkboxes |
| **Radio Group** | `components/ui/radio-group.tsx` | Radio buttons |
| **Switch** | `components/ui/switch.tsx` | Toggle switches |
| **Label** | `components/ui/label.tsx` | Form labels |
| **Button** | `components/ui/button.tsx` | Buttons (6 variants) |

### Dates & Time
| Component | File | Usage |
|-----------|------|-------|
| **Calendar** | `components/ui/calendar.tsx` | Date picker (react-day-picker 10) |

### Feedback
| Component | File | Usage |
|-----------|------|-------|
| **Sonner** | `components/ui/sonner.tsx` | Toast notifications |

---

## Example Demos (14)
All located in `src/examples/`:

- **AccordionDemo** — Multi-section accordion with design tokens
- **BadgeDemo** — 4 badge variants (default, secondary, outline, destructive)
- **CardCompositeDemo** — Card with header, content, footer
- **CarouselDemo** — Horizontal slider with 6 slides
- **ChartDemo** — Bar chart with Recharts and chart tooltips
- **CommandDemo** — Ctrl+K command palette with groups
- **DataTableDemo** — 12-row table with sort/filter/pagination
- **DatePickerDemo** — Popover date picker with react-day-picker
- **DialogDemo** — Confirm/cancel modal dialog
- **DropdownMenuDemo** — Account menu with icons
- **FormDemo** — Input, checkbox, switch, radio, submit
- **SheetDemo** — Slide-in panel
- **TabsDemo** — 3-tab layout
- **TooltipDemo** — Avatar tooltips

---

## Adding New Components

```bash
npx shadcn@latest add <component-name> -y
```

## Import Convention

```tsx
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
```

## Theme Customization

Edit `src/index.css` — OKLCH color space, CSS custom properties:
- `:root` — Light mode
- `.dark` — Dark mode
- `@theme inline` — Maps CSS vars to Tailwind tokens
