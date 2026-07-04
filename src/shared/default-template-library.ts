import type {
  BuiltinTemplateLibrary,
  ScalarItemTemplate,
  ScalarTemplateSection,
  ScalarTemplateValueType
} from './template-library-types';

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

function createScalarTemplates(
  familyKey: string,
  familyId: string,
  section: ScalarTemplateSection,
  items: Array<{
    slug: string;
    label: string;
    unitDefault?: string;
    defaultValue?: string;
    valueType?: ScalarTemplateValueType;
    note?: string;
    aliases?: string[];
  }>
): ScalarItemTemplate[] {
  return items.map((item) => ({
    id: `scalar:${familyKey}:${section}:${item.slug}`,
    version: 1,
    familyId,
    section,
    displayName: item.label,
    aliases: (item.aliases ?? []).map((value) => ({ value, kind: 'search' as const })),
    unitDefault: item.unitDefault,
    defaultValue: item.defaultValue,
    valueType: item.valueType,
    note: item.note,
    enabled: true,
    sourceType: 'builtin'
  }));
}

const IV_CONDITION_SCALARS = [
  { slug: 'bias-voltage', label: 'Bias voltage', unitDefault: 'V', aliases: ['偏压'] },
  { slug: 'sweep-range', label: 'Sweep range', unitDefault: 'V', aliases: ['扫描范围', '电压范围'] },
  { slug: 'sweep-direction', label: 'Sweep direction', valueType: 'text' as const, aliases: ['扫描方向'] },
  { slug: 'sweep-step', label: 'Sweep step', unitDefault: 'V', aliases: ['步进电压', '电压步进'] },
  { slug: 'sweep-rate', label: 'Sweep rate', unitDefault: 'V/s', aliases: ['扫描速率'] },
  { slug: 'temperature', label: 'Temperature', unitDefault: 'K', aliases: ['温度'] },
  { slug: 'device-area', label: 'Device area', unitDefault: 'cm²', aliases: ['器件面积'] },
  {
    slug: 'illumination-state',
    label: 'Illumination state',
    valueType: 'text' as const,
    aliases: ['光照状态']
  },
  { slug: 'dark-environment', label: 'Dark environment', valueType: 'text' as const, aliases: ['暗环境'] }
];

const IV_METRIC_SCALARS = [
  { slug: 'dark-current', label: 'Dark current', unitDefault: 'A', aliases: ['暗电流'] },
  { slug: 'photocurrent', label: 'Photocurrent', unitDefault: 'A', aliases: ['光电流'] },
  { slug: 'current-density', label: 'Current density', unitDefault: 'A/cm²', aliases: ['电流密度'] },
  {
    slug: 'dark-current-density',
    label: 'Dark current density',
    unitDefault: 'A/cm²',
    aliases: ['暗电流密度']
  },
  { slug: 'on-off-ratio', label: 'On/off ratio', aliases: ['开关比'] },
  { slug: 'rectification-ratio', label: 'Rectification ratio', aliases: ['整流比'] },
  { slug: 'hysteresis', label: 'Hysteresis', aliases: ['滞后'] }
];

const RESPONSIVITY_EQE_CONDITION_SCALARS = [
  { slug: 'bias-voltage', label: 'Bias voltage', unitDefault: 'V', aliases: ['偏压'] },
  { slug: 'wavelength-range', label: 'Wavelength range', unitDefault: 'nm', aliases: ['波长范围'] },
  {
    slug: 'incident-optical-power',
    label: 'Incident optical power',
    unitDefault: 'mW',
    aliases: ['入射光功率']
  },
  { slug: 'irradiance', label: 'Irradiance', unitDefault: 'mW/cm²', aliases: ['辐照度'] },
  {
    slug: 'reference-detector',
    label: 'Reference detector',
    valueType: 'text' as const,
    aliases: ['参考探测器']
  },
  { slug: 'illuminated-area', label: 'Illuminated area', unitDefault: 'cm²', aliases: ['受光面积'] },
  {
    slug: 'modulation-frequency',
    label: 'Modulation frequency',
    unitDefault: 'Hz',
    aliases: ['调制频率']
  },
  { slug: 'temperature', label: 'Temperature', unitDefault: 'K', aliases: ['温度'] }
];

