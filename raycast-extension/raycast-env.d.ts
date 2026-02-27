/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `quick-add` command */
  export type QuickAdd = ExtensionPreferences & {}
  /** Preferences accessible in the `monthly-calendar` command */
  export type MonthlyCalendar = ExtensionPreferences & {}
  /** Preferences accessible in the `export-pdf` command */
  export type ExportPdf = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `quick-add` command */
  export type QuickAdd = {}
  /** Arguments passed to the `monthly-calendar` command */
  export type MonthlyCalendar = {}
  /** Arguments passed to the `export-pdf` command */
  export type ExportPdf = {}
}

