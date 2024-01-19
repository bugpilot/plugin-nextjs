export function Button({
  id,
  children,
  onClick,
  style,
  className,
  size,
  type = "button",
  variant = "default",
}: {
  id?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  size?: "icon" | "sm";
  type?: "button" | "submit";
  variant?: "default";
}) {
  const getStyles = () => {
    let styles = {};

    if (size === "icon") {
      styles = {
        background: "none",
        ...styles,
      };
    }
    if (size === "sm") {
      styles = {
        padding: "0.25rem 0.5rem",
        fontSize: "0.875rem",
        lineHeight: "1.25rem",
        ...styles,
      };
    }

    if (variant === "default") {
      styles = {
        background: "#111",
        color: "#fff",
        ...styles,
      };
    }

    return styles;
  };

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.5rem 1rem",
        borderRadius: "0.375rem",
        background: "red",
        fontSize: "1rem",
        lineHeight: "1.5rem",
        fontWeight: "500",
        ...getStyles(),
        ...style,
      }}
    >
      {children}
    </button>
  );
}