const RESPONSIVITY_EQE_METRIC_SCALARS = [
  {
    slug: 'peak-responsivity',
    label: 'Peak responsivity',
    unitDefault: 'A/W',
    aliases: ['峰值响应率']
  },
  { slug: 'peak-eqe', label: 'Peak EQE', unitDefault: '%', aliases: ['峰值EQE'] },
  { slug: 'spectral-cutoff', label: 'Spectral cutoff', unitDefault: 'nm', aliases: ['截止波长'] },
  {
    slug: 'wavelength-of-peak-response',
    label: 'Wavelength of peak response',
    unitDefault: 'nm',
    aliases: ['峰值响应波长']
  },
  {
    slug: 'responsivity-at-selected-wavelength',
    label: 'Responsivity at selected wavelength',
    unitDefault: 'A/W',
    aliases: ['指定波长响应率']
  },
  {
    slug: 'eqe-at-selected-wavelength',
    label: 'EQE at selected wavelength',
    unitDefault: '%',
    aliases: ['指定波长EQE']
  }
];

const LINEARITY_LDR_CONDITION_SCALARS = [
  { slug: 'wavelength', label: 'Wavelength', unitDefault: 'nm', aliases: ['波长'] },
  {
    slug: 'optical-power-range',
    label: 'Optical power range',
    unitDefault: 'mW',
    aliases: ['光功率范围']
  },
  {
    slug: 'irradiance-range',
    label: 'Irradiance range',
    unitDefault: 'mW/cm²',
    aliases: ['辐照度范围']
  },
  { slug: 'bias-voltage', label: 'Bias voltage', unitDefault: 'V', aliases: ['偏压'] },
  { slug: 'spot-size', label: 'Spot size', unitDefault: 'mm', aliases: ['光斑尺寸'] },
  { slug: 'illuminated-area', label: 'Illuminated area', unitDefault: 'cm²', aliases: ['受光面积'] },
  { slug: 'temperature', label: 'Temperature', unitDefault: 'K', aliases: ['温度'] }
];

const LINEARITY_LDR_METRIC_SCALARS = [
  { slug: 'linear-fitting-exponent', label: 'Linear fitting exponent', aliases: ['拟合指数'] },
  { slug: 'ldr', label: 'LDR', unitDefault: 'dB', aliases: ['线性动态范围'] },
  { slug: 'ldrapp', label: 'LDRapp', unitDefault: 'dB', aliases: ['表观线性动态范围'] },
  { slug: 'saturation-point', label: 'Saturation point', unitDefault: 'mW/cm²', aliases: ['饱和点'] }
];

const NOISE_CONDITION_SCALARS = [
  { slug: 'bias-voltage', label: 'Bias voltage', unitDefault: 'V', aliases: ['偏压'] },
  { slug: 'dark-light-state', label: 'Dark/light state', valueType: 'text' as const, aliases: ['明暗状态'] },
  { slug: 'bandwidth', label: 'Bandwidth', unitDefault: 'Hz', aliases: ['带宽'] },
  { slug: 'sampling-rate', label: 'Sampling rate', unitDefault: 'Hz', aliases: ['采样率'] },
  {
    slug: 'instrument-noise-floor',
    label: 'Instrument noise floor',
    unitDefault: 'A/√Hz',
    aliases: ['仪器噪声底']
  },
  { slug: 'temperature', label: 'Temperature', unitDefault: 'K', aliases: ['温度'] }
];

const NOISE_METRIC_SCALARS = [
  {
    slug: 'noise-current-density',
    label: 'Noise current density',
    unitDefault: 'A/√Hz',
    aliases: ['噪声电流密度']
  },
  { slug: 'noise-psd', label: 'Noise PSD', unitDefault: 'A²/Hz', aliases: ['噪声功率谱密度'] },
  { slug: 'integrated-noise', label: 'Integrated noise', unitDefault: 'A', aliases: ['积分噪声'] }
];

const NEP_DETECTIVITY_CONDITION_SCALARS = [
  { slug: 'bias-voltage', label: 'Bias voltage', unitDefault: 'V', aliases: ['偏压'] },
  { slug: 'wavelength', label: 'Wavelength', unitDefault: 'nm', aliases: ['波长'] },
  {
    slug: 'modulation-frequency',
    label: 'Modulation frequency',
    unitDefault: 'Hz',
    aliases: ['调制频率']
  },
  { slug: 'bandwidth', label: 'Bandwidth', unitDefault: 'Hz', aliases: ['带宽'] },
  { slug: 'device-area', label: 'Device area', unitDefault: 'cm²', aliases: ['器件面积'] },
  {
    slug: 'responsivity-source',
    label: 'Responsivity source',
    valueType: 'text' as const,
    aliases: ['响应率来源']
  },
  {
    slug: 'noise-measurement-method',
    label: 'Noise measurement method',
    valueType: 'text' as const,
    aliases: ['噪声测量方法']
  }
];

