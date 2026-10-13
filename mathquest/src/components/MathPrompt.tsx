import type { VisibleQuestion } from '../app/types'
export function MathPrompt({ question }: { question: VisibleQuestion }) {
  return (
    <>
      {question.promptParts.map((part, index) =>
        part.kind === 'text' ? (
          <span key={index}>{part.text}</span>
        ) : (
          <span
            key={index}
            className="fraction"
            role="img"
            aria-label={part.spoken}
          >
            <span aria-hidden="true">{part.numerator}</span>
            <span aria-hidden="true">{part.denominator}</span>
          </span>
        ),
      )}
    </>
  )
}
