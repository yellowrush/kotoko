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

const sourceCheckedAt = '2026-08-08T00:00:00.000Z';

const officialUrls = {
  childAllowance: 'https://www.cfa.go.jp/policies/kokoseido/jidouteate',
  tokyoMedical: 'https://www.metro.tokyo.lg.jp',
  shibuya: 'https://www.city.shibuya.lg.jp',
  taito: 'https://www.city.taito.lg.jp',
  shibuyaChildMedical:
    'https://www.city.shibuya.tokyo.jp/kodomo/kodomo-teate-josei/iryo-josei/kodomo_ij.html',
  shibuyaHouseworkSupport:
    'https://www.city.shibuya.tokyo.jp/kodomo/hoiku/hoiku-service/kajisapota.html',
  taitoWeaningClass:
    'https://www.city.taito.lg.jp/kosodatekyouiku/kosodate/mokutei/kouzaevent/hokenjo/rinyushokukoshukai.html',
  vaccine:
    'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/kekkaku-kansenshou/yobou-sesshu/index.html',
  vaccine2Months: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/vaccine_for_children/months-2.html',
  healthCheckups: 'https://www.cfa.go.jp/policies/boshihoken/nyuyojikenshin',
  childcareSystem: 'https://www.cfa.go.jp/policies/kokoseido/sukusuku',
};

