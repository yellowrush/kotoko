import type {
  AuthorityLevel,
  ContentStatus,
  Policy,
  PolicyRule,
} from '@kodoko/domain';

export type PolicyDTO = Policy & {
  locale: string;
  contextHint: string;
};

type PolicyText = {
  locale: 'ja' | 'zh-CN' | 'zh-TW';
  title: string;
  contextHint: string;
};

type PolicySeed = {
  id: string;
  authorityLevel: AuthorityLevel;
  municipalityCode?: string;
  eligibilityRule: PolicyRule;
  applicationStartAt?: string;
  applicationDeadlineAt?: string;
  officialUrl: string;
  texts: PolicyText[];
};

const sourceCheckedAt = '2026-01-10T00:00:00.000Z';

function buildPolicy(seed: PolicySeed): PolicyDTO[] {
  return seed.texts.map((text) => ({
    id: seed.id,
    title: text.title,
    contextHint: text.contextHint,
    authorityLevel: seed.authorityLevel,
    municipalityCode: seed.municipalityCode,
    eligibilityRule: seed.eligibilityRule,
    applicationStartAt: seed.applicationStartAt,
    applicationDeadlineAt: seed.applicationDeadlineAt,
    officialUrl: seed.officialUrl,
    sourceCheckedAt,
    version: 1,
    status: 'published' as ContentStatus,
    locale: text.locale,
  }));
}

const seeds: PolicySeed[] = [
  {
    id: 'p-child-allowance',
    authorityLevel: 'national',
    eligibilityRule: {
      all: [
        { field: 'child.ageMonths', operator: 'gte', value: 0 },
        { field: 'child.ageMonths', operator: 'lte', value: 216 },
      ],
    },
    officialUrl: 'https://www.cfa.go.jp',
    texts: [
      {
        locale: 'ja',
        title: '児童手当',
        contextHint:
          '子育て世帯に支給される手当です。令和6年10月から制度が拡充され、所得制限が見直されました。申請窓口はお住まいの市区町村です。',
      },
      {
        locale: 'zh-CN',
        title: '儿童津贴',
        contextHint:
          '发放给育儿家庭的一种津贴。自令和6年10月起制度已扩充，所得限制也已调整。申请窗口为你居住的市区町村。',
      },
      {
        locale: 'zh-TW',
        title: '兒童津貼',
        contextHint:
          '發放給育兒家庭的津貼。自令和6年10月起制度已擴充、所得限制也已調整。申請窗口為你居住的市町村。',
      },
    ],
  },
  {
    id: 'p-medical-subsidy',
    authorityLevel: 'prefecture',
    eligibilityRule: {
      all: [
        { field: 'child.ageMonths', operator: 'gte', value: 0 },
        { field: 'child.ageMonths', operator: 'lte', value: 216 },
      ],
    },
    officialUrl: 'https://www.metro.tokyo.lg.jp',
    texts: [
      {
        locale: 'ja',
        title: '子ども医療費助成（東京都）',
        contextHint:
          '保険診療の自己負担分を助成する東京都の制度です。年齢や所得によって上限額が異なるため、自治体窓口で確認が必要です。',
      },
      {
        locale: 'zh-CN',
        title: '儿童医疗费补助（东京都）',
        contextHint:
          '补贴看诊时自费部分的东京都制度。根据年龄与家庭收入，补助上限会有所不同，请通过住所地窗口确认。',
      },
      {
        locale: 'zh-TW',
        title: '兒童醫療費補助（東京都）',
        contextHint:
          '補貼看診自費部分的東京都制度。依年齡與家庭收入，補助上限會有所不同，請透過居住地窗口確認。',
      },
    ],
  },
  {
    id: 'p-diaper-support',
    authorityLevel: 'municipality',
    municipalityCode: '13113',
    eligibilityRule: {
      all: [
        { field: 'child.ageMonths', operator: 'lte', value: 36 },
        { field: 'user.municipalityCode', operator: 'eq', value: '13113' },
      ],
    },
    applicationStartAt: '2026-04-01T00:00:00.000Z',
    applicationDeadlineAt: '2027-03-31T00:00:00.000Z',
    officialUrl: 'https://www.city.shibuya.lg.jp',
    texts: [
      {
        locale: 'ja',
        title: 'おむつ定期便支援（渋谷区の例）',
        contextHint:
          '乳児がいる家庭向けの支援事業の一例です。給付内容は自治体ごとに異なるため、必ず公式ページで内容を確認してください。',
      },
      {
        locale: 'zh-CN',
        title: '尿布配送支援（渋谷区的例子）',
        contextHint:
          '面向有婴儿家庭的支援项目示例。各自治体的给付内容各不相同，请务必通过官方页面确认。',
      },
      {
        locale: 'zh-TW',
        title: '尿布配送支援（澀谷區的範例）',
        contextHint:
          '面向有嬰兒家庭的支援項目範例。各自治體的補助內容各不相同，請務必透過官方頁面確認。',
      },
    ],
  },
  {
    id: 'p-weaning-class',
    authorityLevel: 'municipality',
    municipalityCode: '13106',
    eligibilityRule: {
      all: [
        { field: 'child.ageMonths', operator: 'gte', value: 4 },
        { field: 'child.ageMonths', operator: 'lte', value: 12 },
        { field: 'user.municipalityCode', operator: 'eq', value: '13106' },
      ],
    },
    officialUrl: 'https://www.city.taito.lg.jp',
    texts: [
      {
        locale: 'ja',
        title: '離乳食ふれあい講座（台東区の例）',
        contextHint:
          '離乳食の進め方を学べる講座の例です。開催時期は年齢に合わせて変わります。詳細は自治体の公式ページをご確認ください。',
      },
      {
        locale: 'zh-CN',
        title: '辅食育儿讲座（台东区的例子）',
        contextHint:
          '学习辅食添加方法的讲座示例。举办时间会随月龄变化。详情请确认官方页面。',
      },
      {
        locale: 'zh-TW',
        title: '離乳食親子講座（台東區的範例）',
        contextHint:
          '學習離乳食進度的講座範例。舉辦時間依年齡有所變化。詳情請確認官方頁面。',
      },
    ],
  },
];

export const seedPolicies: PolicyDTO[] = seeds.flatMap(buildPolicy);