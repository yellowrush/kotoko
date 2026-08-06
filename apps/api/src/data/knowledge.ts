import type { KnowledgeCategory, KnowledgeContent, SourceReference } from '@kodoko/domain';

const reviewedAt = '2026-01-10T00:00:00.000Z';

type ArticleText = {
  locale: 'ja' | 'zh-CN' | 'zh-TW';
  title: string;
  summary: string;
  body: string;
};

type Article = {
  id: string;
  minAgeMonths: number;
  maxAgeMonths: number;
  categories: KnowledgeCategory[];
  sourceReferences: SourceReference[];
  texts: ArticleText[];
};

const MHLW = { title: '厚生労働省', url: 'https://www.mhlw.go.jp' };
const CFA = { title: 'こども家庭庁', url: 'https://www.cfa.go.jp' };
const MEXT = { title: '文部科学省', url: 'https://www.mext.go.jp' };

const articles: Article[] = [
  {
    id: 'k-vaccination',
    minAgeMonths: 0,
    maxAgeMonths: 18,
    categories: ['health', 'policy'],
    sourceReferences: [MHLW, CFA],
    texts: [
      {
        locale: 'ja',
        title: '予防接種のスケジュールと受け方',
        summary: '定期予防接種は国が定めたスケジュールに沿って接種します。基本と忘れ防止のヒントをまとめました。',
        body: '定期予防接種は、国の定める標準的な接種間隔に沿って行われます。接種時期や種類は自治体から届く案内で確認し、かかりつけの医療機関に予約しましょう。\n\n接種前日は体調を整え、接種当日の機嫌・体温をメモしておくと診察がスムーズです。制度は更新されることがあるため、最新情報は自治体や厚生労働省の公式情報を必ず確認してください。',
      },
      {
        locale: 'zh-CN',
        title: '预防接种的日程与接受方式',
        summary: '定期预防接种按国家规定的日程进行。这里整理了基本方法与防止遗忘的提示。',
        body: '定期预防接种按国家规定的接种间隔进行。接种时期与种类请以市区町村发来的通知为准，并提前向常去的医疗机构预约。\n\n接种前一天请注意孩子状态，当天记录体温与情绪能让就诊更顺利。制度可能随时更新，请务必以市区町村及厚生劳动省的官方信息为准。',
      },
      {
        locale: 'zh-TW',
        title: '預防接種的時程與接受方式',
        summary: '定期預防接種依國家規定的時程進行。整理基本方式與避免遺忘的提示。',
        body: '定期預防接種依國家規定的接種間隔進行。接種時期與種類請以市町村寄來的通知為準，並提前向常去的醫療院所預約。\n\n接種前一天請留意孩子狀態，當天記錄體溫與情緒能讓就診更順利。制度可能隨時更新，請務必以市町村及厚生勞動省的官方資訊為準。',
      },
    ],
  },
  {
    id: 'k-development-0-6',
    minAgeMonths: 0,
    maxAgeMonths: 6,
    categories: ['development'],
    sourceReferences: [CFA],
    texts: [
      {
        locale: 'ja',
        title: '生後0〜6か月の成長の目安',
        summary: '首すわりや笑い、寝返りなど、この時期の成長の目安と過ごし方を紹介します。',
        body: '生後数か月のあいだに、視線で追う、笑い声をあげる、首がすわる、寝返りをするなど、子どもは目まぐるしく成長します。発達のペースには個人差が大きく、目安はあくまで参考です。\n\nお世話のポイントは「抱っこで語りかける」「うつぶせ遊びを短時間」など、親子で向き合う時間を無理なく作ることです。気になることがあれば健診で相談しましょう。',
      },
      {
        locale: 'zh-CN',
        title: '出生后0～6个月的成长参考',
        summary: '抬头、笑出声、翻身等这一时期成长的参考与照顾方式。',
        body: '出生后的几个月里，孩子会用视线追物、笑出声、抬头、翻身，成长速度很快。发育速度因人而异，参考标准只是大致目安。\n\n照顾重点是自然地创造亲子相处的时间，例如抱着时轻声说话、短时间趴着玩耍。有疑问请在健诊时咨询。',
      },
      {
        locale: 'zh-TW',
        title: '出生後0～6個月的成長參考',
        summary: '抬頭、笑出聲、翻身等此時期成長的參考與照顧方式。',
        body: '出生後的幾個月裡，孩子會用視線追物、笑出聲、抬頭、翻身，成長非常快速。發展速度因人而異，參考標準只是大致目安。\n\n照顧重點是自然地創造親子相處的時間，例如抱著時輕聲說話、短時間趴臥玩耍。有疑問請在健診時諮詢。',
      },
    ],
  },
  {
    id: 'k-weaning',
    minAgeMonths: 4,
    maxAgeMonths: 12,
    categories: ['nutrition', 'health'],
    sourceReferences: [MHLW],
    texts: [
      {
        locale: 'ja',
        title: '離乳食の始め方と進め方',
        summary: '離乳食の開始時期の目安と、進め方の基本ステップを紹介します。',
        body: '離乳食は生後5〜6か月頃が開始の目安とされています。初めは1日1回、なめらかにすりつぶしたものを小さじ1杯から始め、子どもの様子を見ながら量と回数を増やします。\n\n新しい食材は1種類ずつ、少量から試し、アレルギーが心配な場合はかかりつけ医に相談しましょう。食べる量には個人差があるため、成長曲線と健診で確認しながら進めてください。',
      },
      {
        locale: 'zh-CN',
        title: '辅食的开始方法与进程',
        summary: '辅食开始时期的参考与基本进程步骤。',
        body: '辅食以出生后5～6个月左右为开始参考。最初每天1次，从1小勺顺滑的糊状食物开始，观察孩子的情况逐步增加量与次数。\n\n新食材每次只加一种、从少量开始；担心过敏时请咨询常去的医生。食量因人而异，请结合生长曲线与健诊情况推进。',
      },
      {
        locale: 'zh-TW',
        title: '副食品的開始方式與進程',
        summary: '副食品開始時期的參考與基本進程步驟。',
        body: '副食品以出生後5～6個月左右為開始參考。最初每天1次，從1小匙順滑的糊狀食物開始，觀察孩子狀況逐步增加份量與次數。\n\n新食材每次只加一種、從少量開始；擔心過敏時請諮詢常去的醫生。食量因人而異，請搭配生長曲線與健診逐步進行。',
      },
    ],
  },
  {
    id: 'k-safety-toddler',
    minAgeMonths: 9,
    maxAgeMonths: 24,
    categories: ['safety'],
    sourceReferences: [CFA],
    texts: [
      {
        locale: 'ja',
        title: '歩き始めのころの事故防止',
        summary: '転落・誤飲・やけどなど、動き回るようになる時期の事故対策をまとめました。',
        body: '歩き始めると目線が上がり、手が届く範囲も広がります。転落防止のベビーゲート、誤飲対策の小物・薬・洗剤の手の届かない場所への移動、やけど対策のテーブルクロス固定などを確認しましょう。\n\n事故は「起きてからでは遅い」もの。子どもの行動は想像以上に速いため、家の中を低い目線で見回しておくと安心です。',
      },
      {
        locale: 'zh-CN',
        title: '开始学步时期的事故防范',
        summary: '针对跌落、误吞、烫伤等开始四处活动时期的事故对策。',
        body: '开始学步后，孩子的视线抬高、能摸到的范围也变大。请确认防跌的护栏、把药品和清洁剂移到够不到的地方、固定桌布等防烫伤措施。\n\n事故往往来不及补救。孩子的行动比想象中快得多，蹲下来用低视角检查家中环境会更安心。',
      },
      {
        locale: 'zh-TW',
        title: '開始學步時期的事故防範',
        summary: '針對跌落、誤吞、燙傷等開始四處活動時期的事故對策。',
        body: '開始學步後，孩子的視線抬高、能碰到的範圍也變大。請確認防跌的柵欄、把藥品與清潔劑移到夠不到的地方、固定桌布等防燙傷措施。\n\n事故往往來不及補救。孩子的行動比想像中快得多，蹲下用低視角檢查家中環境會更安心。',
      },
    ],
  },
  {
    id: 'k-tantrum',
    minAgeMonths: 18,
    maxAgeMonths: 48,
    categories: ['development', 'parenting'],
    sourceReferences: [CFA],
    texts: [
      {
        locale: 'ja',
        title: 'イヤイヤ期の子どもとの向き合い方',
        summary: '自己主張が強くなる2歳前後の時期、親ができる関わり方を紹介します。',
        body: '2歳前後は「自分でやりたい」気持ちが強くなる時期です。イヤイヤは成長の証でもあります。まず気持ちを受け止めて短く共感し、選択肢を2つ提示すると動きやすくなることがあります。\n\n親も疲れてしまうことがあります。無理に言い聞かせず、時間に余裕を持つこと、感情が高ぶったときは安全な場所で少し離れることも方法のひとつです。',
      },
      {
        locale: 'zh-CN',
        title: '与执拗期的孩子相处',
        summary: '自我主张变强的2岁前后时期，父母可以采取的相处方式。',
        body: '2岁前后是「想自己做」的心情变强的时期。闹别扭也是成长的证明。先接纳情绪并简短共情，再给出两个选项，孩子往往更容易行动。\n\n父母也会感到疲惫。不必硬讲道理，留出时间余裕；情绪激动时可以退到安全的地方稍作冷静，也是一种方法。',
      },
      {
        locale: 'zh-TW',
        title: '與執拗期的孩子相處',
        summary: '自我主張變強的2歲前後時期，父母可以採取的相處方式。',
        body: '2歲前後是「想自己做」的心情變強的時期。鬧彆扭也是成長的證明。先接納情緒並簡短同理，再給出兩個選項，孩子往往更容易行動。\n\n父母也會感到疲憊。不必硬講道理，保留時間餘裕；情緒激動時可以退到安全處稍作冷靜，也是一種方法。',
      },
    ],
  },
  {
    id: 'k-outing',
    minAgeMonths: 12,
    maxAgeMonths: 72,
    categories: ['travel', 'safety'],
    sourceReferences: [MHLW, CFA, MEXT],
    texts: [
      {
        locale: 'ja',
        title: '子どもとのお出かけ持ち物と事前準備',
        summary: '授乳・おむつ替え・水分補給など、お出かけ前に確認したい持ち物リスト。',
        body: 'お出かけの前に「授乳・食事」「おむつ替え」「着替え」「水分」の4点を軸に持ち物を確認すると忘れにくくなります。行き先に授乳室やおむつ替え設備があるかは、事前に施設情報でチェックしておきましょう。\n\n季節や天気に合わせて日よけ・雨具・防寒具を用意し、行き先と帰宅時間は家族で共有しておくと安心です。',
      },
      {
        locale: 'zh-CN',
        title: '带孩子出门的随身物品与事前准备',
        summary: '哺乳、换尿布、补水等出门前需要确认的物品清单。',
        body: '出门前以「哺乳与用餐」「换尿布」「替换衣物」「补水」四类为主线整理物品，就不容易遗漏。是否有哺乳室、尿布台，可提前查看设施信息。\n\n根据季节天气准备防晒、雨具、保暖用品，并将目的地与回家时间告知家人会更安心。',
      },
      {
        locale: 'zh-TW',
        title: '帶孩子出門的隨身物品與事前準備',
        summary: '哺乳、換尿布、補充水分等出門前需要確認的物品清單。',
        body: '出門前以「哺乳與用餐」「換尿布」「替換衣物」「補充水分」四類為主線整理物品，就不容易遺漏。是否有哺乳室、尿布台，可提前查看設施資訊。\n\n依季節天氣準備防曬、雨具、保暖用品，並將目的地與返家時間告知家人會更安心。',
      },
    ],
  },
];

function buildKnowledge(article: Article): KnowledgeContent[] {
  return article.texts.map((text) => ({
    id: article.id,
    title: text.title,
    summary: text.summary,
    body: text.body,
    minAgeMonths: article.minAgeMonths,
    maxAgeMonths: article.maxAgeMonths,
    categories: article.categories,
    locale: text.locale,
    sourceReferences: article.sourceReferences,
    reviewedAt,
    status: 'published' as const,
  }));
}

export const seedKnowledge: KnowledgeContent[] = articles.flatMap(buildKnowledge);
