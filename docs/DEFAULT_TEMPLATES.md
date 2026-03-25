# Default Templates

Guide for the default Step 1-driven Step 2 template system in Scidata Manager.

## Introduction

This guide explains how Scidata Manager uses the Step 1 `测试项目` field to provide a default semantic context for Step 2.

The default template system is meant to help users start faster. It provides:

- recommended experimental conditions
- recommended result metrics
- recommended structured data blocks
- recommended default units
- recommended value-nature labels when relevant

These templates are recommendations only. They do not lock the record structure, and they do not replace manual judgment.

You can still:

- add custom conditions
- add custom result metrics
- add custom structured data blocks
- edit names
- edit units
- ignore the suggested template items entirely

## How Templates Work

Scidata Manager keeps the current product structure:

- Step 1: standardized first-level metadata
- Step 2: unified second-level data entry

Step 2 still uses three semantic sections:

1. Experimental Conditions
2. Result Metrics
3. Structured Data Blocks

When you choose a `测试项目` in Step 1, the app tries to match it to a default template family. That family becomes the Step 2 default context.

The active template context is used only to suggest likely starting points. It does not create a separate product mode, and it does not force a fixed set of fields.

## Default Template Overview

The first-release default template set contains 14 template families:

1. Dark current / Dark I-V
2. Responsivity / EQE / Spectral response
3. Photoconductive gain / Apparent EQE / Gain-bandwidth
4. Linearity / LDR
5. Noise
6. NEP / Detectivity
7. Speed of response
8. Stability / Reliability
9. I-V
10. Power-dependent response
11. Temperature-dependent response
12. On-Off cycling / switching stability
13. XRD
14. Material optical characterization

## Detailed Templates

### 1. Dark current / Dark I-V

Applicable scenario:
- dark-state current characterization
- dark I-V sweeps
- dark transient response

Recommended experimental conditions:
- bias voltage
- temperature
- scan mode / step-bias mode
- stabilization time
- hysteresis / transient note
- area-normalization note

Recommended result metrics:
- Idark
- jdark
- Idark drift
- stabilization time

Recommended structured data blocks:
- Dark I-V
- Dark transient

Recommended default units:
- Idark: A
- jdark: A/cm²
- bias voltage: V
- time: s

Notes:
- This template is intended for dark-state electrical behavior.
- `jdark` is typically a derived or calculated metric based on current and area normalization.

### 2. Responsivity / EQE / Spectral response

Applicable scenario:
- responsivity spectra
- EQE measurements
- spectral response characterization

Recommended experimental conditions:
- bias voltage
- temperature
- wavelength or spectral range
- incident optical power / irradiance
- reference detector
- aperture / beam coverage
- modulation frequency
- dark-current monitoring status

Recommended result metrics:
- Responsivity
- EQE
- Peak responsivity
- Peak EQE
- Peak wavelength
- Cutoff wavelength
- FWHMR
- FWHMEQE

Recommended structured data blocks:
- Responsivity spectrum
- EQE spectrum
- Reference optical power spectrum

Recommended default units:
- Responsivity: A/W
- EQE: %
- wavelength: nm
- FWHM: nm
- frequency: Hz

Notes:
- This template is suitable for standard photoresponse spectral work.
- Peak and cutoff values are usually derived from measured structured spectra.

### 3. Photoconductive gain / Apparent EQE / Gain-bandwidth

Applicable scenario:
- photoconductive gain analysis
- apparent EQE analysis
- gain-bandwidth related experiments

Recommended experimental conditions:
- bias voltage
- temperature
- wavelength
- optical power
- injecting-electrode context
- modulation mode

Recommended result metrics:
- Photoconductive gain
- Apparent EQE
- Gain-bandwidth product

Recommended structured data blocks:
- Gain vs optical power
- Gain vs frequency

Recommended default units:
- gain: dimensionless
- Apparent EQE: %
- Gain-bandwidth product: Hz

Notes:
- This template is useful when gain-related metrics need to be interpreted separately from standard EQE.
- `Apparent EQE` should be treated as an apparent label, not as the same quantity as standard EQE.

### 4. Linearity / LDR

Applicable scenario:
- linearity analysis
- LDR analysis
- power-scan response characterization

Recommended experimental conditions:
- bias voltage
- temperature
- wavelength
- optical power scan range
- linearity criterion Δ

Recommended result metrics:
- α
- linearity classification
- LDR
- LDRapp
- Δ
- Io,m
- Io,M
- Io,m,app
- Io,M,app

