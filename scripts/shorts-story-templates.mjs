/** Шаблоны сюжетов для Shorts — подставляют промпт и опции генерации. */

export const SHORTS_STORY_TEMPLATES = [
  {
    id: "neighbor",
    label: "Сосед",
    style: "fun",
    messageCount: 10,
    imageCount: 0,
    promptRu:
      "Бытовая комедия: сосед пишет из-за шума/странностей снизу или сбоку. Герой сначала отшучивается, потом признаётся в нелепой причине. Финал — короткий панчлайн в последнем сообщении.",
    promptEn:
      "Everyday comedy: neighbor texts about noise or weird sounds. Hero deflects with jokes, then admits a silly real reason. End on a short punchline in the last message.",
  },
  {
    id: "gadget",
    label: "Гаджет",
    style: "fun",
    messageCount: 10,
    imageCount: 0,
    promptRu:
      "Техно-бытовой абсурд: приложение, браслет или умная техника переоценивает обычное действие героя (спорт, достижение, тренировка). Собеседник подхватывает шутку. Финал — ещё более нелепая «оценка» устройства.",
    promptEn:
      "Tech-life absurdity: an app or gadget mislabels a mundane action as something epic. Friend plays along. End with an even sillier device 'achievement'.",
  },
  {
    id: "delivery",
    label: "Доставка",
    style: "fun",
    messageCount: 10,
    imageCount: 0,
    promptRu:
      "Комедия про доставку, еду или заказ: ожидание vs реальность. Короткие реплики, нарастающий абсурд. Финал — неожиданная бытовая деталь, а не злость.",
    promptEn:
      "Delivery or food order comedy: expectation vs reality. Short lines, rising absurdity. End with a surprising mundane detail, not anger.",
  },
  {
    id: "navigator",
    label: "Навигатор",
    style: "mystic",
    messageCount: 20,
    imageCount: 1,
    promptRu:
      "Мистика: навигатор ведёт по несуществующим улицам с зловещими названиями, голос слишком человеческий. Собеседник сначала шутит, потом паникует. Одно фото — пустой город. Финал в 2 реплики: герой снаружи машины, двойник за рулём. Без хоррора и скримеров.",
    promptEn:
      "Mystery: GPS routes through impossible streets, voice too human. Friend jokes then panics. One photo — empty city. Finale in 2 lines: hero outside the car, double at the wheel. No gore or jump-scares.",
  },
  {
    id: "empty-place",
    label: "Пустое место",
    style: "mystic",
    messageCount: 18,
    imageCount: 1,
    promptRu:
      "Тихая мистика: герой замечает, что обычное место пустое/неправильное (вагон, подъезд, окно). Одно фото как доказательство. Финал — короткий невозможный образ без объяснений.",
    promptEn:
      "Quiet mystery: a familiar place is wrong or empty. One proof photo. End with a short impossible image, no exposition.",
  },
];

export const getStoryTemplate = (id) => SHORTS_STORY_TEMPLATES.find((item) => item.id === id) ?? null;
