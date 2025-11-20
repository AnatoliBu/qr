/**
 * Design Templates System
 * Allows users to save and load QR code style presets
 */

export interface DesignTemplate {
  id: string;
  name: string;
  style: any; // StyleOptions from GeneratorNew
  createdAt: number;
}

const STORAGE_KEY = 'qr-design-templates';

/**
 * Get all saved templates
 */
export function getTemplates(): DesignTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save a new template
 */
export function saveTemplate(name: string, style: any): DesignTemplate {
  const template: DesignTemplate = {
    id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    style,
    createdAt: Date.now()
  };

  const templates = getTemplates();
  templates.push(template);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  }

  return template;
}

/**
 * Delete a template by ID
 */
export function deleteTemplate(id: string): void {
  const templates = getTemplates().filter(t => t.id !== id);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  }
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): DesignTemplate | null {
  const templates = getTemplates();
  return templates.find(t => t.id === id) || null;
}

/**
 * Predefined templates that come with the app
 */
export const PREDEFINED_TEMPLATES: Omit<DesignTemplate, 'id' | 'createdAt'>[] = [
  {
    name: "Классика",
    style: {
      foreground: "#000000",
      background: "#ffffff",
      dotStyle: "square",
      eyeOuter: "square",
      eyeInner: "square",
      animation: "none",
      frame: "none",
      useDotsGradient: false,
      useBackgroundGradient: false,
      useCornersGradient: false
    }
  },
  {
    name: "Современный синий",
    style: {
      foreground: "#667eea",
      background: "#f0f4ff",
      dotStyle: "rounded",
      eyeOuter: "extra-rounded",
      eyeInner: "dot",
      animation: "pulse",
      frame: "modern",
      useDotsGradient: true,
      dotsGradient: {
        type: "linear",
        rotation: 0.785,
        colorStops: [
          { offset: 0, color: "#667eea" },
          { offset: 1, color: "#764ba2" }
        ]
      },
      useBackgroundGradient: false,
      useCornersGradient: false
    }
  },
  {
    name: "Неоновый стиль",
    style: {
      foreground: "#667eea",
      background: "#0a0e27",
      dotStyle: "dots",
      eyeOuter: "dot",
      eyeInner: "dot",
      animation: "glow",
      frame: "neon",
      useDotsGradient: false,
      useBackgroundGradient: false,
      useCornersGradient: false
    }
  },
  {
    name: "Природа",
    style: {
      foreground: "#2d5016",
      background: "#f5f1e8",
      dotStyle: "extra-rounded",
      eyeOuter: "extra-rounded",
      eyeInner: "dot",
      animation: "float",
      frame: "minimal",
      useDotsGradient: true,
      dotsGradient: {
        type: "linear",
        rotation: 1.571,
        colorStops: [
          { offset: 0, color: "#2d5016" },
          { offset: 1, color: "#4ade80" }
        ]
      },
      useBackgroundGradient: false,
      useCornersGradient: false
    }
  },
  {
    name: "Закат",
    style: {
      foreground: "#ff6b35",
      background: "#ffe5d9",
      dotStyle: "classy-rounded",
      eyeOuter: "extra-rounded",
      eyeInner: "dot",
      animation: "heartbeat",
      frame: "sticker",
      useDotsGradient: true,
      dotsGradient: {
        type: "radial",
        rotation: 0,
        colorStops: [
          { offset: 0, color: "#ff6b35" },
          { offset: 1, color: "#f7b801" }
        ]
      },
      useBackgroundGradient: true,
      backgroundGradient: {
        type: "linear",
        rotation: 2.356,
        colorStops: [
          { offset: 0, color: "#ffe5d9" },
          { offset: 1, color: "#fff5e1" }
        ]
      },
      useCornersGradient: false
    }
  },
  {
    name: "Премиум золото",
    style: {
      foreground: "#d97706",
      background: "#fffbeb",
      dotStyle: "extra-rounded",
      eyeOuter: "extra-rounded",
      eyeInner: "dot",
      animation: "zoom",
      frame: "premium",
      useDotsGradient: true,
      dotsGradient: {
        type: "linear",
        rotation: 0.785,
        colorStops: [
          { offset: 0, color: "#f59e0b" },
          { offset: 1, color: "#d97706" }
        ]
      },
      useBackgroundGradient: true,
      backgroundGradient: {
        type: "radial",
        rotation: 0,
        colorStops: [
          { offset: 0, color: "#fffbeb" },
          { offset: 1, color: "#fef3c7" }
        ]
      },
      useCornersGradient: true,
      cornersGradient: {
        type: "linear",
        rotation: 0.785,
        colorStops: [
          { offset: 0, color: "#f59e0b" },
          { offset: 1, color: "#d97706" }
        ]
      }
    }
  }
];
