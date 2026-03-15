# EXPORT_FLOW.md

Export Flow Guide for Scidata Manager

## Purpose

This document explains how export-related functionality should work in the app.

The project currently uses:

- ExcelJS
- Node.js filesystem APIs
- Electron main process privileges

---

## Expected Export Flow

```text
User action in renderer
    ↓
renderer triggers preload API
    ↓
preload sends IPC request
    ↓
main process performs export
    ↓
Excel file is generated
    ↓
file is written to disk