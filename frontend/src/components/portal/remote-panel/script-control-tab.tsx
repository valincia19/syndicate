"use client"

import { useState, useCallback } from "react"
import {
  Target,
  Eye,
  Sliders,
  Shield,
  Users,
  Check,
  RotateCcw,
  Save,
  Send,
  ChevronDown,
  Crosshair,
  Scan,
  Move3d,
  Plane,
  Footprints,
  ArrowUpDown,
  Weight,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"
import { MOCK_INSTANCES } from "./types"

// ─── Types ──────────────────────────────────────────────────────────────────

type ScriptTab = "combat" | "visuals" | "player"

interface ToggleFieldProps {
  label: string
  desc: string
  enabled: boolean
  onToggle: () => void
}

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  minLabel: string
  maxLabel: string
  onChange: (v: number) => void
}

// ─── Reusable UI Blocks ─────────────────────────────────────────────────────

function ToggleField({ label, desc, enabled, onToggle }: ToggleFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="text-[10px] font-mono font-bold text-foreground">{label}</span>
        <span className="text-[9px] font-mono text-muted-foreground leading-tight">{desc}</span>
      </div>
      <button
        onClick={onToggle}
        className={`shrink-0 p-1 rounded-md transition-all cursor-pointer ${enabled ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground bg-muted/20"}`}
      >
        {enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
      </button>
    </div>
  )
}

