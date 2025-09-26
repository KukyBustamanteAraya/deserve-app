// src/lib/i18n/auth.ts

export const authStrings = {
  en: {
    // Onboarding set password
    create_title: "Create your password",
    create_subtitle: "You signed in with a magic link—now choose a password so you can log in either way.",

    // Password reset
    reset_title: "Set a new password",
    reset_subtitle: "You're resetting your password for security.",

    // Common fields & labels
    requirements_hint: "Use at least 8 characters. For a stronger password, include letters, numbers, and symbols.",
    show: "Show",
    hide: "Hide",

    // Strength meter
    strength_labels: {
      0: "Weak",
      1: "Weak",
      2: "Okay",
      3: "Strong",
      4: "Very Strong"
    },

    // Tips & guidance
    tip_weaker: "Try a longer passphrase—three or more random words work great.",
    passwords_mismatch: "Passwords don't match.",

    // Actions
    cta_save: "Save password",
    cta_update: "Update password",
    footnote_magic_ok: "You can still use magic links anytime.",

    // Labels
    label_new_password: "New password",
    label_confirm_password: "Confirm password",

    // Resend & error recovery
    resend_cta: "Resend link",
    resend_banner_neutral: "If an account exists for that email, we've sent a new link.",
    tip_same_device: "Open the email link on the same device/browser you used to request it.",
    error_link_invalid: "Link expired or already used. Request a new link.",
    login_with_password: "Sign in with password",
    login_with_magic: "Sign in with magic link"
  },

  // TODO: Add Spanish translations
  es: {
    create_title: "TODO",
    create_subtitle: "TODO",
    reset_title: "TODO",
    reset_subtitle: "TODO",
    requirements_hint: "TODO",
    show: "TODO",
    hide: "TODO",
    strength_labels: {
      0: "TODO",
      1: "TODO",
      2: "TODO",
      3: "TODO",
      4: "TODO"
    },
    tip_weaker: "TODO",
    passwords_mismatch: "TODO",
    cta_save: "TODO",
    cta_update: "TODO",
    footnote_magic_ok: "TODO",
    label_new_password: "TODO",
    label_confirm_password: "TODO",
    resend_cta: "TODO",
    resend_banner_neutral: "TODO",
    tip_same_device: "TODO",
    error_link_invalid: "TODO",
    login_with_password: "TODO",
    login_with_magic: "TODO"
  },

  // TODO: Add Portuguese translations
  pt: {
    create_title: "TODO",
    create_subtitle: "TODO",
    reset_title: "TODO",
    reset_subtitle: "TODO",
    requirements_hint: "TODO",
    show: "TODO",
    hide: "TODO",
    strength_labels: {
      0: "TODO",
      1: "TODO",
      2: "TODO",
      3: "TODO",
      4: "TODO"
    },
    tip_weaker: "TODO",
    passwords_mismatch: "TODO",
    cta_save: "TODO",
    cta_update: "TODO",
    footnote_magic_ok: "TODO",
    label_new_password: "TODO",
    label_confirm_password: "TODO",
    resend_cta: "TODO",
    resend_banner_neutral: "TODO",
    tip_same_device: "TODO",
    error_link_invalid: "TODO",
    login_with_password: "TODO",
    login_with_magic: "TODO"
  }
};

export type AuthStrings = typeof authStrings.en;
export type SupportedLocale = keyof typeof authStrings;

// Simple locale detection/fallback
export function getAuthStrings(locale: string = 'en'): AuthStrings {
  const normalizedLocale = locale.toLowerCase().split('-')[0] as SupportedLocale;
  return authStrings[normalizedLocale] || authStrings.en;
}