function ageRange(min: number, max: number): PolicyRule {
  return {
    all: [
      { field: 'child.ageMonths', operator: 'gte', value: min },
      { field: 'child.ageMonths', operator: 'lte', value: max },
    ],
  };
}

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
    id: 'p-routine-vaccination-2-month-start',
    authorityLevel: 'national',
    eligibilityRule: ageRange(2, 4),
    officialUrl: officialUrls.vaccine2Months,
    texts: [
      {
        locale: 'ja',
        title: '生後2か月からの定期接種を確認',
        contextHint:
          'ロタウイルス、5種混合、小児用肺炎球菌、B型肝炎などの開始時期です。自治体通知と母子健康手帳で予約先と接種間隔を確認してください。',
      },
      {
        locale: 'zh-CN',
        title: '确认2个月龄开始的定期接种',
        contextHint:
          '这是轮状病毒、五联疫苗、儿童肺炎球菌、乙肝等疫苗开始接种的时期。请用自治体通知和母子健康手册确认预约地点和接种间隔。',
      },
      {
        locale: 'zh-TW',
        title: '確認2個月齡開始的定期接種',
        contextHint:
          '這是輪狀病毒、五合一疫苗、兒童肺炎球菌、B型肝炎等疫苗開始接種的時期。請用自治體通知與母子健康手帳確認預約地點與接種間隔。',
      },
    ],
  },
  {
    id: 'p-routine-vaccination-1-year',
    authorityLevel: 'national',
    eligibilityRule: ageRange(12, 15),
    officialUrl: officialUrls.vaccine,
    texts: [
      {
        locale: 'ja',
        title: '1歳ごろのMR・水痘・追加接種を確認',
        contextHint:
          '1歳ごろはMR、水痘、5種混合や小児用肺炎球菌の追加接種を確認する時期です。体調や接種履歴に合わせて医療機関へ相談してください。',
      },
      {
        locale: 'zh-CN',
        title: '确认1岁左右的MR、水痘和追加接种',
        contextHint:
          '1岁左右需要确认MR、水痘、五联疫苗和儿童肺炎球菌的追加接种。请结合身体状态和接种记录咨询医疗机构。',
      },
      {
        locale: 'zh-TW',
        title: '確認1歲左右的MR、水痘與追加接種',
        contextHint:
          '1歲左右需要確認MR、水痘、五合一疫苗與兒童肺炎球菌的追加接種。請搭配身體狀態與接種紀錄諮詢醫療機構。',
      },
    ],
  },
  {
    id: 'p-routine-vaccination-3-year-je',
    authorityLevel: 'national',
    eligibilityRule: ageRange(36, 47),
    officialUrl: officialUrls.vaccine,
    texts: [
      {
        locale: 'ja',
        title: '3歳からの日本脳炎ワクチンを確認',
        contextHint:
          '3歳ごろから日本脳炎ワクチンの案内を確認します。自治体通知、母子健康手帳、医療機関の予定に沿って進めてください。',
      },
      {
        locale: 'zh-CN',
        title: '确认3岁开始的日本脑炎疫苗',
        contextHint:
          '3岁左右开始需要确认日本脑炎疫苗通知。请按照自治体通知、母子健康手册和医疗机构安排进行。',
      },
      {
        locale: 'zh-TW',
        title: '確認3歲開始的日本腦炎疫苗',
        contextHint:
          '3歲左右開始需要確認日本腦炎疫苗通知。請依照自治體通知、母子健康手帳與醫療機構安排進行。',
      },
    ],
  },
  {
    id: 'p-routine-vaccination-school-entry-mr',
    authorityLevel: 'national',
    eligibilityRule: ageRange(60, 72),
    officialUrl: officialUrls.vaccine,
    texts: [
      {
        locale: 'ja',
        title: '小学校入学前のMR第2期を確認',
        contextHint:
          '5歳ごろから、小学校入学前のMR第2期を確認する時期です。対象年度や接種期限は自治体通知で確認してください。',
      },
      {
        locale: 'zh-CN',
        title: '确认小学入学前的MR第2期',
        contextHint:
          '5岁左右开始，需要确认小学入学前的MR第2期。对象年度和接种期限请以自治体通知为准。',
      },
      {
        locale: 'zh-TW',
        title: '確認小學入學前的MR第2期',
        contextHint:
          '5歲左右開始，需要確認小學入學前的MR第2期。對象年度與接種期限請以自治體通知為準。',
      },
    ],
  },
  {
    id: 'p-infant-health-checkups',
    authorityLevel: 'municipality',
    eligibilityRule: ageRange(1, 72),
    officialUrl: officialUrls.healthCheckups,
    texts: [
      {
        locale: 'ja',
        title: '乳幼児健診の通知を確認',
        contextHint:
          '1歳6か月児健診と3歳児健診は市町村で実施されます。地域によって1か月、3〜6か月、9〜11か月、5歳健診も案内されます。',
      },
      {
        locale: 'zh-CN',
        title: '确认乳幼儿健诊通知',
        contextHint:
          '1岁6个月健诊和3岁健诊由市町村实施。部分地区也会通知1个月、3-6个月、9-11个月、5岁健诊。',
      },
      {
        locale: 'zh-TW',
        title: '確認乳幼兒健診通知',
        contextHint:
          '1歲6個月健診與3歲健診由市町村實施。部分地區也會通知1個月、3-6個月、9-11個月、5歲健診。',
      },
    ],
  },
  {
    id: 'p-childcare-application-prep',
    authorityLevel: 'municipality',
    eligibilityRule: ageRange(6, 72),
    officialUrl: officialUrls.childcareSystem,
    texts: [
      {
        locale: 'ja',
        title: '保育園・幼稚園の申込時期を確認',
        contextHint:
          '保育所などは市町村の保育認定と利用調整、幼稚園などは施設への直接申込が基本です。締切と必要書類は自治体ごとに異なります。',
      },
      {
        locale: 'zh-CN',
        title: '确认保育园/幼稚园申请时期',
        contextHint:
          '保育所等通常需要市町村保育认定和利用调整，幼稚园等以直接向设施申请为基本流程。截止日期和材料因自治体而异。',
      },
      {
        locale: 'zh-TW',
        title: '確認保育園/幼稚園申請時期',
        contextHint:
          '保育所等通常需要市町村保育認定與利用調整，幼稚園等以直接向設施申請為基本流程。截止日期與資料因自治體而異。',
      },
    ],
  },
  {
    id: 'p-child-allowance',
    authorityLevel: 'national',
    eligibilityRule: ageRange(0, 216),
    officialUrl: officialUrls.childAllowance,
    texts: [
      {
        locale: 'ja',
        title: '児童手当',
        contextHint:
          '高校生年代までのこどもを養育している家庭が対象です。出生、転入、養育状況の変更があった場合は、自治体で必要な手続きを確認してください。',
      },
      {
        locale: 'zh-CN',
        title: '儿童津贴',
        contextHint:
          '抚养高中年龄段以下儿童的家庭可确认该制度。出生、迁入或抚养情况变化时，请向自治体确认必要手续。',
      },
      {
        locale: 'zh-TW',
        title: '兒童津貼',
        contextHint:
          '撫養高中年齡段以下兒童的家庭可確認此制度。出生、遷入或撫養情況變更時，請向自治體確認必要手續。',
      },
    ],
  },
  {
    id: 'p-medical-subsidy',
    authorityLevel: 'prefecture',
    eligibilityRule: ageRange(0, 216),
    officialUrl: officialUrls.tokyoMedical,
    texts: [
      {
        locale: 'ja',
        title: 'こども医療費助成',
        contextHint:
          '都道府県や市区町村により、対象年齢、自己負担、所得制限、申請方法が異なります。保険証や医療証の扱いを確認しましょう。',
      },
      {
        locale: 'zh-CN',
        title: '儿童医疗费助成',
        contextHint:
          '对象年龄、自付金额、收入限制和申请方式会因都道府县及市区町村不同而变化。请确认健康保险证和医疗证的使用方式。',
      },
      {
        locale: 'zh-TW',
        title: '兒童醫療費助成',
        contextHint:
          '對象年齡、自付金額、收入限制與申請方式會因都道府縣及市區町村不同而變化。請確認健康保險證與醫療證的使用方式。',
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
    officialUrl: officialUrls.shibuya,
    texts: [
      {
        locale: 'ja',
        title: 'おむつ関連支援（渋谷区）',
        contextHint:
          '渋谷区の乳幼児家庭向け支援です。対象年齢、配布内容、申請方法は年度や家庭状況で変わるため、区の公式案内を確認してください。',
      },
      {
        locale: 'zh-CN',
        title: '尿布相关支援（涩谷区）',
        contextHint:
          '面向涩谷区乳幼儿家庭的支援。对象年龄、发放内容和申请方式可能因年度和家庭情况变化，请确认区官方说明。',
      },
      {
        locale: 'zh-TW',
        title: '尿布相關支援（澀谷區）',
        contextHint:
          '面向澀谷區乳幼兒家庭的支援。對象年齡、發放內容與申請方式可能因年度和家庭情況變化，請確認區官方說明。',
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
    officialUrl: officialUrls.taito,
    texts: [
      {
        locale: 'ja',
        title: '離乳食講習会（台東区）',
        contextHint:
          '離乳食の始め方や進め方を相談できる講習会です。対象月齢、予約要否、開催日程は区の公式案内を確認してください。',
      },
      {
        locale: 'zh-CN',
        title: '辅食讲座（台东区）',
        contextHint:
          '可咨询辅食开始和推进方式的讲座。对象月龄、是否需要预约、举办日期请确认区官方说明。',
      },
      {
        locale: 'zh-TW',
        title: '副食品講座（台東區）',
        contextHint:
          '可諮詢副食品開始與推進方式的講座。對象月齡、是否需要預約、舉辦日期請確認區官方說明。',
      },
    ],
  },
];

const replacedPolicyIds = new Set([
  'p-medical-subsidy',
  'p-diaper-support',
  'p-weaning-class',
]);

const verifiedReplacementSeeds: PolicySeed[] = [
  {
    id: 'p-medical-subsidy',
    authorityLevel: 'municipality',
    municipalityCode: '13113',
    eligibilityRule: {
      all: [
        { field: 'child.ageMonths', operator: 'gte', value: 0 },
        { field: 'child.ageMonths', operator: 'lte', value: 216 },
        { field: 'user.municipalityCode', operator: 'eq', value: '13113' },
      ],
    },
    officialUrl: officialUrls.shibuyaChildMedical,
    texts: [
      {
        locale: 'ja',
        title: '子ども医療費助成（渋谷区）',
        contextHint:
          '渋谷区に住民登録があり、日本の健康保険に加入している子どもは、マル乳・マル子・マル青の医療証を確認してください。転入、保険変更、有効期限は区公式ページで確認が必要です。',
      },
      {
        locale: 'zh-CN',
        title: '儿童医疗费助成（涩谷区）',
        contextHint:
          '在涩谷区有住民登记、且加入日本健康保险的儿童，请确认マル乳、マル子、マル青医疗证。搬入、保险变更和有效期以区官网说明为准。',
      },
      {
        locale: 'zh-TW',
        title: '兒童醫療費助成（澀谷區）',
        contextHint:
          '在澀谷區有住民登記、且加入日本健康保險的兒童，請確認マル乳、マル子、マル青醫療證。遷入、保險變更和有效期限以區官方頁面為準。',
      },
    ],
  },
  {
    id: 'p-shibuya-housework-support',
    authorityLevel: 'municipality',
    municipalityCode: '13113',
    eligibilityRule: {
      all: [
        { field: 'child.ageMonths', operator: 'lte', value: 36 },
        { field: 'user.municipalityCode', operator: 'eq', value: '13113' },
      ],
    },
    officialUrl: officialUrls.shibuyaHouseworkSupport,
    texts: [
      {
        locale: 'ja',
        title: '産前産後家事サポーター派遣事業（渋谷区）',
        contextHint:
          '渋谷区に住民登録があり、3歳未満の乳幼児を養育している家庭などが、掃除・洗濯・食事の支度・買い物などの家事支援を利用できる制度です。利用時間、料金、申請方法は区公式ページで確認してください。',
      },
      {
        locale: 'zh-CN',
        title: '产前产后家事支援（涩谷区）',
        contextHint:
          '在涩谷区有住民登记、正在抚养未满 3 岁婴幼儿等家庭，可确认清扫、洗衣、备餐、购物等家事支援。可用时数、费用和申请方式请以区官网为准。',
      },
      {
        locale: 'zh-TW',
        title: '產前產後家事支援（澀谷區）',
        contextHint:
          '在澀谷區有住民登記、正在照顧未滿 3 歲嬰幼兒等家庭，可確認清掃、洗衣、備餐、購物等家事支援。可用時數、費用和申請方式請以區官方頁面為準。',
      },
    ],
  },
  {
    id: 'p-weaning-class',
    authorityLevel: 'municipality',
    municipalityCode: '13106',
    eligibilityRule: {
      all: [
        { field: 'child.ageMonths', operator: 'gte', value: 6 },
        { field: 'child.ageMonths', operator: 'lte', value: 8 },
        { field: 'user.municipalityCode', operator: 'eq', value: '13106' },
      ],
    },
    officialUrl: officialUrls.taitoWeaningClass,
    texts: [
      {
        locale: 'ja',
        title: '離乳食講習会（台東区）',
        contextHint:
          '台東区在住でおおむね6から8か月の乳児がいる家庭向けの講習会です。対象月齢、予約方法、開催日は区公式ページで確認してください。',
      },
      {
        locale: 'zh-CN',
        title: '辅食讲习会（台东区）',
        contextHint:
          '面向居住在台东区、家中有大约 6 至 8 个月婴儿的家庭。对象月龄、预约方式和举办日期请以区官网为准。',
      },
      {
        locale: 'zh-TW',
        title: '副食品講習會（台東區）',
        contextHint:
          '面向居住在台東區、家中有約 6 至 8 個月嬰兒的家庭。對象月齡、預約方式和舉辦日期請以區官方頁面為準。',
      },
    ],
  },
];

export const seedPolicies: PolicyDTO[] = [
  ...seeds.filter((seed) => !replacedPolicyIds.has(seed.id)),
  ...verifiedReplacementSeeds,
].flatMap(buildPolicy);
