import * as React from "react"

export function VSLogo({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="VALINC SYNDICATE"
      {...props}
    >
      {/* Left V arm: 2 blocks cascading down-right */}
      <polygon points="1,0.5 6.5,0.5 9,6 3.5,6" fill="currentColor" />
      <polygon points="3.5,7.5 9,7.5 11.5,13 6,13" fill="currentColor" />
      {/* Right V arm: 2 blocks cascading down-left */}
      <polygon points="17.5,0.5 23,0.5 20.5,6 15,6" fill="currentColor" />
      <polygon points="15,7.5 20.5,7.5 18,13 12.5,13" fill="currentColor" />
    </svg>
  )
}