Recommended structured data blocks:
- Io-Pi
- Responsivity-Power

Recommended default units:
- LDR / LDRapp: dB
- α: dimensionless
- optical power: W
- current: A

Notes:
- This template separates measured and apparent variants where relevant.
- It is suitable for linear dynamic range analysis and power-dependent classification work.

### 5. Noise

Applicable scenario:
- noise spectrum analysis
- RMS noise analysis
- frequency-domain noise characterization

Recommended experimental conditions:
- bias voltage
- temperature
- frequency
- bandwidth
- area
- instrument-noise subtraction note
- white-noise / pink-noise note

Recommended result metrics:
- Noise PSD
- Noise ASD
- in,r.m.s.
- in,r.m.s.,theor.

Recommended structured data blocks:
- Noise PSD vs frequency
- Noise ASD vs frequency

Recommended default units:
- Noise PSD: A²/Hz
- Noise ASD: A/Hz^1/2
- in,r.m.s.: A
- frequency: Hz
- bandwidth: Hz
- area: cm²

Notes:
- This template is focused on direct noise characterization.
- The theoretical RMS noise term should be labeled separately from measured RMS noise.

### 6. NEP / Detectivity

Applicable scenario:
- NEP analysis
- detectivity analysis
- specific detectivity comparison

Recommended experimental conditions:
- bias voltage
- temperature
- frequency
- bandwidth
- area
- optical power near NEP region
- responsivity reference condition

Recommended result metrics:
- NEP
- NEPapp
- D
- Dapp
- D*
- D*_{B̄}
- D*theor.

Recommended structured data blocks:
- Signal-to-noise vs optical power
- Responsivity near NEP

Recommended default units:
- NEP: W/Hz^1/2
- D: Hz^1/2/W
- D*: Jones
- frequency: Hz
- bandwidth: Hz
- area: cm²

Notes:
- This template is intentionally separate from the general noise template.
- Apparent and theoretical variants should be labeled clearly rather than merged into one field.

### 7. Speed of response

Applicable scenario:
- transient response
- impulse response
- frequency response

Recommended experimental conditions:
- bias voltage
- temperature
- wavelength
- continuous-wave optical power
- load resistance / impedance
- excitation type (rectangular pulse / impulse / sinusoidal)
- pulse energy
- pulse width

Recommended result metrics:
- τrise
- τfall
- τr,p
- τr,δ
- f3dB,sin
- f3dB,δ
- R0
- Qδ / Eδ

Recommended structured data blocks:
- Pulse transient
- Impulse response
- Frequency response

Recommended default units:
- time: s
- frequency: Hz
- impedance: Ω
- pulse energy: J

Notes:
- This template is suitable for time-domain and frequency-domain speed characterization.
- Some values are directly measured, while others are derived from fitted or interpreted response curves.

### 8. Stability / Reliability

Applicable scenario:
- long-term stability
- degradation studies
- lifetime and stress tests

Recommended experimental conditions:
- stress type (temperature / humidity / bias / continuous illumination / cycled illumination)
- temperature
- humidity
- bias
- optical power
- total duration
- interval checkpoints
- batch size

Recommended result metrics:
- Normalized responsivity
- Lifetime
- T80
- Degradation rate
- Activation energy

Recommended structured data blocks:
- Normalized responsivity vs time
- Lifetime vs temperature
- Current vs time under stress

Recommended default units:
- time: h
- temperature: K
- humidity: %RH
- optical power: W

Notes:
- This template is aimed at durability and stress-response records.
- Derived metrics such as T80 and degradation rate should still remain editable.

### 9. I-V

Applicable scenario:
- generic I-V scans
- illuminated I-V
- dark I-V

Recommended experimental conditions:
- bias sweep range
- step size
- sweep direction
- temperature
- illumination state
- wavelength
- incident optical power

Recommended result metrics:
- Dark current
- Photocurrent
- Rectification ratio
- On/Off ratio

Recommended structured data blocks:
- I-V
- illuminated I-V
- dark I-V

Recommended default units:
- voltage: V
- current: A
- wavelength: nm
- optical power: W

Notes:
- This is a practical first-release template for common I-V records.
- It is broader than the dedicated Dark current / Dark I-V template.

### 10. Power-dependent response

Applicable scenario:
- optical-power-dependent photocurrent
- responsivity-power analysis
- α and LDR behavior versus power

Recommended experimental conditions:
- wavelength
- bias voltage
- temperature
- optical power range

