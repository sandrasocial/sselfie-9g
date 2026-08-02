"use client"

import Image from "next/image"
import type { FormEvent } from "react"

const VAULT_MAYA_SUCCESS_IMAGE =
  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/content-kit/shoots/1785423447575-876892.png"

type VaultMayaSuccessProps = {
  email: string
  mode: "setup" | "ready"
  name?: string
  password?: string
  confirmPassword?: string
  error?: string
  isSubmitting?: boolean
  primaryLabel?: string
  showNameField?: boolean
  onNameChange?: (value: string) => void
  onPasswordChange?: (value: string) => void
  onConfirmPasswordChange?: (value: string) => void
  onSetupSubmit?: (event: FormEvent<HTMLFormElement>) => void
  onPrimaryAction?: () => void
}

function VaultMayaVisual() {
  return (
    <div className="relative min-h-[38svh] overflow-hidden lg:min-h-screen">
      <Image
        src={VAULT_MAYA_SUCCESS_IMAGE}
        alt="Golden-hour balcony portrait ready to create inside Vault Maya"
        fill
        sizes="(max-width: 1023px) 100vw, 48vw"
        className="object-cover object-[50%_24%]"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/5" />
      <p className="absolute bottom-5 left-5 right-5 text-[10px] uppercase tracking-[0.18em] text-white/85 sm:bottom-7 sm:left-7">
        A look ready to create inside Vault Maya
      </p>
    </div>
  )
}

function VaultMayaMembershipNote() {
  return (
    <p className="mt-7 border-t border-neutral-200 pt-5 text-xs leading-6 text-neutral-500">
      30 photo creations each month · New drops every Monday · Manage or cancel from Account &amp;
      billing
    </p>
  )
}

export function VaultMayaSuccess({
  email,
  mode,
  name = "",
  password = "",
  confirmPassword = "",
  error = "",
  isSubmitting = false,
  primaryLabel = "Create my first photo",
  showNameField = true,
  onNameChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSetupSubmit,
  onPrimaryAction,
}: VaultMayaSuccessProps) {
  const isSetup = mode === "setup"

  return (
    <main className="min-h-screen bg-[#F8FAFA] text-neutral-950">
      <section className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[0.92fr_1.08fr]">
        <div className="order-2 lg:order-1">
          <VaultMayaVisual />
        </div>

        <div className="order-1 flex items-center px-5 py-12 sm:px-10 sm:py-16 lg:order-2 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-[520px]">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
              Vault Maya
            </p>
            <h1 className="mt-4 max-w-[11ch] font-serif text-[clamp(2.8rem,5.2vw,5.7rem)] font-light leading-[0.92] tracking-[-0.035em]">
              Your membership is ready.
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-7 text-neutral-600 sm:text-base">
              {isSetup
                ? "Create your password, then you can make your first photo."
                : "Start with one clear selfie. Choose the photo you want, and Maya will create it for you."}
            </p>

            {isSetup ? (
              <form className="mt-9 space-y-5" onSubmit={onSetupSubmit}>
                {showNameField ? (
                  <div>
                    <label
                      htmlFor="vault-maya-success-name"
                      className="mb-2 block text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-600"
                    >
                      Your name
                    </label>
                    <input
                      id="vault-maya-success-name"
                      type="text"
                      value={name}
                      onChange={(event) => onNameChange?.(event.target.value)}
                      required
                      autoComplete="name"
                      placeholder="What should I call you?"
                      className="min-h-12 w-full rounded-sm border border-neutral-300 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950"
                    />
                  </div>
                ) : null}

                <div>
                  <label
                    htmlFor="vault-maya-success-email"
                    className="mb-2 block text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-600"
                  >
                    Email
                  </label>
                  <input
                    id="vault-maya-success-email"
                    type="email"
                    value={email}
                    disabled
                    className="min-h-12 w-full rounded-sm border border-neutral-200 bg-neutral-100 px-4 text-base text-neutral-500"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="vault-maya-success-password"
                      className="mb-2 block text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-600"
                    >
                      Choose password
                    </label>
                    <input
                      id="vault-maya-success-password"
                      type="password"
                      value={password}
                      onChange={(event) => onPasswordChange?.(event.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="min-h-12 w-full rounded-sm border border-neutral-300 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="vault-maya-success-confirm-password"
                      className="mb-2 block text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-600"
                    >
                      Confirm password
                    </label>
                    <input
                      id="vault-maya-success-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => onConfirmPasswordChange?.(event.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="One more time"
                      className="min-h-12 w-full rounded-sm border border-neutral-300 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-1 focus:ring-neutral-950"
                    />
                  </div>
                </div>

                {error ? (
                  <p role="alert" className="border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-700">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-sm bg-neutral-950 px-7 text-xs font-medium uppercase tracking-[0.16em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Opening Vault Maya..." : "Create password and open Vault Maya"}
                </button>
                <p className="text-center text-[11px] leading-5 text-neutral-500">
                  By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            ) : (
              <button
                type="button"
                onClick={onPrimaryAction}
                className="mt-9 inline-flex min-h-12 w-full items-center justify-center rounded-sm bg-neutral-950 px-7 text-xs font-medium uppercase tracking-[0.16em] text-white transition hover:bg-neutral-800 sm:w-auto"
              >
                {primaryLabel}
              </button>
            )}

            <p className="mt-5 text-xs leading-6 text-neutral-500">
              Your receipt and welcome email have been sent to <span className="text-neutral-700">{email}</span>.
              Keep the email so you can find Vault Maya again anytime.
            </p>
            <VaultMayaMembershipNote />
          </div>
        </div>
      </section>
    </main>
  )
}
