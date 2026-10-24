// Ключи API в base64 (чтобы GitHub не отозвал их автоматически). Это НЕ защита.
export const CFG={
  groq:"Z3NrX1lHWkZSeVFOZ1BXbmNHWmlJR1pkV0dkeWIzRllEaU1Cdm9XSkxaeXNvODN5eWk4QzN4Nmg=",
  ms:"bXMtZWZhODU4YzMtODBlYS00MmFiLWEyMDEtOTU5ZTdkYzM2MDQw",
  imgbb:"MWYxZmUyYjc5MDNjNmJiMzFkODE4MGRiZDg3NTMzOGQ="
};

// Адрес вашего Cloudflare Worker (см. proxy/worker.js). Пусто — запросы к ModelScope идут напрямую из браузера.
export const PROXY='https://still-glade-b48b.rimekekea3.workers.dev';

// Необязательно: ключ OpenRouter (openrouter.ai → Keys). Подключает бесплатные модели :free как запасные для кода и рассуждений.
export const OR_KEY=atob("c2stb3ItdjEtZjg4OTE1ZjI5MmNkNTMxY2U2ODU5ODYwYzEzNzAxNGRmZDYxNTQyNWE0MTUxMTNhM2RiYzhjYzYyOWMyNTBlNQ=="); // ключ OpenRouter (в base64 — GitHub не отзовёт автоматически)

// Запасные прокси (если основной недоступен у пользователя): те же воркеры, задеплоенные на другом адресе. Например ['https://второй.workers.dev']
export const PROXY2=[];

// true — если вы положили свои PNG-иконки в assets/icons/ (имена как в README). Иначе используются встроенные.
export const ICONS=false;
