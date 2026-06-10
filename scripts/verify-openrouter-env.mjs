import {readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {loadOpenRouterEnv, isOpenRouterConfigured, getOpenRouterTextModel} from "./openrouter-client.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, "docs", ".env");
const TEST_KEY = "sk-or-v1-test-verify-only";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const backup = await readFile(ENV_PATH, "utf8");

const restoreEnv = async () => {
  await writeFile(ENV_PATH, backup, "utf8");
};

const setEnvKey = async (key) => {
  const next = backup.replace(
    /^OPENROUTER_API_KEY=.*$/m,
    `OPENROUTER_API_KEY=${key}`,
  );
  await writeFile(ENV_PATH, next, "utf8");
};

try {
  // 1. Пустой ключ → не настроено
  await setEnvKey("");
  await loadOpenRouterEnv();
  assert(!isOpenRouterConfigured(), "пустой ключ: configured должен быть false");

  // 2. Ключ в файле → настроено
  await setEnvKey(TEST_KEY);
  await loadOpenRouterEnv();
  assert(isOpenRouterConfigured(), "ключ в docs/.env: configured должен быть true");
  assert(
    process.env.OPENROUTER_API_KEY === TEST_KEY,
    "ключ должен подхватиться из docs/.env",
  );

  // 3. Повторная загрузка обновляет значение (reload без рестарта)
  await setEnvKey("");
  await loadOpenRouterEnv();
  assert(!isOpenRouterConfigured(), "после очистки ключа configured должен снова быть false");

  // 4. Модели читаются
  await setEnvKey(TEST_KEY);
  await loadOpenRouterEnv();
  assert(getOpenRouterTextModel() === "openai/gpt-5.5", "text model из .env");

  console.log("verify-openrouter-env: ok");
} finally {
  await restoreEnv();
}