function SliderField({ label, value, min, max, step, unit, minLabel, maxLabel, onChange }: SliderFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-mono text-muted-foreground">{label}</label>
        <span className="text-[10px] font-mono text-foreground font-bold">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary h-2 bg-secondary rounded-sm appearance-none cursor-pointer"
      />
      <div className="flex items-center justify-between text-[8px] font-mono text-muted-foreground/50">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ScriptControlTab() {
  const [activeTab, setActiveTab] = useState<ScriptTab>("combat")
  const [selectedInstance, setSelectedInstance] = useState("all")
  const [showInstancePicker, setShowInstancePicker] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pushed, setPushed] = useState(false)

  // ─── Combat State ───
  const [aimbotActive, setAimbotActive] = useState(false)
  const [silentAim, setSilentAim] = useState(false)
  const [drawFov, setDrawFov] = useState(true)
  const [fovRadius, setFovRadius] = useState(140)
  const [aimSmoothness, setAimSmoothness] = useState(4)
  const [aimTarget, setAimTarget] = useState("Head")

  // ─── Visuals State ───
  const [boxEsp, setBoxEsp] = useState(true)
  const [tracers, setTracers] = useState(true)
  const [showNames, setShowNames] = useState(true)
  const [healthbars, setHealthbars] = useState(true)
  const [maxDistance, setMaxDistance] = useState(300)

  // ─── Player Mods State ───
  const [walkSpeed, setWalkSpeed] = useState(16)
  const [jumpPower, setJumpPower] = useState(50)
  const [gravity, setGravity] = useState(196)
  const [infJump, setInfJump] = useState(false)
  const [noclip, setNoclip] = useState(false)
  const [flightMode, setFlightMode] = useState(false)

  const onlineBots = MOCK_INSTANCES.filter((b) => b.status === "online")

  const handlePush = useCallback(() => {
    setPushed(true)
    setTimeout(() => setPushed(false), 2000)
  }, [])

  const handleSave = useCallback(() => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  const handleReset = useCallback(() => {
    setAimbotActive(false)
    setSilentAim(false)
    setDrawFov(true)
    setFovRadius(140)
    setAimSmoothness(4)
    setAimTarget("Head")
    setBoxEsp(true)
    setTracers(true)
    setShowNames(true)
    setHealthbars(true)
    setMaxDistance(300)
    setWalkSpeed(16)
    setJumpPower(50)
    setGravity(196)
    setInfJump(false)
    setNoclip(false)
    setFlightMode(false)
  }, [])

  const getInstanceLabel = () => {
    if (selectedInstance === "all") return `All Online (${onlineBots.length})`
    const bot = MOCK_INSTANCES.find((b) => b.id === selectedInstance)
    return bot ? bot.username : "Select Instance"
  }

  const TABS: { id: ScriptTab; label: string; icon: typeof Target }[] = [
    { id: "combat", label: "Combat", icon: Target },
    { id: "visuals", label: "Visuals", icon: Eye },
    { id: "player", label: "Player Mods", icon: Sliders },
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Script Control</h2>
        <p className="text-[11px] text-muted-foreground">Remote-control in-game script settings - Combat, Visuals, and Player Mods.</p>
      </div>

      {/* Toolbar */}
      <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-2 flex-wrap">
        {/* Instance Picker */}
        <div className="relative">
          <button
            onClick={() => setShowInstancePicker(!showInstancePicker)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-muted/40 text-[10px] font-mono hover:bg-muted/60 transition-all cursor-pointer"
          >
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-foreground font-medium">{getInstanceLabel()}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {showInstancePicker && (
            <div className="absolute z-50 top-full mt-1 left-0 w-56 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
              <button
                onClick={() => { setSelectedInstance("all"); setShowInstancePicker(false) }}
                className={`w-full px-3 py-2 text-[10px] font-mono text-left hover:bg-muted/30 cursor-pointer border-b border-border/30 ${selectedInstance === "all" ? "text-primary font-bold" : "text-foreground"}`}
              >
                All Online ({onlineBots.length})
              </button>
              {onlineBots.map((bot) => (
                <button
                  key={bot.id}
                  onClick={() => { setSelectedInstance(bot.id); setShowInstancePicker(false) }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono hover:bg-muted/30 cursor-pointer border-b border-border/30 last:border-0 ${selectedInstance === bot.id ? "text-primary font-bold" : "text-foreground"}`}
                >
                  <span className="truncate">{bot.username}</span>
                  <span className="text-muted-foreground text-[9px]">{bot.game}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Injection Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 select-none">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-emerald-500">Script Injected</span>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Tab Switcher */}
        {TABS.map((tab) => {
          const TabIcon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/20"
              }`}
            >
              <TabIcon className="h-3 w-3" />
              {tab.label}
            </button>
          )
        })}

        {/* Actions - pushed right */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handlePush}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[10px] font-mono font-bold hover:opacity-90 transition-all cursor-pointer"
          >
            {pushed ? <><Check className="h-3 w-3" /> Pushed</> : <><Send className="h-3 w-3" /> Push Config</>}
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card text-[10px] font-mono text-foreground hover:bg-muted/40 transition-all cursor-pointer">
            {saved ? <><Check className="h-3 w-3 text-emerald-500" /> Saved</> : <><Save className="h-3 w-3" /> Save</>}
          </button>
          <button onClick={handleReset} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card text-[10px] font-mono text-muted-foreground hover:bg-muted/40 transition-all cursor-pointer">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
      </div>

      {/* ─── COMBAT TAB ─── */}
      {activeTab === "combat" && (
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Toggles Card */}
          <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Combat Systems</h3>
              <Target className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <div className="space-y-3">
              <ToggleField
                label="Aimbot Override"
                desc="Auto-align crosshair viewport onto target models"
                enabled={aimbotActive}
                onToggle={() => setAimbotActive(!aimbotActive)}
              />
              <div className="border-t border-border/40" />
              <ToggleField
                label="Silent Aim System"
                desc="Redefine target orientation vectors for server bypass"
                enabled={silentAim}
                onToggle={() => setSilentAim(!silentAim)}
              />
              <div className="border-t border-border/40" />
              <ToggleField
                label="Draw FOV Circle"
                desc="Render target acquisition boundaries on HUD viewport"
                enabled={drawFov}
                onToggle={() => setDrawFov(!drawFov)}
              />
            </div>
          </div>

          {/* Sliders + Target Card */}
          <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Targeting Parameters</h3>
              <Crosshair className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <div className="space-y-4">
              <SliderField
                label="FOV Radius"
                value={fovRadius}
                min={50}
                max={300}
                step={5}
                unit="px"
                minLabel="50px (Tight)"
                maxLabel="300px (Wide)"
                onChange={setFovRadius}
              />
              <SliderField
                label="Aim Smoothness"
                value={aimSmoothness}
                min={1}
                max={10}
                step={1}
                unit=""
                minLabel="1 (Instant)"
                maxLabel="10 (Ultra-Smooth)"
                onChange={setAimSmoothness}
              />
              <div className="border-t border-border/40 pt-3">
                <label className="text-[10px] font-mono text-muted-foreground mb-2 block">Locked Hitbox Target</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Head", "Torso", "Random"].map((part) => (
                    <button
                      key={part}
                      onClick={() => setAimTarget(part)}
                      className={`py-2 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                        aimTarget === part
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {part.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── VISUALS TAB ─── */}
      {activeTab === "visuals" && (
        <div className="grid gap-3 lg:grid-cols-2">
          {/* ESP Toggles Card */}
          <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">ESP Overlays</h3>
              <Scan className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <div className="space-y-3">
              <ToggleField
                label="Bounding Box ESP"
                desc="Draw 2D neon borders around player meshes"
                enabled={boxEsp}
                onToggle={() => setBoxEsp(!boxEsp)}
              />
              <div className="border-t border-border/40" />
              <ToggleField
                label="Tracer Lines"
                desc="Project tracking lines from bottom-center to target"
                enabled={tracers}
                onToggle={() => setTracers(!tracers)}
              />
              <div className="border-t border-border/40" />
              <ToggleField
                label="Player Names"
                desc="Show username, distance, and health indicators"
                enabled={showNames}
                onToggle={() => setShowNames(!showNames)}
              />
              <div className="border-t border-border/40" />
              <ToggleField
                label="Healthbar Indicator"
                desc="Render health bars relative to max HP"
                enabled={healthbars}
                onToggle={() => setHealthbars(!healthbars)}
              />
            </div>
          </div>

          {/* Render Distance + Info */}
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Render Settings</h3>
                <Eye className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <SliderField
                label="Max ESP Draw Distance"
                value={maxDistance}
                min={50}
                max={1000}
                step={10}
                unit=" studs"
                minLabel="50m (Close)"
                maxLabel="1000m (Map-Wide)"
                onChange={setMaxDistance}
              />
            </div>

            {/* Active ESP Summary */}
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Active Modules</h3>
                <Shield className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Box ESP", active: boxEsp },
                  { label: "Tracers", active: tracers },
                  { label: "Names", active: showNames },
                  { label: "Healthbars", active: healthbars },
                ].map((mod) => (
                  <div
                    key={mod.label}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-[10px] font-mono ${
                      mod.active
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
                        : "bg-muted/20 border-border text-muted-foreground"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${mod.active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                    <span className="font-bold">{mod.label}</span>
                    <span className="ml-auto text-[9px]">{mod.active ? "ON" : "OFF"}</span>
                  </div>
                ))}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground/50 flex items-center gap-1.5 pt-1 border-t border-border/40">
                <span>Render distance: <span className="text-foreground font-bold">{maxDistance}</span> studs</span>
                <span className="text-muted-foreground/30">•</span>
                <span>Bypasses anti-ESP occlusion maps in real-time</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PLAYER MODS TAB ─── */}
      {activeTab === "player" && (
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Sliders Card */}
          <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Humanoid Overrides</h3>
              <Footprints className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <div className="space-y-4">
              <SliderField
                label="WalkSpeed Override"
                value={walkSpeed}
                min={16}
                max={250}
                step={1}
                unit=" studs/s"
                minLabel="16 (Normal)"
                maxLabel="250 (Max Speed)"
                onChange={setWalkSpeed}
              />
              <SliderField
                label="JumpPower Override"
                value={jumpPower}
                min={50}
                max={300}
                step={5}
                unit=" studs/s"
                minLabel="50 (Normal)"
                maxLabel="300 (High Jump)"
                onChange={setJumpPower}
              />
              <SliderField
                label="Workspace Gravity"
                value={gravity}
                min={0}
                max={196}
                step={1}
                unit=" studs/s²"
                minLabel="0 (Zero G)"
                maxLabel="196 (Normal)"
                onChange={setGravity}
              />
            </div>
          </div>

          {/* Toggles Card */}
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Movement Hacks</h3>
                <Move3d className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <div className="space-y-3">
                <ToggleField
                  label="Infinite Jump"
                  desc="Override vertical jump restrictions"
                  enabled={infJump}
                  onToggle={() => setInfJump(!infJump)}
                />
                <div className="border-t border-border/40" />
                <ToggleField
                  label="Collision NoClip"
                  desc="Bypass boundary calculations in physical space"
                  enabled={noclip}
                  onToggle={() => setNoclip(!noclip)}
                />
                <div className="border-t border-border/40" />
                <ToggleField
                  label="Vector Fly Mode"
                  desc="3D directional key controls for flight path"
                  enabled={flightMode}
                  onToggle={() => setFlightMode(!flightMode)}
                />
              </div>
            </div>

            {/* Active Config Summary */}
            <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Current Config</h3>
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Speed", value: `${walkSpeed}`, unit: "st/s", warn: walkSpeed > 100 },
                  { label: "Jump", value: `${jumpPower}`, unit: "st/s", warn: jumpPower > 150 },
                  { label: "Gravity", value: `${gravity}`, unit: "st/s²", warn: gravity < 50 },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col gap-1 px-2.5 py-2 rounded-md border border-border bg-muted/20">
                    <span className="text-[9px] font-mono text-muted-foreground uppercase">{stat.label}</span>
                    <span className={`text-sm font-mono font-black ${stat.warn ? "text-amber-500" : "text-foreground"}`}>
                      {stat.value}
                    </span>
                    <span className="text-[8px] font-mono text-muted-foreground/50">{stat.unit}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: "Inf Jump", active: infJump },
                  { label: "NoClip", active: noclip },
                  { label: "Flight", active: flightMode },
                ].map((mod) => (
                  <span
                    key={mod.label}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-mono font-bold border ${
                      mod.active
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500"
                        : "bg-muted/20 border-border text-muted-foreground/50"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${mod.active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                    {mod.label}: {mod.active ? "ON" : "OFF"}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
