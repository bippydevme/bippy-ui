import type { ReactElement, ReactNode } from "react";

function Icon({ children }: { children: ReactNode }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function ChevronLeftIcon(): ReactElement {
  return (
    <Icon>
      <path
        d="M14.5 5.5 8 12l6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

export function ChevronRightIcon(): ReactElement {
  return (
    <Icon>
      <path
        d="M9.5 5.5 16 12l-6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

export function FitScreenIcon(): ReactElement {
  return (
    <Icon>
      <path
        d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

export function ShareIcon(): ReactElement {
  return (
    <Icon>
      <circle cx="18" cy="5" r="2.2" fill="currentColor" />
      <circle cx="6" cy="12" r="2.2" fill="currentColor" />
      <circle cx="18" cy="19" r="2.2" fill="currentColor" />
      <path
        d="M8 12.8 16 18.2M8 11.2 16 5.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
    </Icon>
  );
}

export function DownloadIcon(): ReactElement {
  return (
    <Icon>
      <path
        d="M12 4v11M7.5 11.5 12 16l4.5-4.5M5 19.5h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}
