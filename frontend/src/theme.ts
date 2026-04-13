import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineRecipe,
} from "@chakra-ui/react"

const buttonRecipe = defineRecipe({
  base: {
    borderRadius: "button",
    fontWeight: "semibold",
    transitionProperty: "common",
    transitionDuration: "normal",
    _focusVisible: {
      boxShadow: "0 0 0 3px var(--chakra-colors-brand-focusRing)",
    },
  },
  variants: {
    variant: {
      solid: {
        bg: "brand.solid",
        color: "brand.contrast",
        _hover: { bg: "brand.emphasized" },
        _active: { bg: "brand.emphasized" },
      },
      outline: {
        borderWidth: "1px",
        borderColor: "border.default",
        color: "brand.fg",
        bg: "transparent",
        _hover: { bg: "brand.subtle" },
        _active: { bg: "brand.muted" },
      },
      ghost: {
        color: "brand.fg",
        bg: "transparent",
        _hover: { bg: "brand.subtle" },
        _active: { bg: "brand.muted" },
      },
    },
  },
  defaultVariants: {
    variant: "solid",
  },
})

const inputRecipe = defineRecipe({
  base: {
    borderRadius: "button",
    bg: "bg.surface",
    borderWidth: "1px",
    borderColor: "border.default",
    _hover: {
      borderColor: "border.muted",
    },
    _focusVisible: {
      borderColor: "brand.focusRing",
      boxShadow: "0 0 0 3px var(--chakra-colors-brand-focusRing)",
    },
  },
})

const badgeRecipe = defineRecipe({
  base: {
    borderRadius: "pill",
    fontWeight: "medium",
  },
  variants: {
    variant: {
      solid: {
        bg: "brand.solid",
        color: "brand.contrast",
      },
      subtle: {
        bg: "brand.subtle",
        color: "brand.fg",
      },
      outline: {
        borderWidth: "1px",
        borderColor: "brand.muted",
        color: "brand.fg",
      },
    },
  },
  defaultVariants: {
    variant: "subtle",
  },
})

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#eef1ff" },
          100: { value: "#dce2ff" },
          200: { value: "#c1ccff" },
          300: { value: "#9aa9ff" },
          400: { value: "#7385ff" },
          500: { value: "#4255ff" },
          600: { value: "#3044e6" },
          700: { value: "#2535b4" },
          800: { value: "#1b2884" },
          900: { value: "#131d5d" },
          950: { value: "#0b1033" },
        },
        accent: {
          50: { value: "#e6f7f3" },
          100: { value: "#c2ebe2" },
          200: { value: "#95ddd0" },
          300: { value: "#66cfbd" },
          400: { value: "#3cc2ac" },
          500: { value: "#0f9d86" },
          600: { value: "#0d876f" },
          700: { value: "#0b6a58" },
          800: { value: "#084f42" },
          900: { value: "#05372d" },
          950: { value: "#02211a" },
        },
        neutral: {
          50: { value: "#f5f5fc" },
          100: { value: "#eeeef9" },
          200: { value: "#d9daf0" },
          300: { value: "#b8bae2" },
          400: { value: "#9296d0" },
          500: { value: "#6b6fb8" },
          600: { value: "#5557a0" },
          700: { value: "#40427e" },
          800: { value: "#2e305b" },
          900: { value: "#1d1e3c" },
          950: { value: "#0f1020" },
        },
        danger: {
          50: { value: "#fff0f1" },
          100: { value: "#ffd9dc" },
          200: { value: "#ffb3b8" },
          300: { value: "#ff8a92" },
          400: { value: "#ff5f6a" },
          500: { value: "#eb3b4a" },
          600: { value: "#cd2f3e" },
          700: { value: "#a82431" },
          800: { value: "#7f1b25" },
          900: { value: "#591219" },
          950: { value: "#33090d" },
        },
      },
      fonts: {
        heading: {
          value:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        body: {
          value:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
      },
      radii: {
        card: { value: "12px" },
        button: { value: "8px" },
        modal: { value: "16px" },
        pill: { value: "9999px" },
      },
      shadows: {
        card: {
          default: {
            value: {
              _light: "0 2px 8px rgba(40, 42, 120, 0.08)",
              _dark: "0 2px 8px rgba(0, 0, 0, 0.40)",
            },
          },
          hover: {
            value: {
              _light: "0 8px 24px rgba(40, 42, 120, 0.14)",
              _dark: "0 8px 24px rgba(0, 0, 0, 0.56)",
            },
          },
        },
        modal: {
          value: {
            _light: "0 16px 40px rgba(40, 42, 120, 0.18)",
            _dark: "0 16px 40px rgba(0, 0, 0, 0.64)",
          },
        },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          app: {
            value: {
              _light: "{colors.neutral.50}",
              _dark: "{colors.neutral.950}",
            },
          },
          surface: {
            value: {
              _light: "white",
              _dark: "{colors.neutral.900}",
            },
          },
          muted: {
            value: {
              _light: "{colors.neutral.200}",
              _dark: "{colors.neutral.800}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.neutral.50}",
              _dark: "{colors.neutral.900}",
            },
          },
        },
        fg: {
          default: {
            value: {
              _light: "{colors.neutral.900}",
              _dark: "{colors.neutral.50}",
            },
          },
          muted: {
            value: {
              _light: "{colors.neutral.700}",
              _dark: "{colors.neutral.300}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.neutral.600}",
              _dark: "{colors.neutral.400}",
            },
          },
        },
        border: {
          default: {
            value: {
              _light: "{colors.neutral.300}",
              _dark: "{colors.neutral.700}",
            },
          },
          muted: {
            value: {
              _light: "{colors.neutral.200}",
              _dark: "{colors.neutral.800}",
            },
          },
        },
        brand: {
          solid: {
            value: {
              _light: "{colors.brand.500}",
              _dark: "{colors.brand.400}",
            },
          },
          contrast: {
            value: {
              _light: "white",
              _dark: "{colors.neutral.950}",
            },
          },
          fg: {
            value: {
              _light: "{colors.brand.700}",
              _dark: "{colors.brand.200}",
            },
          },
          muted: {
            value: {
              _light: "{colors.brand.100}",
              _dark: "{colors.brand.800}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.brand.50}",
              _dark: "{colors.brand.900}",
            },
          },
          emphasized: {
            value: {
              _light: "{colors.brand.600}",
              _dark: "{colors.brand.300}",
            },
          },
          focusRing: {
            value: {
              _light: "{colors.brand.500}",
              _dark: "{colors.brand.300}",
            },
          },
        },
        success: {
          solid: {
            value: {
              _light: "{colors.accent.500}",
              _dark: "{colors.accent.400}",
            },
          },
          fg: {
            value: {
              _light: "{colors.accent.700}",
              _dark: "{colors.accent.200}",
            },
          },
          muted: {
            value: {
              _light: "{colors.accent.100}",
              _dark: "{colors.accent.900}",
            },
          },
        },
        danger: {
          solid: {
            value: {
              _light: "{colors.danger.500}",
              _dark: "{colors.danger.400}",
            },
          },
          fg: {
            value: {
              _light: "{colors.danger.700}",
              _dark: "{colors.danger.200}",
            },
          },
        },
      },
    },
    keyframes: {
      cardFlip: {
        "0%": { transform: "rotateY(0deg)" },
        "50%": { transform: "rotateY(90deg)" },
        "100%": { transform: "rotateY(180deg)" },
      },
    },
    recipes: {
      button: buttonRecipe,
      input: inputRecipe,
      badge: badgeRecipe,
    },
  },
})

export const system = createSystem(defaultConfig, config)