Recommended result metrics:
- α
- Responsivity
- LDR
- On/Off ratio

Recommended structured data blocks:
- Photocurrent-Power
- Responsivity-Power

Recommended default units:
- optical power: W
- Responsivity: A/W
- LDR: dB

Notes:
- This is useful when the main variable of interest is incident power.
- It overlaps with linearity analysis, but stays practical for direct power-dependent records.

### 11. Temperature-dependent response

Applicable scenario:
- temperature-dependent dark current
- temperature-dependent responsivity
- temperature-dependent detectivity

Recommended experimental conditions:
- temperature range
- bias voltage
- wavelength
- incident optical power

Recommended result metrics:
- Dark current
- Responsivity
- D*
- EQE

Recommended structured data blocks:
- Responsivity-Temperature
- Current-Temperature

Recommended default units:
- temperature: K
- current: A
- Responsivity: A/W
- D*: Jones
- EQE: %

Notes:
- This template is meant for variable-temperature measurements.
- It works well when temperature is the primary sweep dimension in Step 2.

### 12. On-Off cycling / switching stability

Applicable scenario:
- periodic switching
- light on/off cycling
- time-domain stability under repeated cycles

Recommended experimental conditions:
- bias voltage
- wavelength
- incident optical power
- modulation frequency
- duty cycle
- cycle count

Recommended result metrics:
- On current
- Off current
- On/Off ratio
- cycle-to-cycle drift

Recommended structured data blocks:
- On-Off cycling
- Time-domain switching response

Recommended default units:
- current: A
- frequency: Hz
- time: s

Notes:
- This template is appropriate when switching repeatability matters more than a single transient response.
- It can coexist with the broader speed-of-response family when needed.

### 13. XRD

Applicable scenario:
- XRD-based structure characterization
- supplementary material or structural characterization inside the same record workflow

Recommended experimental conditions:
- 2θ scan range
- step size
- scan speed
- source
- tube voltage/current
- sample treatment note

Recommended result metrics:
- peak position
- FWHM
- grain size
- plane index
- phase identification note

Recommended structured data blocks:
- XRD

Recommended default units:
- 2θ: °
- intensity: a.u.
- FWHM: °
- grain size: nm

Notes:
- This template is intentionally included as a supplementary characterization family.
- It remains within the same unified Step 2 system.

### 14. Material optical characterization

Applicable scenario:
- absorption
- transmission
- PL
- Raman
- compact material optical characterization in the same app workflow

Recommended experimental conditions:
- wavelength range
- excitation wavelength
- excitation power
- integration time
- temperature
- atmosphere

Recommended result metrics:
- peak wavelength
- FWHM
- peak intensity
- peak shift

Recommended structured data blocks:
- Absorption spectrum
- Transmission spectrum
- PL spectrum
- Raman spectrum

Recommended default units:
- wavelength: nm
- intensity: a.u.
- FWHM: nm
- excitation power: W
- integration time: s

Notes:
- This template is a practical compact family for first release.
- It is useful for supplementary optical/material spectra without creating a separate product mode.

## Unit Guidance

Default units are recommended defaults only.

They are meant to:

- reduce repeated typing
- keep common records more consistent
- give a reasonable starting point for typical measurements

They are not enforced. You can still edit the unit for any recommended condition, metric, or structured data block.

## Value-Nature Labels

Some templates include suggested value-nature labels to clarify what a recommended metric represents.

These labels are guidance for interpretation:

- `measured`
  - directly measured from the experiment or instrument output
- `apparent`
  - an apparent quantity that should not be treated as the same as the fully interpreted physical value
- `theoretical`
  - a theoretical or model-based value rather than a direct experimental result
- `derived / calculated`
  - obtained from measured values, fitting, normalization, or later calculation

These labels are especially useful for pairs or families such as:

- LDR vs LDRapp
- NEP vs NEPapp
- D vs Dapp
- D* vs D*_{B̄} vs D*theor.
- in,r.m.s. vs in,r.m.s.,theor.

At the current stage, these labels are template guidance. They should not be interpreted as a separate persistent schema field.

## Recommended Usage Flow

Recommended user flow:

1. Choose the test project in Step 1.
2. Enter Step 2 with the default template context already determined from that Step 1 test project.
3. Fill:
   - Experimental Conditions
   - Result Metrics
   - Structured Data Blocks
4. Adjust names, units, and items as needed.
5. Save the experiment record as usual.

The templates are there to guide the record, not to replace manual review.
