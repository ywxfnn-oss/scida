import type { BuiltinTemplateLibrary } from './template-library-types';

function createConditions(
  items: Array<{
    id: string;
    label: string;
    unit?: string;
    note?: string;
    priority?: number;
  }>
) {
  return items;
}

function createMetrics(
  items: Array<{
    id: string;
    label: string;
    unit?: string;
    note?: string;
    priority?: number;
  }>
) {
  return items;
}

export const DEFAULT_TEMPLATE_LIBRARY: BuiltinTemplateLibrary = {
  version: 1,
  scientificTemplates: [
    {
      id: 'scientific:iv',
      version: 1,
      displayName: 'I-V',
      aliases: [
        { value: 'IV', kind: 'search' },
        { value: 'I-V', kind: 'search' },
        { value: '电流电压', kind: 'search' }
      ],
      enabled: true,
      description: 'General current-voltage family.',
      sourceType: 'builtin'
    },
    {
      id: 'scientific:dark-current',
      version: 1,
      displayName: 'Dark current / Dark I-V',
      aliases: [
        { value: 'Dark I-V', kind: 'search' },
        { value: 'Dark current', kind: 'search' },
        { value: '暗电流', kind: 'search' }
      ],
      enabled: true,
      description: 'Dark-state current-voltage characterization.',
      sourceType: 'builtin'
    },
    {
      id: 'scientific:responsivity-eqe',
      version: 1,
      displayName: 'Responsivity / EQE',
      aliases: [
        { value: 'Responsivity', kind: 'search' },
        { value: 'EQE', kind: 'search' },
        { value: '光谱响应', kind: 'search' }
      ],
      enabled: true,
      description: 'Responsivity and EQE spectral workflows.',
      sourceType: 'builtin'
    },
    {
      id: 'scientific:linearity-ldr',
      version: 1,
      displayName: 'Linearity / LDR',
      aliases: [
        { value: 'linearity', kind: 'search' },
        { value: 'LDR', kind: 'search' },
        { value: '线性动态范围', kind: 'search' }
      ],
      enabled: true,
      description: 'Power-dependent and linear dynamic range workflows.',
      sourceType: 'builtin'
    },
    {
      id: 'scientific:noise',
      version: 1,
      displayName: 'Noise',
      aliases: [
        { value: 'noise spectrum', kind: 'search' },
        { value: '噪声', kind: 'search' }
      ],
      enabled: true,
      description: 'Noise spectral density and integrated noise workflows.',
      sourceType: 'builtin'
    },
    {
      id: 'scientific:nep-detectivity',
      version: 1,
      displayName: 'NEP / Detectivity',
      aliases: [
        { value: 'NEP', kind: 'search' },
        { value: 'Detectivity', kind: 'search' },
        { value: '探测率', kind: 'search' }
      ],
      enabled: true,
      description: 'NEP and detectivity spectrum workflows.',
      sourceType: 'builtin'
    },
    {
      id: 'scientific:speed-response',
      version: 1,
      displayName: 'Speed of response',
      aliases: [
        { value: 'Time response', kind: 'search' },
        { value: 'Transient response', kind: 'search' },
        { value: '时间响应', kind: 'search' }
      ],
      enabled: true,
      description: 'Time-response and transient workflows.',
      sourceType: 'builtin'
    },
    {
      id: 'scientific:stability',
      version: 1,
      displayName: 'Stability / On-Off cycling',
      aliases: [
        { value: 'stability', kind: 'search' },
        { value: 'On-Off cycling', kind: 'search' },
        { value: '开关循环', kind: 'search' }
      ],
      enabled: true,
      description: 'Stability and cycling workflows.',
      sourceType: 'builtin'
    },
    {
      id: 'scientific:xrd',
      version: 1,
      displayName: 'XRD',
      aliases: [
        { value: 'X-ray diffraction', kind: 'search' },
        { value: '衍射', kind: 'search' }
      ],
      enabled: true,
      description: 'Common XRD curve templates.',
      sourceType: 'builtin'
    },
    {
      id: 'scientific:pl',
      version: 1,
      displayName: 'PL / optical characterization',
      aliases: [
        { value: 'PL', kind: 'search' },
        { value: 'Photoluminescence', kind: 'search' },
        { value: '光致发光', kind: 'search' }
      ],
      enabled: true,
      description: 'Photoluminescence and optical spectrum workflows.',
      sourceType: 'builtin'
    }
  ],
  curveTemplates: [
    {
      id: 'curve:iv-low',
      version: 1,
      familyId: 'scientific:iv',
      displayName: 'IV-低压',
      aliases: [{ value: 'IV-low', kind: 'search' }],
      enabled: true,
      purposeType: 'iv',
      blockTitleDefault: 'IV-低压',
      axisDefaults: {
        primaryLabel: 'Voltage',
        primaryUnit: 'V',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      },
      recommendedConditions: createConditions([
        { id: 'sweep-range', label: 'Bias voltage / sweep range', unit: 'V', priority: 1 },
        { id: 'sweep-direction', label: 'Sweep direction', priority: 2 },
        { id: 'step-size', label: 'Sweep rate or step size', priority: 3 },
        { id: 'temperature', label: 'Temperature', unit: 'K', priority: 4 },
        { id: 'device-area', label: 'Device area', priority: 5 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'turn-on-voltage', label: 'Turn-on voltage', unit: 'V', priority: 1 },
        { id: 'current-density', label: 'Current density', unit: 'A/cm²', priority: 2 }
      ]),
      filenameHints: ['iv', 'low', 'sweep'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:iv-high',
      version: 1,
      familyId: 'scientific:iv',
      displayName: 'IV-高压',
      aliases: [{ value: 'IV-high', kind: 'search' }],
      enabled: true,
      purposeType: 'iv',
      blockTitleDefault: 'IV-高压',
      axisDefaults: {
        primaryLabel: 'Voltage',
        primaryUnit: 'V',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      },
      recommendedConditions: createConditions([
        { id: 'hv-range', label: 'Bias voltage / sweep range', unit: 'V', priority: 1 },
        { id: 'sweep-direction', label: 'Sweep direction', priority: 2 },
        { id: 'step-size', label: 'Sweep rate or step size', priority: 3 },
        { id: 'temperature', label: 'Temperature', unit: 'K', priority: 4 },
        { id: 'compliance', label: 'Compliance current', unit: 'A', priority: 5 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'leakage-current', label: 'Leakage current', unit: 'A', priority: 1 },
        { id: 'breakdown-observation', label: 'Breakdown observation', priority: 2 }
      ]),
      filenameHints: ['iv', 'high', 'hv'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:dark-iv',
      version: 1,
      familyId: 'scientific:dark-current',
      displayName: 'IV-暗态',
      aliases: [{ value: 'Dark I-V', kind: 'search' }],
      enabled: true,
      purposeType: 'iv',
      blockTitleDefault: 'IV-暗态',
      axisDefaults: {
        primaryLabel: 'Voltage',
        primaryUnit: 'V',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      },
      recommendedConditions: createConditions([
        { id: 'bias-range', label: 'Bias voltage / sweep range', unit: 'V', priority: 1 },
        { id: 'sweep-direction', label: 'Sweep direction', priority: 2 },
        { id: 'step-size', label: 'Sweep rate or step size', priority: 3 },
        { id: 'stabilization-time', label: 'Stabilization time', unit: 's', priority: 4 },
        { id: 'temperature', label: 'Temperature', unit: 'K', priority: 5 },
        { id: 'device-area', label: 'Device area', priority: 6 },
        { id: 'dark-environment', label: 'Dark environment', priority: 7 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'idark', label: 'Idark', unit: 'A', priority: 1 },
        { id: 'jdark', label: 'jdark', unit: 'A/cm²', priority: 2 },
        { id: 'hysteresis', label: 'Hysteresis', priority: 3 },
        { id: 'current-drift', label: 'Current drift', priority: 4 }
      ]),
      filenameHints: ['dark', 'iv', 'idark'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:iv-illuminated',
      version: 1,
      familyId: 'scientific:iv',
      displayName: 'IV-光照',
      aliases: [{ value: 'Illuminated I-V', kind: 'search' }],
      enabled: true,
      purposeType: 'iv',
      blockTitleDefault: 'IV-光照',
      axisDefaults: {
        primaryLabel: 'Voltage',
        primaryUnit: 'V',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      },
      recommendedConditions: createConditions([
        { id: 'bias-range', label: 'Bias voltage / sweep range', unit: 'V', priority: 1 },
        { id: 'light-source', label: 'Light source', priority: 2 },
        { id: 'wavelength', label: 'Wavelength', unit: 'nm', priority: 3 },
        { id: 'irradiance', label: 'Incident optical power / irradiance', priority: 4 },
        { id: 'temperature', label: 'Temperature', unit: 'K', priority: 5 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'photocurrent', label: 'Photocurrent', unit: 'A', priority: 1 },
        { id: 'on-off-ratio', label: 'On/off ratio', priority: 2 }
      ]),
      filenameHints: ['light', 'illum', 'photo', 'iv'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:iv-forward-scan',
      version: 1,
      familyId: 'scientific:iv',
      displayName: 'IV-正扫',
      aliases: [{ value: 'Forward scan I-V', kind: 'search' }],
      enabled: true,
      purposeType: 'iv',
      blockTitleDefault: 'IV-正扫',
      axisDefaults: {
        primaryLabel: 'Voltage',
        primaryUnit: 'V',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      },
      recommendedConditions: createConditions([
        { id: 'bias-range', label: 'Bias voltage / sweep range', unit: 'V', priority: 1 },
        { id: 'step-size', label: 'Sweep rate or step size', priority: 2 },
        { id: 'temperature', label: 'Temperature', unit: 'K', priority: 3 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'forward-current', label: 'Forward current', unit: 'A', priority: 1 }
      ]),
      filenameHints: ['forward', 'fwd', 'scan', 'iv'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:iv-reverse-scan',
      version: 1,
      familyId: 'scientific:iv',
      displayName: 'IV-反扫',
      aliases: [{ value: 'Reverse scan I-V', kind: 'search' }],
      enabled: true,
      purposeType: 'iv',
      blockTitleDefault: 'IV-反扫',
      axisDefaults: {
        primaryLabel: 'Voltage',
        primaryUnit: 'V',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      },
      recommendedConditions: createConditions([
        { id: 'bias-range', label: 'Bias voltage / sweep range', unit: 'V', priority: 1 },
        { id: 'step-size', label: 'Sweep rate or step size', priority: 2 },
        { id: 'temperature', label: 'Temperature', unit: 'K', priority: 3 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'reverse-current', label: 'Reverse current', unit: 'A', priority: 1 },
        { id: 'hysteresis', label: 'Hysteresis', priority: 2 }
      ]),
      filenameHints: ['reverse', 'rev', 'scan', 'iv'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:responsivity-spectrum',
      version: 1,
      familyId: 'scientific:responsivity-eqe',
      displayName: 'Responsivity spectrum',
      aliases: [{ value: 'Responsivity', kind: 'search' }],
      enabled: true,
      purposeType: 'responsivity',
      blockTitleDefault: 'Responsivity',
      axisDefaults: {
        primaryLabel: 'Wavelength',
        primaryUnit: 'nm',
        secondaryLabel: 'Responsivity',
        secondaryUnit: 'A/W'
      },
      recommendedConditions: createConditions([
        { id: 'bias-voltage', label: 'Bias voltage', unit: 'V', priority: 1 },
        { id: 'wavelength-range', label: 'Wavelength range', unit: 'nm', priority: 2 },
        { id: 'incident-power', label: 'Incident optical power / irradiance', priority: 3 },
        { id: 'reference-detector', label: 'Reference detector', priority: 4 },
        { id: 'aperture', label: 'Illuminated area / aperture', priority: 5 },
        { id: 'modulation-frequency', label: 'Modulation frequency', unit: 'Hz', priority: 6 },
        { id: 'temperature', label: 'Temperature', unit: 'K', priority: 7 },
        { id: 'dark-monitoring', label: 'Dark-current monitoring status', priority: 8 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'peak-responsivity', label: 'Peak responsivity', unit: 'A/W', priority: 1 },
        { id: 'spectral-cutoff', label: 'Spectral cutoff', unit: 'nm', priority: 2 },
        { id: 'peak-wavelength', label: 'Wavelength of peak response', unit: 'nm', priority: 3 }
      ]),
      filenameHints: ['resp', 'responsivity', 'spectrum'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:eqe-spectrum',
      version: 1,
      familyId: 'scientific:responsivity-eqe',
      displayName: 'EQE spectrum',
      aliases: [{ value: 'EQE', kind: 'search' }],
      enabled: true,
      purposeType: 'eqe',
      blockTitleDefault: 'EQE',
      axisDefaults: {
        primaryLabel: 'Wavelength',
        primaryUnit: 'nm',
        secondaryLabel: 'EQE',
        secondaryUnit: '%'
      },
      recommendedConditions: createConditions([
        { id: 'bias-voltage', label: 'Bias voltage', unit: 'V', priority: 1 },
        { id: 'wavelength-range', label: 'Wavelength range', unit: 'nm', priority: 2 },
        { id: 'incident-power', label: 'Incident optical power / irradiance', priority: 3 },
        { id: 'reference-detector', label: 'Reference detector', priority: 4 },
        { id: 'aperture', label: 'Illuminated area / aperture', priority: 5 },
        { id: 'modulation-frequency', label: 'Modulation frequency', unit: 'Hz', priority: 6 },
        { id: 'temperature', label: 'Temperature', unit: 'K', priority: 7 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'peak-eqe', label: 'Peak EQE', unit: '%', priority: 1 },
        { id: 'spectral-cutoff', label: 'Spectral cutoff', unit: 'nm', priority: 2 },
        { id: 'peak-wavelength', label: 'Wavelength of peak response', unit: 'nm', priority: 3 }
      ]),
      filenameHints: ['eqe', 'spectrum'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:power-dependent-photocurrent',
      version: 1,
      familyId: 'scientific:linearity-ldr',
      displayName: 'Power-dependent photocurrent',
      aliases: [{ value: '功率依赖光电流', kind: 'search' }],
      enabled: true,
      purposeType: 'custom',
      blockTitleDefault: 'Power-dependent photocurrent',
      axisDefaults: {
        primaryLabel: 'Optical power / irradiance',
        primaryUnit: 'mW/cm²',
        secondaryLabel: 'Photocurrent',
        secondaryUnit: 'A'
      },
      recommendedConditions: createConditions([
        { id: 'wavelength', label: 'Wavelength', unit: 'nm', priority: 1 },
        { id: 'power-range', label: 'Optical power / irradiance range', priority: 2 },
        { id: 'bias-voltage', label: 'Bias voltage', unit: 'V', priority: 3 },
        { id: 'illuminated-area', label: 'Spot size / illuminated area', priority: 4 },
        { id: 'temperature', label: 'Temperature', unit: 'K', priority: 5 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'linear-exponent', label: 'Linear fitting exponent', priority: 1 },
        { id: 'saturation-point', label: 'Saturation point', priority: 2 }
      ]),
      filenameHints: ['power', 'photocurrent', 'intensity'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:ldr',
      version: 1,
      familyId: 'scientific:linearity-ldr',
      displayName: 'LDR',
      aliases: [{ value: 'Linear dynamic range', kind: 'search' }],
      enabled: true,
      purposeType: 'custom',
      blockTitleDefault: 'LDR',
      axisDefaults: {
        primaryLabel: 'Irradiance',
        primaryUnit: 'mW/cm²',
        secondaryLabel: 'Photocurrent',
        secondaryUnit: 'A'
      },
      recommendedConditions: createConditions([
        { id: 'wavelength', label: 'Wavelength', unit: 'nm', priority: 1 },
        { id: 'power-range', label: 'Optical power / irradiance range', priority: 2 },
        { id: 'bias-voltage', label: 'Bias voltage', unit: 'V', priority: 3 },
        { id: 'illuminated-area', label: 'Spot size / illuminated area', priority: 4 },
        { id: 'temperature', label: 'Temperature', unit: 'K', priority: 5 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'ldr', label: 'LDR', priority: 1 },
        { id: 'ldrapp', label: 'LDRapp', priority: 2 },
        { id: 'linear-exponent', label: 'Linear fitting exponent', priority: 3 },
        { id: 'saturation-point', label: 'Saturation point', priority: 4 }
      ]),
      filenameHints: ['ldr', 'linearity', 'power'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:noise-spectrum',
      version: 1,
      familyId: 'scientific:noise',
      displayName: 'Noise spectrum',
      aliases: [{ value: 'Noise PSD', kind: 'search' }],
      enabled: true,
      purposeType: 'spectrum',
      blockTitleDefault: 'Noise spectrum',
      axisDefaults: {
        primaryLabel: 'Frequency',
        primaryUnit: 'Hz',
        secondaryLabel: 'Noise current density',
        secondaryUnit: 'A/√Hz'
      },
      recommendedConditions: createConditions([
        { id: 'bias-voltage', label: 'Bias voltage', unit: 'V', priority: 1 },
        { id: 'dark-light-state', label: 'Dark/light state', priority: 2 },
        { id: 'bandwidth', label: 'Bandwidth', unit: 'Hz', priority: 3 },
        { id: 'sampling-rate', label: 'Sampling rate', unit: 'Hz', priority: 4 },
        { id: 'noise-floor', label: 'Instrument noise floor', priority: 5 },
        { id: 'temperature', label: 'Temperature', unit: 'K', priority: 6 }
      ]),
      recommendedMetrics: createMetrics([
        {
          id: 'noise-current-density',
          label: 'Noise current density',
          unit: 'A/√Hz',
          note: 'Alternative representation: Noise PSD (A²/Hz).',
          priority: 1
        },
        { id: 'noise-psd', label: 'Noise PSD', unit: 'A²/Hz', priority: 2 },
        { id: 'integrated-noise', label: 'Integrated noise', priority: 3 }
      ]),
      filenameHints: ['noise', 'psd', 'frequency'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:nep-spectrum',
      version: 1,
      familyId: 'scientific:nep-detectivity',
      displayName: 'NEP spectrum',
      aliases: [{ value: 'NEP', kind: 'search' }],
      enabled: true,
      purposeType: 'spectrum',
      blockTitleDefault: 'NEP spectrum',
      axisDefaults: {
        primaryLabel: 'Wavelength',
        primaryUnit: 'nm',
        secondaryLabel: 'NEP',
        secondaryUnit: 'W/√Hz'
      },
      recommendedConditions: createConditions([
        { id: 'bias-voltage', label: 'Bias voltage', unit: 'V', priority: 1 },
        { id: 'wavelength', label: 'Wavelength', unit: 'nm', priority: 2 },
        { id: 'bandwidth', label: 'Modulation frequency or bandwidth', priority: 3 },
        { id: 'device-area', label: 'Device area', priority: 4 },
        { id: 'responsivity-source', label: 'Responsivity source', priority: 5 },
        { id: 'noise-method', label: 'Noise measurement method', priority: 6 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'nep', label: 'NEP', unit: 'W/√Hz', priority: 1 },
        { id: 'bandwidth', label: 'Bandwidth', unit: 'Hz', priority: 2 }
      ]),
      filenameHints: ['nep', 'spectrum'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:detectivity-spectrum',
      version: 1,
      familyId: 'scientific:nep-detectivity',
      displayName: 'Detectivity spectrum',
      aliases: [{ value: 'D* spectrum', kind: 'search' }],
      enabled: true,
      purposeType: 'spectrum',
      blockTitleDefault: 'Detectivity spectrum',
      axisDefaults: {
        primaryLabel: 'Wavelength',
        primaryUnit: 'nm',
        secondaryLabel: 'Detectivity',
        secondaryUnit: 'Jones'
      },
      recommendedConditions: createConditions([
        { id: 'bias-voltage', label: 'Bias voltage', unit: 'V', priority: 1 },
        { id: 'wavelength', label: 'Wavelength', unit: 'nm', priority: 2 },
        { id: 'bandwidth', label: 'Modulation frequency or bandwidth', priority: 3 },
        { id: 'device-area', label: 'Device area', priority: 4 },
        { id: 'responsivity-source', label: 'Responsivity source', priority: 5 },
        { id: 'noise-method', label: 'Noise measurement method', priority: 6 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'specific-detectivity', label: 'Specific detectivity D*', unit: 'Jones', priority: 1 },
        { id: 'bandwidth', label: 'Bandwidth', unit: 'Hz', priority: 2 }
      ]),
      filenameHints: ['detectivity', 'dstar', 'spectrum'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:time-response',
      version: 1,
      familyId: 'scientific:speed-response',
      displayName: 'Time response',
      aliases: [{ value: 'Transient response', kind: 'search' }],
      enabled: true,
      purposeType: 'custom',
      blockTitleDefault: 'Time response',
      axisDefaults: {
        primaryLabel: 'Time',
        primaryUnit: 's',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      },
      recommendedConditions: createConditions([
        { id: 'bias-voltage', label: 'Bias voltage', unit: 'V', priority: 1 },
        { id: 'wavelength', label: 'Wavelength', unit: 'nm', priority: 2 },
        { id: 'optical-power', label: 'Optical power', priority: 3 },
        { id: 'load-resistance', label: 'Load resistance', priority: 4 },
        { id: 'sampling-rate', label: 'Sampling rate', unit: 'Hz', priority: 5 },
        { id: 'pulse-width', label: 'Pulse width / modulation frequency', priority: 6 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'rise-time', label: 'Rise time', unit: 's', priority: 1 },
        { id: 'fall-time', label: 'Fall time', unit: 's', priority: 2 },
        { id: 'bandwidth', label: 'Bandwidth', unit: 'Hz', priority: 3 },
        { id: 'response-time', label: 'Response time', unit: 's', priority: 4 }
      ]),
      filenameHints: ['transient', 'time', 'response'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:on-off-cycling',
      version: 1,
      familyId: 'scientific:stability',
      displayName: 'On-Off cycling',
      aliases: [{ value: 'Stability cycling', kind: 'search' }],
      enabled: true,
      purposeType: 'custom',
      blockTitleDefault: 'On-Off cycling',
      axisDefaults: {
        primaryLabel: 'Time',
        primaryUnit: 's',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      },
      recommendedConditions: createConditions([
        { id: 'bias-voltage', label: 'Bias voltage', unit: 'V', priority: 1 },
        { id: 'wavelength', label: 'Wavelength', unit: 'nm', priority: 2 },
        { id: 'optical-power', label: 'Optical power', priority: 3 },
        { id: 'cycle-count', label: 'Cycle count', priority: 4 },
        { id: 'sampling-rate', label: 'Sampling rate', unit: 'Hz', priority: 5 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'retention', label: 'Retention', priority: 1 },
        { id: 'drift', label: 'Drift', priority: 2 }
      ]),
      filenameHints: ['on-off', 'cycling', 'stability'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:xrd',
      version: 1,
      familyId: 'scientific:xrd',
      displayName: 'XRD',
      aliases: [{ value: 'XRD spectrum', kind: 'search' }],
      enabled: true,
      purposeType: 'xrd',
      blockTitleDefault: 'XRD',
      axisDefaults: {
        primaryLabel: '2θ',
        primaryUnit: '°',
        secondaryLabel: 'Intensity',
        secondaryUnit: 'a.u.'
      },
      recommendedConditions: createConditions([
        { id: 'scan-range', label: 'Scan range', priority: 1 },
        { id: 'step-size', label: 'Step size', priority: 2 },
        { id: 'scan-speed', label: 'Scan speed', priority: 3 },
        { id: 'xray-source', label: 'X-ray source / wavelength', priority: 4 },
        { id: 'sample-state', label: 'Sample state', priority: 5 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'peak-position', label: 'Peak position', priority: 1 },
        { id: 'fwhm', label: 'FWHM', priority: 2 },
        { id: 'phase-assignment', label: 'Phase assignment', priority: 3 },
        { id: 'crystallinity-note', label: 'Crystallinity note', priority: 4 }
      ]),
      filenameHints: ['xrd', 'diffraction', 'theta'],
      sourceType: 'builtin'
    },
    {
      id: 'curve:pl-spectrum',
      version: 1,
      familyId: 'scientific:pl',
      displayName: 'PL spectrum',
      aliases: [
        { value: 'PL', kind: 'search' },
        { value: 'Photoluminescence', kind: 'search' }
      ],
      enabled: true,
      purposeType: 'spectrum',
      blockTitleDefault: 'PL spectrum',
      axisDefaults: {
        primaryLabel: 'Wavelength',
        primaryUnit: 'nm',
        secondaryLabel: 'Intensity',
        secondaryUnit: 'a.u.'
      },
      recommendedConditions: createConditions([
        { id: 'excitation-wavelength', label: 'Excitation wavelength', unit: 'nm', priority: 1 },
        { id: 'excitation-power', label: 'Excitation power', priority: 2 },
        { id: 'integration-time', label: 'Integration time', priority: 3 },
        { id: 'temperature', label: 'Temperature', unit: 'K', priority: 4 },
        { id: 'sample-state', label: 'Sample state', priority: 5 }
      ]),
      recommendedMetrics: createMetrics([
        { id: 'peak-wavelength', label: 'Peak wavelength', unit: 'nm', priority: 1 },
        { id: 'peak-intensity', label: 'Peak intensity', priority: 2 },
        { id: 'fwhm', label: 'FWHM', priority: 3 },
        { id: 'integrated-intensity', label: 'Integrated intensity', priority: 4 }
      ]),
      filenameHints: ['pl', 'photoluminescence', 'spectrum'],
      sourceType: 'builtin'
    }
  ],
  importParsingTemplates: []
};