const NEP_DETECTIVITY_METRIC_SCALARS = [
  { slug: 'nep', label: 'NEP', unitDefault: 'W/√Hz', aliases: ['噪声等效功率'] },
  {
    slug: 'specific-detectivity-d-star',
    label: 'Specific detectivity D*',
    unitDefault: 'Jones',
    aliases: ['比探测率', 'D*']
  },
  { slug: 'bandwidth', label: 'Bandwidth', unitDefault: 'Hz', aliases: ['带宽'] }
];

const SPEED_RESPONSE_CONDITION_SCALARS = [
  { slug: 'bias-voltage', label: 'Bias voltage', unitDefault: 'V', aliases: ['偏压'] },
  { slug: 'wavelength', label: 'Wavelength', unitDefault: 'nm', aliases: ['波长'] },
  { slug: 'optical-power', label: 'Optical power', unitDefault: 'mW', aliases: ['光功率'] },
  { slug: 'load-resistance', label: 'Load resistance', unitDefault: 'Ω', aliases: ['负载电阻'] },
  { slug: 'sampling-rate', label: 'Sampling rate', unitDefault: 'Hz', aliases: ['采样率'] },
  { slug: 'pulse-width', label: 'Pulse width', unitDefault: 's', aliases: ['脉冲宽度'] },
  {
    slug: 'modulation-frequency',
    label: 'Modulation frequency',
    unitDefault: 'Hz',
    aliases: ['调制频率']
  }
];

const SPEED_RESPONSE_METRIC_SCALARS = [
  { slug: 'rise-time', label: 'Rise time', unitDefault: 's', aliases: ['上升时间'] },
  { slug: 'fall-time', label: 'Fall time', unitDefault: 's', aliases: ['下降时间'] },
  { slug: 'response-time', label: 'Response time', unitDefault: 's', aliases: ['响应时间'] },
  { slug: 'bandwidth', label: 'Bandwidth', unitDefault: 'Hz', aliases: ['带宽'] }
];

const STABILITY_CONDITION_SCALARS = [
  { slug: 'bias-voltage', label: 'Bias voltage', unitDefault: 'V', aliases: ['偏压'] },
  { slug: 'wavelength', label: 'Wavelength', unitDefault: 'nm', aliases: ['波长'] },
  { slug: 'optical-power', label: 'Optical power', unitDefault: 'mW', aliases: ['光功率'] },
  { slug: 'cycle-count', label: 'Cycle count', aliases: ['循环次数'] },
  { slug: 'on-off-period', label: 'On/off period', unitDefault: 's', aliases: ['开关周期'] },
  { slug: 'atmosphere', label: 'Atmosphere', valueType: 'text' as const, aliases: ['气氛'] },
  { slug: 'temperature', label: 'Temperature', unitDefault: 'K', aliases: ['温度'] }
];

const STABILITY_METRIC_SCALARS = [
  { slug: 'initial-current', label: 'Initial current', unitDefault: 'A', aliases: ['初始电流'] },
  { slug: 'final-current', label: 'Final current', unitDefault: 'A', aliases: ['最终电流'] },
  { slug: 'retention', label: 'Retention', unitDefault: '%', aliases: ['保持率'] },
  { slug: 'degradation-rate', label: 'Degradation rate', unitDefault: '%/h', aliases: ['退化速率'] }
];

const XRD_CONDITION_SCALARS = [
  { slug: 'scan-range', label: 'Scan range', unitDefault: '°', aliases: ['扫描范围'] },
  { slug: 'step-size', label: 'Step size', unitDefault: '°', aliases: ['步长'] },
  { slug: 'scan-speed', label: 'Scan speed', unitDefault: '°/min', aliases: ['扫描速度'] },
  { slug: 'x-ray-source', label: 'X-ray source', valueType: 'text' as const, aliases: ['X射线源'] },
  { slug: 'x-ray-wavelength', label: 'X-ray wavelength', unitDefault: 'Å', aliases: ['X射线波长'] },
  { slug: 'sample-state', label: 'Sample state', valueType: 'text' as const, aliases: ['样品状态'] }
];

