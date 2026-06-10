#!/usr/bin/env node
import {initDialogueDb} from "./dialogue-db.mjs";

await initDialogueDb();
console.log("Миграции dialogues.db выполнены.");
