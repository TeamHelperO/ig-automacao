export function SignalMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* balão de comentário */}
      <path
        d="M6 9C6 7.34315 7.34315 6 9 6H23C24.6569 6 26 7.34315 26 9V18C26 19.6569 24.6569 21 23 21H14L8 26V21H9C7.34315 21 6 19.6569 6 18V9Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* seta de transformação */}
      <path
        d="M22 24L34 24"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M29 19L34 24L29 29"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      {/* ponto de sinal */}
      <circle cx="30" cy="10" r="4" className="fill-current" />
    </svg>
  );
}
