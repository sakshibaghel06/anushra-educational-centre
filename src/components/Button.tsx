import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { Link } from "react-router";

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: "primary" | "secondary" | "light";
};

type RouterButtonProps = {
  children: React.ReactNode;
  className?: string;
  to: string;
  variant?: "primary" | "secondary" | "light";
};

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "light";
};

const buttonClass = (variant: LinkButtonProps["variant"] = "primary") =>
  `button button--${variant}`;

export function ActionButton({
  children,
  className = "",
  variant = "primary",
  ...props
}: ActionButtonProps) {
  return (
    <button className={`${buttonClass(variant)} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  className = "",
  href,
  variant = "primary",
  ...props
}: LinkButtonProps) {
  return (
    <a
      className={`${buttonClass(variant)} ${className}`.trim()}
      href={href}
      {...props}
    >
      {children}
    </a>
  );
}

export function RouterButton({
  children,
  className = "",
  to,
  variant = "primary",
}: RouterButtonProps) {
  return (
    <Link className={`${buttonClass(variant)} ${className}`.trim()} to={to}>
      {children}
    </Link>
  );
}
