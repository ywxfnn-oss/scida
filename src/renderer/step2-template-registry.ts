export type StructuredBlockPurpose =
  | ''
  | 'spectrum'
  | 'iv'
  | 'xrd'
  | 'eqe'
  | 'responsivity'
  | 'custom';

export type ValueNatureLabel =
  | 'measured'
  | 'apparent'
  | 'theoretical'
  | 'derived'
  | 'calculated';

export type Step2RecommendedScalarItem = {
  name: string;
  defaultUnit: string;
  valueNatures?: ValueNatureLabel[];
};

export type Step2RecommendedStructuredBlock = {
  label: string;
  purposeType: StructuredBlockPurpose;
  titleSuggestion?: string;
  primaryLabel?: string;
  primaryUnit?: string;
  secondaryLabel?: string;
  secondaryUnit?: string;
};

export type Step2TemplateFamily = {
  id: string;
  label: string;
  hint: string;
  matchKeywords: string[];
  recommendedConditions: Step2RecommendedScalarItem[];
  recommendedMetrics: Step2RecommendedScalarItem[];
  recommendedStructuredBlocks: Step2RecommendedStructuredBlock[];
};

export const STRUCTURED_BLOCK_PURPOSE_OPTIONS: Array<{
  value: StructuredBlockPurpose;
  label: string;
}> = [
  { value: '', label: '未指定' },
  { value: 'spectrum', label: 'Spectrum' },
  { value: 'iv', label: 'I-V' },
  { value: 'xrd', label: 'XRD' },
  { value: 'eqe', label: 'EQE' },
  { value: 'responsivity', label: 'Responsivity' },
  { value: 'custom', label: 'Custom' }
];

const GENERIC_STRUCTURED_BLOCKS: Step2RecommendedStructuredBlock[] = [
  {
    label: '结构化曲线',
    purposeType: 'custom',
    titleSuggestion: '结构化数据',
    primaryLabel: 'X',
    primaryUnit: '',
    secondaryLabel: 'Y',
    secondaryUnit: ''
  }
];

