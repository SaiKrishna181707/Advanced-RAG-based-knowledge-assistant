export default function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-7 h-7 rounded-lg bg-accent-purpleDim border border-accent-purple/30 flex-shrink-0
                      flex items-center justify-center">
        <span className="text-xs font-bold text-accent-purpleLight">AI</span>
      </div>
      <div className="bg-bg-card border border-bg-border rounded-2xl rounded-tl-sm px-5 py-4">
        <div className="flex gap-1.5 items-center h-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse-soft"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
