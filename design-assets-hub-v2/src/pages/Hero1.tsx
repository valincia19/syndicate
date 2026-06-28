import { useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, Palette } from "lucide-react"

export default function Hero1() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] p-6">
      {/* Back button */}
      <div className="fixed left-6 top-6">
        <button
          onClick={() => navigate("/")}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-black/5 hover:text-black"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      </div>

      {/* Modern card */}
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* Icon */}
        <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-gray-100">
          <Palette className="size-5 text-black" />
        </div>

        {/* Typography */}
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-black">
          Hero Section 1
        </h1>
        <p className="mb-7 leading-relaxed text-gray-500">
          Modern hero section with animated elements and call-to-action buttons.
        </p>

        {/* CTA Button */}
        <button
          onClick={() => navigate("/hero-1")}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-black/85 active:translate-y-px"
        >
          Explore
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