export const STEP2_TEMPLATE_FAMILIES: Step2TemplateFamily[] = [
  {
    id: 'dark-current',
    label: 'Dark current / Dark I-V',
    hint: '适合暗电流、暗态扫描和暗瞬态相关实验记录。',
    matchKeywords: [
      'dark current',
      'dark i-v',
      'dark iv',
      'dark j-v',
      '暗电流',
      '暗iv',
      '暗 i-v',
      '暗 j-v'
    ],
    recommendedConditions: [
      { name: 'bias voltage', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'temperature', defaultUnit: 'K', valueNatures: ['measured'] },
      { name: 'scan mode / step-bias mode', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'stabilization time', defaultUnit: 's', valueNatures: ['measured'] },
      { name: 'hysteresis / transient note', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'area-normalization note', defaultUnit: '', valueNatures: ['derived'] }
    ],
    recommendedMetrics: [
      { name: 'Idark', defaultUnit: 'A', valueNatures: ['measured'] },
      { name: 'jdark', defaultUnit: 'A/cm²', valueNatures: ['derived', 'calculated'] },
      { name: 'Idark drift', defaultUnit: 'A', valueNatures: ['measured', 'derived'] },
      { name: 'stabilization time', defaultUnit: 's', valueNatures: ['measured'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'Dark I-V',
        purposeType: 'iv',
        titleSuggestion: 'Dark I-V',
        primaryLabel: 'Voltage',
        primaryUnit: 'V',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      },
      {
        label: 'Dark transient',
        purposeType: 'custom',
        titleSuggestion: 'Dark transient',
        primaryLabel: 'Time',
        primaryUnit: 's',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      }
    ]
  },
  {
    id: 'responsivity-eqe-spectral',
    label: 'Responsivity / EQE / Spectral response',
    hint: '适合响应度、EQE 和光谱响应相关实验记录。',
    matchKeywords: [
      'responsivity',
      'eqe',
      'spectral response',
      'photoresponse spectrum',
      '响应度',
      '外量子效率',
      '光谱响应'
    ],
    recommendedConditions: [
      { name: 'bias voltage', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'temperature', defaultUnit: 'K', valueNatures: ['measured'] },
      { name: 'wavelength or spectral range', defaultUnit: 'nm', valueNatures: ['measured'] },
      { name: 'incident optical power / irradiance', defaultUnit: 'W', valueNatures: ['measured'] },
      { name: 'reference detector', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'aperture / beam coverage', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'modulation frequency', defaultUnit: 'Hz', valueNatures: ['measured'] },
      { name: 'dark-current monitoring status', defaultUnit: '', valueNatures: ['derived'] }
    ],
    recommendedMetrics: [
      { name: 'Responsivity', defaultUnit: 'A/W', valueNatures: ['measured', 'derived'] },
      { name: 'EQE', defaultUnit: '%', valueNatures: ['derived', 'calculated'] },
      { name: 'Peak responsivity', defaultUnit: 'A/W', valueNatures: ['measured', 'derived'] },
      { name: 'Peak EQE', defaultUnit: '%', valueNatures: ['derived', 'calculated'] },
      { name: 'Peak wavelength', defaultUnit: 'nm', valueNatures: ['measured'] },
      { name: 'Cutoff wavelength', defaultUnit: 'nm', valueNatures: ['derived'] },
      { name: 'FWHMR', defaultUnit: 'nm', valueNatures: ['derived'] },
      { name: 'FWHMEQE', defaultUnit: 'nm', valueNatures: ['derived'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'Responsivity spectrum',
        purposeType: 'responsivity',
        titleSuggestion: 'Responsivity spectrum',
        primaryLabel: 'Wavelength',
        primaryUnit: 'nm',
        secondaryLabel: 'Responsivity',
        secondaryUnit: 'A/W'
      },
      {
        label: 'EQE spectrum',
        purposeType: 'eqe',
        titleSuggestion: 'EQE spectrum',
        primaryLabel: 'Wavelength',
        primaryUnit: 'nm',
        secondaryLabel: 'EQE',
        secondaryUnit: '%'
      },
      {
        label: 'Reference optical power spectrum',
        purposeType: 'spectrum',
        titleSuggestion: 'Reference optical power spectrum',
        primaryLabel: 'Wavelength',
        primaryUnit: 'nm',
        secondaryLabel: 'Optical power',
        secondaryUnit: 'W'
      }
    ]
  },
  {
    id: 'gain-bandwidth',
    label: 'Photoconductive gain / Gain-bandwidth',
    hint: '适合增益、表观 EQE 和增益带宽相关记录。',
    matchKeywords: [
      'photoconductive gain',
      'gain-bandwidth',
      'gain bandwidth',
      'apparent eqe',
      '增益带宽',
      '光电导增益',
      '表观eqe'
    ],
    recommendedConditions: [
      { name: 'bias voltage', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'temperature', defaultUnit: 'K', valueNatures: ['measured'] },
      { name: 'wavelength', defaultUnit: 'nm', valueNatures: ['measured'] },
      { name: 'optical power', defaultUnit: 'W', valueNatures: ['measured'] },
      { name: 'injecting-electrode context', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'modulation mode', defaultUnit: '', valueNatures: ['derived'] }
    ],
    recommendedMetrics: [
      { name: 'Photoconductive gain', defaultUnit: '', valueNatures: ['derived', 'calculated'] },
      { name: 'Apparent EQE', defaultUnit: '%', valueNatures: ['apparent', 'derived'] },
      { name: 'Gain-bandwidth product', defaultUnit: 'Hz', valueNatures: ['derived', 'calculated'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'Gain vs optical power',
        purposeType: 'responsivity',
        titleSuggestion: 'Gain vs optical power',
        primaryLabel: 'Optical power',
        primaryUnit: 'W',
        secondaryLabel: 'Gain',
        secondaryUnit: ''
      },
      {
        label: 'Gain vs frequency',
        purposeType: 'custom',
        titleSuggestion: 'Gain vs frequency',
        primaryLabel: 'Frequency',
        primaryUnit: 'Hz',
        secondaryLabel: 'Gain',
        secondaryUnit: ''
      }
    ]
  },
  {
    id: 'linearity-ldr',
    label: 'Linearity / LDR',
    hint: '适合线性度、LDR 和功率扫描相关记录。',
    matchKeywords: [
      'linearity',
      'ldr',
      'linear dynamic range',
      'linearity criterion',
      '线性度',
      '动态范围'
    ],
    recommendedConditions: [
      { name: 'bias voltage', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'temperature', defaultUnit: 'K', valueNatures: ['measured'] },
      { name: 'wavelength', defaultUnit: 'nm', valueNatures: ['measured'] },
      { name: 'optical power scan range', defaultUnit: 'W', valueNatures: ['measured'] },
      { name: 'linearity criterion Δ', defaultUnit: '', valueNatures: ['derived'] }
    ],
    recommendedMetrics: [
      { name: 'α', defaultUnit: '', valueNatures: ['derived', 'calculated'] },
      { name: 'linearity classification', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'LDR', defaultUnit: 'dB', valueNatures: ['measured', 'derived'] },
      { name: 'LDRapp', defaultUnit: 'dB', valueNatures: ['apparent', 'derived'] },
      { name: 'Δ', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'Io,m', defaultUnit: 'A', valueNatures: ['measured'] },
      { name: 'Io,M', defaultUnit: 'A', valueNatures: ['measured'] },
      { name: 'Io,m,app', defaultUnit: 'A', valueNatures: ['apparent'] },
      { name: 'Io,M,app', defaultUnit: 'A', valueNatures: ['apparent'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'Io-Pi',
        purposeType: 'custom',
        titleSuggestion: 'Io-Pi',
        primaryLabel: 'Optical power',
        primaryUnit: 'W',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      },
      {
        label: 'Responsivity-Power',
        purposeType: 'responsivity',
        titleSuggestion: 'Responsivity-Power',
        primaryLabel: 'Optical power',
        primaryUnit: 'W',
        secondaryLabel: 'Responsivity',
        secondaryUnit: 'A/W'
      }
    ]
  },
  {
    id: 'noise',
    label: 'Noise',
    hint: '适合噪声谱、均方根噪声和频域噪声分析相关记录。',
    matchKeywords: ['noise psd', 'noise asd', 'noise spectrum', '噪声谱', '噪声asd', '噪声psd'],
    recommendedConditions: [
      { name: 'bias voltage', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'temperature', defaultUnit: 'K', valueNatures: ['measured'] },
      { name: 'frequency', defaultUnit: 'Hz', valueNatures: ['measured'] },
      { name: 'bandwidth', defaultUnit: 'Hz', valueNatures: ['measured'] },
      { name: 'area', defaultUnit: 'cm²', valueNatures: ['measured'] },
      { name: 'instrument-noise subtraction note', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'white-noise / pink-noise note', defaultUnit: '', valueNatures: ['derived'] }
    ],
    recommendedMetrics: [
      { name: 'Noise PSD', defaultUnit: 'A²/Hz', valueNatures: ['measured'] },
      { name: 'Noise ASD', defaultUnit: 'A/Hz^1/2', valueNatures: ['derived', 'calculated'] },
      { name: 'in,r.m.s.', defaultUnit: 'A', valueNatures: ['measured'] },
      { name: 'in,r.m.s.,theor.', defaultUnit: 'A', valueNatures: ['theoretical'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'Noise PSD vs frequency',
        purposeType: 'spectrum',
        titleSuggestion: 'Noise PSD vs frequency',
        primaryLabel: 'Frequency',
        primaryUnit: 'Hz',
        secondaryLabel: 'Noise PSD',
        secondaryUnit: 'A²/Hz'
      },
      {
        label: 'Noise ASD vs frequency',
        purposeType: 'spectrum',
        titleSuggestion: 'Noise ASD vs frequency',
        primaryLabel: 'Frequency',
        primaryUnit: 'Hz',
        secondaryLabel: 'Noise ASD',
        secondaryUnit: 'A/Hz^1/2'
      }
    ]
  },
  {
    id: 'nep-detectivity',
    label: 'NEP / Detectivity',
    hint: '适合 NEP、探测率和近噪声等效功率区域相关记录。',
    matchKeywords: [
      'nep',
      'detectivity',
      'specific detectivity',
      'd*',
      '探测率',
      '比探测率'
    ],
    recommendedConditions: [
      { name: 'bias voltage', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'temperature', defaultUnit: 'K', valueNatures: ['measured'] },
      { name: 'frequency', defaultUnit: 'Hz', valueNatures: ['measured'] },
      { name: 'bandwidth', defaultUnit: 'Hz', valueNatures: ['measured'] },
      { name: 'area', defaultUnit: 'cm²', valueNatures: ['measured'] },
      { name: 'optical power near NEP region', defaultUnit: 'W', valueNatures: ['measured'] },
      { name: 'responsivity reference condition', defaultUnit: '', valueNatures: ['derived'] }
    ],
    recommendedMetrics: [
      { name: 'NEP', defaultUnit: 'W/Hz^1/2', valueNatures: ['measured', 'derived'] },
      { name: 'NEPapp', defaultUnit: 'W/Hz^1/2', valueNatures: ['apparent', 'derived'] },
      { name: 'D', defaultUnit: 'Hz^1/2/W', valueNatures: ['derived', 'calculated'] },
      { name: 'Dapp', defaultUnit: 'Hz^1/2/W', valueNatures: ['apparent', 'derived'] },
      { name: 'D*', defaultUnit: 'Jones', valueNatures: ['derived', 'calculated'] },
      { name: 'D*_{B̄}', defaultUnit: 'Jones', valueNatures: ['derived', 'calculated'] },
      { name: 'D*theor.', defaultUnit: 'Jones', valueNatures: ['theoretical'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'Signal-to-noise vs optical power',
        purposeType: 'custom',
        titleSuggestion: 'Signal-to-noise vs optical power',
        primaryLabel: 'Optical power',
        primaryUnit: 'W',
        secondaryLabel: 'SNR',
        secondaryUnit: ''
      },
      {
        label: 'Responsivity near NEP',
        purposeType: 'responsivity',
        titleSuggestion: 'Responsivity near NEP',
        primaryLabel: 'Wavelength',
        primaryUnit: 'nm',
        secondaryLabel: 'Responsivity',
        secondaryUnit: 'A/W'
      }
    ]
  },
  {
    id: 'speed-response',
    label: 'Speed of response',
    hint: '适合瞬态、脉冲和频响速度相关记录。',
    matchKeywords: [
      'response speed',
      'speed of response',
      'rise time',
      'fall time',
      'frequency response',
      '响应速度',
      '上升时间',
      '下降时间',
      '频响'
    ],
    recommendedConditions: [
      { name: 'bias voltage', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'temperature', defaultUnit: 'K', valueNatures: ['measured'] },
      { name: 'wavelength', defaultUnit: 'nm', valueNatures: ['measured'] },
      { name: 'continuous-wave optical power', defaultUnit: 'W', valueNatures: ['measured'] },
      { name: 'load resistance / impedance', defaultUnit: 'Ω', valueNatures: ['measured'] },
      { name: 'excitation type (rectangular pulse / impulse / sinusoidal)', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'pulse energy', defaultUnit: 'J', valueNatures: ['measured'] },
      { name: 'pulse width', defaultUnit: 's', valueNatures: ['measured'] }
    ],
    recommendedMetrics: [
      { name: 'τrise', defaultUnit: 's', valueNatures: ['measured'] },
      { name: 'τfall', defaultUnit: 's', valueNatures: ['measured'] },
      { name: 'τr,p', defaultUnit: 's', valueNatures: ['derived'] },
      { name: 'τr,δ', defaultUnit: 's', valueNatures: ['derived'] },
      { name: 'f3dB,sin', defaultUnit: 'Hz', valueNatures: ['measured'] },
      { name: 'f3dB,δ', defaultUnit: 'Hz', valueNatures: ['derived'] },
      { name: 'R0', defaultUnit: 'Ω', valueNatures: ['derived'] },
      { name: 'Qδ / Eδ', defaultUnit: '', valueNatures: ['derived', 'calculated'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'Pulse transient',
        purposeType: 'custom',
        titleSuggestion: 'Pulse transient',
        primaryLabel: 'Time',
        primaryUnit: 's',
        secondaryLabel: 'Signal',
        secondaryUnit: ''
      },
      {
        label: 'Impulse response',
        purposeType: 'custom',
        titleSuggestion: 'Impulse response',
        primaryLabel: 'Time',
        primaryUnit: 's',
        secondaryLabel: 'Signal',
        secondaryUnit: ''
      },
      {
        label: 'Frequency response',
        purposeType: 'custom',
        titleSuggestion: 'Frequency response',
        primaryLabel: 'Frequency',
        primaryUnit: 'Hz',
        secondaryLabel: 'Response',
        secondaryUnit: ''
      }
    ]
  },
  {
    id: 'stability-reliability',
    label: 'Stability / Reliability',
    hint: '适合寿命、应力退化和长期稳定性相关记录。',
    matchKeywords: [
      'stability',
      'reliability',
      'lifetime',
      'degradation',
      '稳定性',
      '可靠性',
      '寿命',
      '退化'
    ],
    recommendedConditions: [
      { name: 'stress type (temperature / humidity / bias / continuous illumination / cycled illumination)', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'temperature', defaultUnit: 'K', valueNatures: ['measured'] },
      { name: 'humidity', defaultUnit: '%RH', valueNatures: ['measured'] },
      { name: 'bias', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'optical power', defaultUnit: 'W', valueNatures: ['measured'] },
      { name: 'total duration', defaultUnit: 'h', valueNatures: ['measured'] },
      { name: 'interval checkpoints', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'batch size', defaultUnit: '', valueNatures: ['derived'] }
    ],
    recommendedMetrics: [
      { name: 'Normalized responsivity', defaultUnit: '', valueNatures: ['derived', 'calculated'] },
      { name: 'Lifetime', defaultUnit: 'h', valueNatures: ['derived'] },
      { name: 'T80', defaultUnit: 'h', valueNatures: ['derived'] },
      { name: 'Degradation rate', defaultUnit: '', valueNatures: ['derived', 'calculated'] },
      { name: 'Activation energy', defaultUnit: 'eV', valueNatures: ['derived', 'calculated'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'Normalized responsivity vs time',
        purposeType: 'responsivity',
        titleSuggestion: 'Normalized responsivity vs time',
        primaryLabel: 'Time',
        primaryUnit: 'h',
        secondaryLabel: 'Normalized responsivity',
        secondaryUnit: ''
      },
      {
        label: 'Lifetime vs temperature',
        purposeType: 'custom',
        titleSuggestion: 'Lifetime vs temperature',
        primaryLabel: 'Temperature',
        primaryUnit: 'K',
        secondaryLabel: 'Lifetime',
        secondaryUnit: 'h'
      },
      {
        label: 'Current vs time under stress',
        purposeType: 'custom',
        titleSuggestion: 'Current vs time under stress',
        primaryLabel: 'Time',
        primaryUnit: 'h',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      }
    ]
  },
  {
    id: 'iv',
    label: 'I-V',
    hint: '适合通用 I-V、光照 I-V 和暗态 I-V 扫描记录。',
    matchKeywords: [
      'i-v',
      'j-v',
      'iv curve',
      'current-voltage',
      '电流电压',
      '光照iv',
      'illuminated i-v'
    ],
    recommendedConditions: [
      { name: 'bias sweep range', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'step size', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'sweep direction', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'temperature', defaultUnit: 'K', valueNatures: ['measured'] },
      { name: 'illumination state', defaultUnit: '', valueNatures: ['measured'] },
      { name: 'wavelength', defaultUnit: 'nm', valueNatures: ['measured'] },
      { name: 'incident optical power', defaultUnit: 'W', valueNatures: ['measured'] }
    ],
    recommendedMetrics: [
      { name: 'Dark current', defaultUnit: 'A', valueNatures: ['measured'] },
      { name: 'Photocurrent', defaultUnit: 'A', valueNatures: ['measured'] },
      { name: 'Rectification ratio', defaultUnit: '', valueNatures: ['derived', 'calculated'] },
      { name: 'On/Off ratio', defaultUnit: '', valueNatures: ['derived', 'calculated'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'I-V',
        purposeType: 'iv',
        titleSuggestion: 'I-V',
        primaryLabel: 'Voltage',
        primaryUnit: 'V',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      },
      {
        label: 'illuminated I-V',
        purposeType: 'iv',
        titleSuggestion: 'illuminated I-V',
        primaryLabel: 'Voltage',
        primaryUnit: 'V',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      },
      {
        label: 'dark I-V',
        purposeType: 'iv',
        titleSuggestion: 'dark I-V',
        primaryLabel: 'Voltage',
        primaryUnit: 'V',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      }
    ]
  },
  {
    id: 'power-dependent-response',
    label: 'Power-dependent response',
    hint: '适合光功率依赖响应、响应度-功率和 α / LDR 相关记录。',
    matchKeywords: [
      'power-dependent',
      'power dependent',
      'power dependence',
      'optical power dependence',
      '功率依赖',
      '光功率依赖'
    ],
    recommendedConditions: [
      { name: 'wavelength', defaultUnit: 'nm', valueNatures: ['measured'] },
      { name: 'bias voltage', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'temperature', defaultUnit: 'K', valueNatures: ['measured'] },
      { name: 'optical power range', defaultUnit: 'W', valueNatures: ['measured'] }
    ],
    recommendedMetrics: [
      { name: 'α', defaultUnit: '', valueNatures: ['derived', 'calculated'] },
      { name: 'Responsivity', defaultUnit: 'A/W', valueNatures: ['measured', 'derived'] },
      { name: 'LDR', defaultUnit: 'dB', valueNatures: ['derived', 'calculated'] },
      { name: 'On/Off ratio', defaultUnit: '', valueNatures: ['derived', 'calculated'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'Photocurrent-Power',
        purposeType: 'custom',
        titleSuggestion: 'Photocurrent-Power',
        primaryLabel: 'Optical power',
        primaryUnit: 'W',
        secondaryLabel: 'Photocurrent',
        secondaryUnit: 'A'
      },
      {
        label: 'Responsivity-Power',
        purposeType: 'responsivity',
        titleSuggestion: 'Responsivity-Power',
        primaryLabel: 'Optical power',
        primaryUnit: 'W',
        secondaryLabel: 'Responsivity',
        secondaryUnit: 'A/W'
      }
    ]
  },
  {
    id: 'temperature-dependent-response',
    label: 'Temperature-dependent response',
    hint: '适合变温暗电流、响应度和探测率相关记录。',
    matchKeywords: [
      'temperature-dependent',
      'temperature dependent',
      'temperature dependence',
      '变温',
      '温度依赖',
      '温度响应'
    ],
    recommendedConditions: [
      { name: 'temperature range', defaultUnit: 'K', valueNatures: ['measured'] },
      { name: 'bias voltage', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'wavelength', defaultUnit: 'nm', valueNatures: ['measured'] },
      { name: 'incident optical power', defaultUnit: 'W', valueNatures: ['measured'] }
    ],
    recommendedMetrics: [
      { name: 'Dark current', defaultUnit: 'A', valueNatures: ['measured'] },
      { name: 'Responsivity', defaultUnit: 'A/W', valueNatures: ['measured', 'derived'] },
      { name: 'D*', defaultUnit: 'Jones', valueNatures: ['derived', 'calculated'] },
      { name: 'EQE', defaultUnit: '%', valueNatures: ['derived', 'calculated'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'Responsivity-Temperature',
        purposeType: 'responsivity',
        titleSuggestion: 'Responsivity-Temperature',
        primaryLabel: 'Temperature',
        primaryUnit: 'K',
        secondaryLabel: 'Responsivity',
        secondaryUnit: 'A/W'
      },
      {
        label: 'Current-Temperature',
        purposeType: 'custom',
        titleSuggestion: 'Current-Temperature',
        primaryLabel: 'Temperature',
        primaryUnit: 'K',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      }
    ]
  },
  {
    id: 'on-off-cycling',
    label: 'On-Off cycling / switching stability',
    hint: '适合开关循环、时域切换和周期稳定性相关记录。',
    matchKeywords: [
      'on-off cycling',
      'switching stability',
      'on/off cycling',
      'cycling response',
      '开关循环',
      '循环稳定性',
      'switching'
    ],
    recommendedConditions: [
      { name: 'bias voltage', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'wavelength', defaultUnit: 'nm', valueNatures: ['measured'] },
      { name: 'incident optical power', defaultUnit: 'W', valueNatures: ['measured'] },
      { name: 'modulation frequency', defaultUnit: 'Hz', valueNatures: ['measured'] },
      { name: 'duty cycle', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'cycle count', defaultUnit: '', valueNatures: ['measured'] }
    ],
    recommendedMetrics: [
      { name: 'On current', defaultUnit: 'A', valueNatures: ['measured'] },
      { name: 'Off current', defaultUnit: 'A', valueNatures: ['measured'] },
      { name: 'On/Off ratio', defaultUnit: '', valueNatures: ['derived', 'calculated'] },
      { name: 'cycle-to-cycle drift', defaultUnit: '', valueNatures: ['derived'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'On-Off cycling',
        purposeType: 'custom',
        titleSuggestion: 'On-Off cycling',
        primaryLabel: 'Time',
        primaryUnit: 's',
        secondaryLabel: 'Current',
        secondaryUnit: 'A'
      },
      {
        label: 'Time-domain switching response',
        purposeType: 'custom',
        titleSuggestion: 'Time-domain switching response',
        primaryLabel: 'Time',
        primaryUnit: 's',
        secondaryLabel: 'Signal',
        secondaryUnit: ''
      }
    ]
  },
  {
    id: 'xrd',
    label: 'XRD',
    hint: '适合 XRD 结构表征相关记录。',
    matchKeywords: ['xrd', 'x-ray diffraction', '衍射', 'xrd图谱'],
    recommendedConditions: [
      { name: '2θ scan range', defaultUnit: '°', valueNatures: ['measured'] },
      { name: 'step size', defaultUnit: '°', valueNatures: ['measured'] },
      { name: 'scan speed', defaultUnit: '°/min', valueNatures: ['measured'] },
      { name: 'source', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'tube voltage/current', defaultUnit: '', valueNatures: ['measured'] },
      { name: 'sample treatment note', defaultUnit: '', valueNatures: ['derived'] }
    ],
    recommendedMetrics: [
      { name: 'peak position', defaultUnit: '°', valueNatures: ['measured'] },
      { name: 'FWHM', defaultUnit: '°', valueNatures: ['derived', 'calculated'] },
      { name: 'grain size', defaultUnit: 'nm', valueNatures: ['derived', 'calculated'] },
      { name: 'plane index', defaultUnit: '', valueNatures: ['derived'] },
      { name: 'phase identification note', defaultUnit: '', valueNatures: ['derived'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'XRD',
        purposeType: 'xrd',
        titleSuggestion: 'XRD',
        primaryLabel: '2θ',
        primaryUnit: '°',
        secondaryLabel: 'Intensity',
        secondaryUnit: 'a.u.'
      }
    ]
  },
  {
    id: 'material-optical-characterization',
    label: 'Material optical characterization',
    hint: '适合吸收、透过、PL、Raman 等材料光学表征记录。',
    matchKeywords: [
      'absorption',
      'transmission',
      'photoluminescence',
      'pl spectrum',
      'raman',
      'optical characterization',
      '吸收',
      '透过',
      '荧光',
      '拉曼',
      '光学表征'
    ],
    recommendedConditions: [
      { name: 'wavelength range', defaultUnit: 'nm', valueNatures: ['measured'] },
      { name: 'excitation wavelength', defaultUnit: 'nm', valueNatures: ['measured'] },
      { name: 'excitation power', defaultUnit: 'W', valueNatures: ['measured'] },
      { name: 'integration time', defaultUnit: 's', valueNatures: ['measured'] },
      { name: 'temperature', defaultUnit: 'K', valueNatures: ['measured'] },
      { name: 'atmosphere', defaultUnit: '', valueNatures: ['derived'] }
    ],
    recommendedMetrics: [
      { name: 'peak wavelength', defaultUnit: 'nm', valueNatures: ['measured'] },
      { name: 'FWHM', defaultUnit: 'nm', valueNatures: ['derived'] },
      { name: 'peak intensity', defaultUnit: 'a.u.', valueNatures: ['measured'] },
      { name: 'peak shift', defaultUnit: 'nm', valueNatures: ['derived', 'calculated'] }
    ],
    recommendedStructuredBlocks: [
      {
        label: 'Absorption spectrum',
        purposeType: 'spectrum',
        titleSuggestion: 'Absorption spectrum',
        primaryLabel: 'Wavelength',
        primaryUnit: 'nm',
        secondaryLabel: 'Absorbance',
        secondaryUnit: 'a.u.'
      },
      {
        label: 'Transmission spectrum',
        purposeType: 'spectrum',
        titleSuggestion: 'Transmission spectrum',
        primaryLabel: 'Wavelength',
        primaryUnit: 'nm',
        secondaryLabel: 'Transmission',
        secondaryUnit: 'a.u.'
      },
      {
        label: 'PL spectrum',
        purposeType: 'spectrum',
        titleSuggestion: 'PL spectrum',
        primaryLabel: 'Wavelength',
        primaryUnit: 'nm',
        secondaryLabel: 'Intensity',
        secondaryUnit: 'a.u.'
      },
      {
        label: 'Raman spectrum',
        purposeType: 'spectrum',
        titleSuggestion: 'Raman spectrum',
        primaryLabel: 'Wavelength',
        primaryUnit: 'nm',
        secondaryLabel: 'Intensity',
        secondaryUnit: 'a.u.'
      }
    ]
  },
  {
    id: 'generic',
    label: '通用实验',
    hint: '当前测试项目未命中专用模板，以下为保守的 Step 2 通用建议，均可自由修改。',
    matchKeywords: [],
    recommendedConditions: [
      { name: 'temperature', defaultUnit: 'K', valueNatures: ['measured'] },
      { name: 'bias voltage', defaultUnit: 'V', valueNatures: ['measured'] },
      { name: 'optical power', defaultUnit: 'W', valueNatures: ['measured'] }
    ],
    recommendedMetrics: [
      { name: 'Response metric', defaultUnit: '', valueNatures: ['measured'] },
      { name: 'Derived metric', defaultUnit: '', valueNatures: ['derived'] }
    ],
    recommendedStructuredBlocks: GENERIC_STRUCTURED_BLOCKS
  }
];

export function resolveStep2TemplateFamily(testProject: string) {
  const normalized = testProject.trim().toLowerCase();
  const genericFamily = STEP2_TEMPLATE_FAMILIES.find((family) => family.id === 'generic') || null;

  if (!normalized) {
    return genericFamily;
  }

  const rankedFamilies = STEP2_TEMPLATE_FAMILIES
    .filter((family) => family.id !== 'generic')
    .map((family, index) => {
      const matchedKeywords = family.matchKeywords.filter((keyword) =>
        normalized.includes(keyword.toLowerCase())
      );
      const longestMatch = matchedKeywords.reduce(
        (maxLength, keyword) => Math.max(maxLength, keyword.length),
        0
      );

      return {
        family,
        index,
        matchCount: matchedKeywords.length,
        longestMatch
      };
    })
    .filter((entry) => entry.matchCount > 0)
    .sort((left, right) => {
      if (right.matchCount !== left.matchCount) {
        return right.matchCount - left.matchCount;
      }

      if (right.longestMatch !== left.longestMatch) {
        return right.longestMatch - left.longestMatch;
      }

      return left.index - right.index;
    });

  return rankedFamilies[0]?.family || genericFamily;
}

export function getStructuredBlockPurposeLabel(value: StructuredBlockPurpose | undefined) {
  return (
    STRUCTURED_BLOCK_PURPOSE_OPTIONS.find((option) => option.value === (value || ''))?.label ||
    '未指定'
  );
}

export function getValueNatureLabelText(labels: ValueNatureLabel[] | undefined) {
  if (!labels?.length) return '';
  return labels.join(' / ');
}