const XRD_METRIC_SCALARS = [
  { slug: 'peak-position', label: 'Peak position', unitDefault: '°', aliases: ['峰位'] },
  { slug: 'fwhm', label: 'FWHM', unitDefault: '°', aliases: ['半高宽'] },
  { slug: 'phase-assignment', label: 'Phase assignment', valueType: 'text' as const, aliases: ['物相判定'] },
  {
    slug: 'crystallinity-note',
    label: 'Crystallinity note',
    valueType: 'text' as const,
    aliases: ['结晶性备注']
  }
];

const PL_CONDITION_SCALARS = [
  {
    slug: 'excitation-wavelength',
    label: 'Excitation wavelength',
    unitDefault: 'nm',
    aliases: ['激发波长']
  },
  { slug: 'excitation-power', label: 'Excitation power', unitDefault: 'mW', aliases: ['激发功率'] },
  { slug: 'integration-time', label: 'Integration time', unitDefault: 's', aliases: ['积分时间'] },
  { slug: 'temperature', label: 'Temperature', unitDefault: 'K', aliases: ['温度'] },
  { slug: 'sample-state', label: 'Sample state', valueType: 'text' as const, aliases: ['样品状态'] }
];

const PL_METRIC_SCALARS = [
  { slug: 'peak-wavelength', label: 'Peak wavelength', unitDefault: 'nm', aliases: ['峰值波长'] },
  { slug: 'peak-intensity', label: 'Peak intensity', unitDefault: 'a.u.', aliases: ['峰强'] },
  { slug: 'fwhm', label: 'FWHM', unitDefault: 'nm', aliases: ['半高宽'] },
  { slug: 'integrated-intensity', label: 'Integrated intensity', unitDefault: 'a.u.', aliases: ['积分强度'] }
];

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
  scalarTemplates: [
    ...createScalarTemplates('iv', 'scientific:iv', 'condition', IV_CONDITION_SCALARS),
    ...createScalarTemplates('iv', 'scientific:iv', 'metric', IV_METRIC_SCALARS),
    ...createScalarTemplates('dark-current', 'scientific:dark-current', 'condition', IV_CONDITION_SCALARS),
    ...createScalarTemplates('dark-current', 'scientific:dark-current', 'metric', IV_METRIC_SCALARS),
    ...createScalarTemplates(
      'responsivity-eqe',
      'scientific:responsivity-eqe',
      'condition',
      RESPONSIVITY_EQE_CONDITION_SCALARS
    ),
    ...createScalarTemplates(
      'responsivity-eqe',
      'scientific:responsivity-eqe',
      'metric',
      RESPONSIVITY_EQE_METRIC_SCALARS
    ),
    ...createScalarTemplates(
      'linearity-ldr',
      'scientific:linearity-ldr',
      'condition',
      LINEARITY_LDR_CONDITION_SCALARS
    ),
    ...createScalarTemplates(
      'linearity-ldr',
      'scientific:linearity-ldr',
      'metric',
      LINEARITY_LDR_METRIC_SCALARS
    ),
    ...createScalarTemplates('noise', 'scientific:noise', 'condition', NOISE_CONDITION_SCALARS),
    ...createScalarTemplates('noise', 'scientific:noise', 'metric', NOISE_METRIC_SCALARS),
    ...createScalarTemplates(
      'nep-detectivity',
      'scientific:nep-detectivity',
      'condition',
      NEP_DETECTIVITY_CONDITION_SCALARS
    ),
    ...createScalarTemplates(
      'nep-detectivity',
      'scientific:nep-detectivity',
      'metric',
      NEP_DETECTIVITY_METRIC_SCALARS
    ),
    ...createScalarTemplates(
      'speed-response',
      'scientific:speed-response',
      'condition',
      SPEED_RESPONSE_CONDITION_SCALARS
    ),
    ...createScalarTemplates(
      'speed-response',
      'scientific:speed-response',
      'metric',
      SPEED_RESPONSE_METRIC_SCALARS
    ),
    ...createScalarTemplates(
      'stability',
      'scientific:stability',
      'condition',
      STABILITY_CONDITION_SCALARS
    ),
    ...createScalarTemplates('stability', 'scientific:stability', 'metric', STABILITY_METRIC_SCALARS),
    ...createScalarTemplates('xrd', 'scientific:xrd', 'condition', XRD_CONDITION_SCALARS),
    ...createScalarTemplates('xrd', 'scientific:xrd', 'metric', XRD_METRIC_SCALARS),
    ...createScalarTemplates('pl', 'scientific:pl', 'condition', PL_CONDITION_SCALARS),
    ...createScalarTemplates('pl', 'scientific:pl', 'metric', PL_METRIC_SCALARS)
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
